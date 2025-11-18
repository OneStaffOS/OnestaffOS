import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';
import { TimeAudit, TimeAuditSchema } from './time-audit.schema';

export type PunchSource = 'Biometric' | 'Web' | 'Mobile' | 'Manual';
export type PunchDirection = 'In' | 'Out';

@Schema({ _id: false })
class AttendancePunch {
  @Prop({ required: true })
  time!: Date;

  @Prop({ required: true, enum: ['Biometric', 'Web', 'Mobile', 'Manual'] })
  source!: PunchSource;

  @Prop()
  terminalId?: string; // BR-TM-12

  @Prop()
  location?: string; // GPS or location tag

  @Prop({ required: true, enum: ['In', 'Out'] })
  direction!: PunchDirection;
}

export type AttendanceStatus =
  | 'Ok'
  | 'MissingIn'
  | 'MissingOut'
  | 'Absent'
  | 'PendingCorrection';

@Schema({ timestamps: true })
export class AttendanceRecord {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  /** Logical day of attendance (no time component) */
  @Prop({ required: true })
  date!: Date;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'ShiftAssignment' })
  shiftAssignmentId?: Types.ObjectId;

  @Prop({ type: [AttendancePunch], default: [] })
  punches!: AttendancePunch[];

  /** Computed minutes (after rounding rules, BR-TM-07) */
  @Prop({ default: 0 })
  workedMinutes?: number;

  @Prop({ default: 0 })
  overtimeMinutes?: number;

  @Prop({ default: 0 })
  shortMinutes?: number;

  @Prop({ default: 0 })
  latenessMinutes?: number;

  @Prop({ default: false })
  isRestDay?: boolean;

  @Prop({ default: false })
  isHoliday?: boolean;

  @Prop({
    default: 'Ok',
    enum: ['Ok', 'MissingIn', 'MissingOut', 'Absent', 'PendingCorrection'],
  })
  status!: AttendanceStatus;

  @Prop({ default: false })
  hasException?: boolean; // link to TimeExceptionRequest(s)

  @Prop({ type: TimeAuditSchema })
  audit?: TimeAudit;
}

export type AttendanceRecordDocument = HydratedDocument<AttendanceRecord>;
export const AttendanceRecordSchema =
  SchemaFactory.createForClass(AttendanceRecord);