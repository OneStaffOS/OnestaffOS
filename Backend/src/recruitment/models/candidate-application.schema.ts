import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type ApplicationStatus =
  | 'Active'
  | 'Withdrawn'
  | 'Rejected'
  | 'Hired';

@Schema({ _id: false })
class ApplicationStageHistory {
  @Prop({ required: true }) stageKey!: string;   // e.g. "SCREENING"
  @Prop({ required: true }) stageLabel!: string; // "Screening"
  @Prop({ required: true }) status!: string;     // "Entered", "Completed"
  @Prop() score?: number;
  @Prop() comment?: string;
  @Prop() updatedBy?: string;                    // user id/email
  @Prop({ default: Date.now }) updatedAt!: Date;
}

@Schema({ _id: false })
class ApplicationCommunication {
  @Prop({ required: true }) type!: string;       // "StatusUpdate", "Rejection", "Offer"
  @Prop() templateKey?: string;                  // for email template
  @Prop() channel?: string;                      // "Email"
  @Prop() subject?: string;
  @Prop() toEmail?: string;
  @Prop({ default: Date.now }) sentAt!: Date;
}

@Schema({ timestamps: true })
export class CandidateApplication {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Candidate', required: true })
  candidateId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'JobRequisition', required: true })
  requisitionId!: Types.ObjectId;

  @Prop()
  cvKey?: string; // convenience pointer to main CV

  @Prop({ default: 'SCREENING' })
  currentStageKey!: string;

  @Prop({ default: 0 })
  progressPercent!: number; // updated using process template (REC-004)

  @Prop({ default: 'Active', enum: ['Active', 'Withdrawn', 'Rejected', 'Hired'] })
  status!: ApplicationStatus;

  @Prop({ default: false })
  isReferral!: boolean; // REC-030

  @Prop({ type: [ApplicationStageHistory], default: [] })
  stageHistory!: ApplicationStageHistory[];

  @Prop({ type: [ApplicationCommunication], default: [] })
  communicationLog!: ApplicationCommunication[];

  @Prop()
  appliedAt?: Date;

  @Prop()
  hiredEmployeeId?: Types.ObjectId; // link to Employee when hired
}

export type CandidateApplicationDocument =
  HydratedDocument<CandidateApplication>;
export const CandidateApplicationSchema =
  SchemaFactory.createForClass(CandidateApplication);