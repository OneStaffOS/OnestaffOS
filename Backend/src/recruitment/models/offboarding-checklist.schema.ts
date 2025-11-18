import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type OffboardingStatus =
  | 'NotStarted'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled';

export type OffboardingTaskStatus =
  | 'Pending'
  | 'InProgress'
  | 'Completed'
  | 'Skipped';

@Schema({ _id: false })
class OffboardingTask {
  @Prop({ required: true })
  key!: string; // "RETURN_LAPTOP", "DISABLE_ACCOUNTS"

  @Prop({ required: true })
  label!: string;

  @Prop()
  department?: string; // "IT", "HR", "Finance", "Admin"

  @Prop()
  description?: string;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  responsibleEmployeeId?: Types.ObjectId;

  @Prop({
    default: 'Pending',
    enum: ['Pending', 'InProgress', 'Completed', 'Skipped'],
  })
  status!: OffboardingTaskStatus;

  @Prop()
  completedAt?: Date;

  @Prop()
  notes?: string;
}

@Schema({ timestamps: true })
export class OffboardingChecklist {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'SeparationRequest', required: true })
  separationRequestId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop({
    default: 'NotStarted',
    enum: ['NotStarted', 'InProgress', 'Completed', 'Cancelled'],
  })
  status!: OffboardingStatus;

  @Prop({ type: [OffboardingTask], default: [] })
  tasks!: OffboardingTask[];

  @Prop()
  accessRevokedAt?: Date; // OFF-007

  @Prop()
  finalSettlementTriggeredAt?: Date; // OFF-013
}

export type OffboardingChecklistDocument =
  HydratedDocument<OffboardingChecklist>;
export const OffboardingChecklistSchema =
  SchemaFactory.createForClass(OffboardingChecklist);