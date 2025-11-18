import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';
import { TimeAudit, TimeAuditSchema } from './time-audit.schema';

export type SchedulingRuleType =
  | 'StandardWeek'
  | 'CompressedWeek'
  | 'RotationalPattern'
  | 'Custom';

@Schema({ timestamps: true })
export class SchedulingRule {
  @Prop({ required: true, unique: true })
  code!: string; // e.g. "4ON-3OFF"

  @Prop({ required: true })
  name!: string; // "4 days on / 3 days off"

  @Prop({
    required: true,
    enum: ['StandardWeek', 'CompressedWeek', 'RotationalPattern', 'Custom'],
  })
  type!: SchedulingRuleType;

  /** Optional link to shift type(s) this rule applies to */
  @Prop({ type: [MSchema.Types.ObjectId], ref: 'ShiftType', default: [] })
  shiftTypeIds?: Types.ObjectId[];

  /** Days pattern, e.g. [1,1,1,1,0,0,0] for 4-on/3-off */
  @Prop({ type: [Number], default: [] })
  weeklyPattern?: number[];

  @Prop()
  flexInMinutes?: number;

  @Prop()
  flexOutMinutes?: number;

  @Prop()
  maxHoursPerDay?: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: TimeAuditSchema })
  audit?: TimeAudit;
}

export type SchedulingRuleDocument = HydratedDocument<SchedulingRule>;
export const SchedulingRuleSchema = SchemaFactory.createForClass(SchedulingRule);