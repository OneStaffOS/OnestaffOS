import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type InterviewStatus =
  | 'Planned'
  | 'Completed'
  | 'Cancelled'
  | 'NoShow';

@Schema({ _id: false })
class PanelMember {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  employeeId?: Types.ObjectId;

  @Prop()
  name?: string;

  @Prop()
  email?: string;
}

@Schema({ _id: false })
class InterviewFeedbackEntry {
  @Prop()
  criterionKey?: string; // e.g. "TECH_SKILL"

  @Prop()
  criterionLabel?: string;

  @Prop()
  score?: number;        // numeric rating

  @Prop()
  comment?: string;
}

@Schema({ _id: false })
class PanelFeedback {
  @Prop({ type: PanelMember, required: true })
  reviewer!: PanelMember;

  @Prop({ type: [InterviewFeedbackEntry], default: [] })
  entries!: InterviewFeedbackEntry[];

  @Prop()
  overallComment?: string;

  @Prop()
  overallScore?: number;

  @Prop({ default: Date.now })
  submittedAt!: Date;
}

@Schema({ timestamps: true })
export class Interview {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'CandidateApplication', required: true })
  applicationId!: Types.ObjectId;

  @Prop()
  mode?: string; // "Onsite", "Online"

  @Prop()
  location?: string;

  @Prop({ required: true })
  scheduledStart!: Date;

  @Prop()
  scheduledEnd?: Date;

  @Prop({ type: [PanelMember], default: [] })
  panel!: PanelMember[];

  @Prop({ default: 'Planned', enum: ['Planned', 'Completed', 'Cancelled', 'NoShow'] })
  status!: InterviewStatus;

  @Prop()
  calendarEventId?: string; // for integration with external calendars

  @Prop({ type: [PanelFeedback], default: [] })
  feedback!: PanelFeedback[];
}

export type InterviewDocument = HydratedDocument<Interview>;
export const InterviewSchema = SchemaFactory.createForClass(Interview);