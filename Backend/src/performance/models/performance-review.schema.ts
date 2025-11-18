import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type ReviewStatus = 'Draft' | 'Submitted' | 'Published' | 'Final';

@Schema({ _id: false })
class ScoreEntry {
  @Prop({ required: true }) criterionKey!: string;   // matches Template.criteria.key
  @Prop({ required: true, min: 0 }) score!: number;  // number within scale
  @Prop() comment?: string;
}

@Schema({ timestamps: true })
export class PerformanceReview {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'AppraisalCycle', required: true })
  cycleId!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, index: true })
  employeeEmail!: string; // link to Employee

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  managerId?: Types.ObjectId;

  @Prop({ type: [ScoreEntry], default: [] }) scores!: ScoreEntry[];
  @Prop() overallComment?: string;
  @Prop() overallScore?: number; // computed (weighted)

  @Prop({ default: 'Draft', enum: ['Draft','Submitted','Published','Final'] })
  status!: ReviewStatus;

  // audit
  @Prop() submittedAt?: Date;
  @Prop() publishedAt?: Date;
  @Prop() finalizedAt?: Date;
}

export type PerformanceReviewDocument = HydratedDocument<PerformanceReview>;
export const PerformanceReviewSchema = SchemaFactory.createForClass(PerformanceReview);