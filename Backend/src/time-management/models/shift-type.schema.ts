import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TimeAudit, TimeAuditSchema } from './time-audit.schema';

export type ShiftKind = 'Normal' | 'Split' | 'Overnight' | 'Rotational' | 'Mission';

@Schema({ timestamps: true })
export class ShiftType {
  @Prop({ required: true, unique: true })
  code!: string; // e.g. "DAY-0900-1800"

  @Prop({ required: true })
  name!: string; // e.g. "Fixed Core Hours"

  @Prop({ required: true, enum: ['Normal', 'Split', 'Overnight', 'Rotational', 'Mission'] })
  kind!: ShiftKind;

  // Stored as "HH:mm" to keep it simple and front-end friendly
  @Prop({ required: true })
  startTime!: string; // "09:00"

  @Prop({ required: true })
  endTime!: string;   // "18:00"

  @Prop({ default: 0 })
  breakMinutes?: number;

  /** 0=Sunday .. 6=Saturday */
  @Prop({ type: [Number], default: [0, 1, 2, 3, 4] })
  workingDays?: number[];

  /** Flexible / custom rules support (US 3 + BR-TM-04, BR-TM-10) */
  @Prop({ default: false })
  isFlexible?: boolean;

  @Prop()
  flexWindowMinutes?: number; // e.g. +/- 60 mins

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: TimeAuditSchema })
  audit?: TimeAudit;
}

export type ShiftTypeDocument = HydratedDocument<ShiftType>;
export const ShiftTypeSchema = SchemaFactory.createForClass(ShiftType);