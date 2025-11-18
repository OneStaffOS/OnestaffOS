import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type DisputeStatus =
  | 'Open'
  | 'InReview'
  | 'ResolvedUpheld'
  | 'ResolvedAdjusted'
  | 'Rejected';

@Schema({ timestamps: true })
export class ReviewDispute {
  @Prop({
    type: MSchema.Types.ObjectId,
    ref: 'PerformanceReview',
    required: true,
  })
  reviewId!: Types.ObjectId;

  @Prop({ required: true, lowercase: true })
  employeeEmail!: string;

  @Prop({ required: true })
  reason!: string;

  @Prop()
  evidenceKey?: string;

  @Prop({
    default: 'Open',
    enum: ['Open', 'InReview', 'ResolvedUpheld', 'ResolvedAdjusted', 'Rejected'],
  })
  status!: DisputeStatus;

  @Prop()
  resolutionNote?: string;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  resolvedBy?: Types.ObjectId;

  @Prop()
  resolvedAt?: Date;
}

export type ReviewDisputeDocument = HydratedDocument<ReviewDispute>;
export const ReviewDisputeSchema =
  SchemaFactory.createForClass(ReviewDispute);