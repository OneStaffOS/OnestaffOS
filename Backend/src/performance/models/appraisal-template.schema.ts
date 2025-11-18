import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScaleType = 'FivePoint' | 'TenPoint' | 'Custom';
export type AppraisalType = 'Annual' | 'Probation' | 'Quarterly';

@Schema({ _id: false })
class Criterion {
  @Prop({ required: true }) key!: string;        // e.g., "quality"
  @Prop({ required: true }) label!: string;      // "Quality of Work"
  @Prop() weight?: number;                       // 0..1 (sum to 1 across criteria)
  @Prop({ default: true }) isActive!: boolean;
}

@Schema({ timestamps: true })
export class AppraisalTemplate {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ default: 'Annual', enum: ['Annual', 'Probation', 'Quarterly'] })
  type!: AppraisalType;

  @Prop({ default: 'FivePoint', enum: ['FivePoint', 'TenPoint', 'Custom'] })
  scaleType!: ScaleType;

  @Prop({ type: [Criterion], default: [] })
  criteria!: Criterion[];

  @Prop({ type: [String], default: [] })
  allowedDeptCodes!: string[];

  @Prop({ default: true })
  isActive!: boolean;
}

export type AppraisalTemplateDocument = HydratedDocument<AppraisalTemplate>;
export const AppraisalTemplateSchema = SchemaFactory.createForClass(AppraisalTemplate);