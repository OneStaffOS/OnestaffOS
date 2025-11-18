import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type SeparationType = 'Resignation' | 'Termination';

export type SeparationRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'InReview'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled';

@Schema({ timestamps: true })
export class SeparationRequest {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop({ default: 'Resignation', enum: ['Resignation', 'Termination'] })
  type!: SeparationType;

  @Prop()
  reason?: string;

  @Prop()
  details?: string;

  @Prop()
  requestedEffectiveDate?: Date;

  @Prop({
    default: 'Draft',
    enum: ['Draft', 'Submitted', 'InReview', 'Approved', 'Rejected', 'Cancelled'],
  })
  status!: SeparationRequestStatus;

  @Prop()
  submittedAt?: Date;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  initiatedByEmployeeId?: Types.ObjectId; // e.g. manager for termination

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  decidedByEmployeeId?: Types.ObjectId;

  @Prop()
  decidedAt?: Date;

  @Prop()
  finalEffectiveDate?: Date;
}

export type SeparationRequestDocument =
  HydratedDocument<SeparationRequest>;
export const SeparationRequestSchema =
  SchemaFactory.createForClass(SeparationRequest);