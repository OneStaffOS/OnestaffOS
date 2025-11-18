import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type OnboardingStatus =
  | 'NotStarted'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled';

export type OnboardingTaskStatus =
  | 'Pending'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled';

@Schema({ _id: false })
class OnboardingTask {
  @Prop({ required: true })
  key!: string; // e.g. "UPLOAD_ID", "SIGN_CONTRACT"

  @Prop({ required: true })
  label!: string;

  @Prop()
  description?: string;

  @Prop()
  category?: string; // "HR", "IT", "Admin", "NewHire"

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  assignedToEmployeeId?: Types.ObjectId;

  @Prop()
  dueDate?: Date;

  @Prop({
    default: 'Pending',
    enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'],
  })
  status!: OnboardingTaskStatus;

  @Prop()
  completedAt?: Date;

  @Prop()
  notes?: string;
}

@Schema({ timestamps: true })
export class OnboardingChecklist {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Offer', required: true })
  offerId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  employeeId?: Types.ObjectId; // once profile created

  @Prop()
  newHireEmail?: string; // used before Employee profile exists

  @Prop({ required: true })
  templateName!: string; // e.g. "Standard Onboarding"

  @Prop({
    default: 'NotStarted',
    enum: ['NotStarted', 'InProgress', 'Completed', 'Cancelled'],
  })
  status!: OnboardingStatus;

  @Prop({ type: [OnboardingTask], default: [] })
  tasks!: OnboardingTask[];

  @Prop()
  startDate?: Date;

  @Prop()
  completedAt?: Date;
}

export type OnboardingChecklistDocument =
  HydratedDocument<OnboardingChecklist>;
export const OnboardingChecklistSchema =
  SchemaFactory.createForClass(OnboardingChecklist);