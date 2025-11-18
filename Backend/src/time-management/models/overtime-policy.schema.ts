import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TimeAudit, TimeAuditSchema } from './time-audit.schema';

export type OvertimeType =
  | 'EarlyIn'
  | 'LateOut'
  | 'OutOfHours'
  | 'Total';

@Schema({ timestamps: true })
export class OvertimePolicy {
  @Prop({ required: true, unique: true })
  code!: string; // e.g. "OT-STD"

  @Prop({ required: true })
  name!: string; // "Standard Overtime Rules"

  @Prop({ type: [String], default: [] })
  overtimeTypes!: OvertimeType[];

  @Prop({ default: false })
  requiresPreApproval?: boolean;

  /** Multipliers for payroll integration (e.g. 1.5x, 2x) */
  @Prop({ default: 1 })
  normalMultiplier?: number;

  @Prop({ default: 1.5 })
  weekendMultiplier?: number;

  @Prop({ default: 2 })
  holidayMultiplier?: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: TimeAuditSchema })
  audit?: TimeAudit;
}

export type OvertimePolicyDocument = HydratedDocument<OvertimePolicy>;
export const OvertimePolicySchema =
  SchemaFactory.createForClass(OvertimePolicy);