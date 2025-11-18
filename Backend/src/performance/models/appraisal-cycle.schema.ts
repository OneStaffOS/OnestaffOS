import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type CycleStatus = 'Draft' | 'Active' | 'Closed' | 'Archived';

@Schema({ timestamps: true })
export class AppraisalCycle {
  @Prop({ required: true, unique: true })
  code!: string; // e.g., "FY2025-H1"

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({
    type: MSchema.Types.ObjectId,
    ref: 'AppraisalTemplate',
    required: true,
  })
  templateId!: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  deptCodes!: string[];

  @Prop({
    default: 'Draft',
    enum: ['Draft', 'Active', 'Closed', 'Archived'],
  })
  status!: CycleStatus;

  @Prop()
  notes?: string;
}

export type AppraisalCycleDocument = HydratedDocument<AppraisalCycle>;
export const AppraisalCycleSchema =
  SchemaFactory.createForClass(AppraisalCycle);