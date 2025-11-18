import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TimeAudit, TimeAuditSchema } from './time-audit.schema';

export type LatenessPenaltyType =
  | 'None'
  | 'Warning'
  | 'DeductPay'
  | 'Escalate';

@Schema({ timestamps: true })
export class LatenessRule {
  @Prop({ required: true, unique: true })
  code!: string; // "LAT-STD"

  @Prop({ required: true })
  name!: string; // "Standard Lateness Rule"

  @Prop({ default: 0 })
  graceMinutes!: number;

  @Prop({ required: true })
  thresholdMinutes!: number; // after grace

  @Prop({
    required: true,
    enum: ['None', 'Warning', 'DeductPay', 'Escalate'],
  })
  penaltyType!: LatenessPenaltyType;

  /** How many lateness incidents before escalation/discipline (US 12) */
  @Prop({ default: 3 })
  repeatCountForEscalation!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: TimeAuditSchema })
  audit?: TimeAudit;
}

export type LatenessRuleDocument = HydratedDocument<LatenessRule>;
export const LatenessRuleSchema =
  SchemaFactory.createForClass(LatenessRule);