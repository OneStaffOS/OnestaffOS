import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StageType =
  | 'Screening'
  | 'Shortlist'
  | 'Interview'
  | 'Assessment'
  | 'Offer'
  | 'Hired'
  | 'Rejected';

@Schema({ _id: false })
class ProcessStage {
  @Prop({ required: true })
  key!: string; // e.g. "SCREENING"

  @Prop({ required: true })
  label!: string; // "Initial Screening"

  @Prop({ required: true })
  order!: number; // 1,2,3...

  @Prop({ default: 0 })
  progressPercent!: number; // used for pipeline progress bar

  @Prop({ default: false })
  isTerminal!: boolean; // e.g. Hired / Rejected
}

@Schema({ timestamps: true })
export class HiringProcessTemplate {
  @Prop({ required: true, unique: true })
  name!: string; // "Standard Hiring Pipeline"

  @Prop()
  description?: string;

  @Prop({ type: [ProcessStage], default: [] })
  stages!: ProcessStage[]; // BR 9 – defined stages

  @Prop({ default: true })
  isActive!: boolean;
}

export type HiringProcessTemplateDocument =
  HydratedDocument<HiringProcessTemplate>;
export const HiringProcessTemplateSchema =
  SchemaFactory.createForClass(HiringProcessTemplate);