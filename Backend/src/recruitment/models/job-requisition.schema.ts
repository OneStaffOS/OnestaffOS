import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type RequisitionStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Open'
  | 'OnHold'
  | 'Closed'
  | 'Cancelled';

@Schema({ timestamps: true })
export class JobRequisition {
  @Prop({ required: true, unique: true })
  code!: string; // e.g. "REQ-2025-001"

  @Prop({ required: true })
  title!: string;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'JobTemplate' })
  jobTemplateId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'HiringProcessTemplate' })
  processTemplateId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department' })
  deptId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position' })
  positionId?: Types.ObjectId;

  @Prop()
  location?: string;

  @Prop({ default: 1 })
  openings!: number;

  @Prop()
  employmentType?: string; // e.g. "FullTime", "Intern"

  @Prop()
  description?: string;

  @Prop({ default: 'Draft', enum: ['Draft', 'PendingApproval', 'Open', 'OnHold', 'Closed', 'Cancelled'] })
  status!: RequisitionStatus;

  @Prop()
  publishedAt?: Date;

  @Prop()
  externalUrl?: string; // careers page link

  @Prop()
  employerBrandContent?: string; // used for REC-023

  @Prop()
  createdBy?: string; // HR user id/email

  @Prop()
  approvedBy?: string;
}

export type JobRequisitionDocument = HydratedDocument<JobRequisition>;
export const JobRequisitionSchema =
  SchemaFactory.createForClass(JobRequisition);