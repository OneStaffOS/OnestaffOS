import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';
import { TimeAudit, TimeAuditSchema } from './time-audit.schema';

export type TimeExceptionType = 'Correction' | 'Overtime' | 'Permission';
export type TimeExceptionStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Escalated'
  | 'Cancelled';

@Schema({ timestamps: true })
export class TimeExceptionRequest {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['Correction', 'Overtime', 'Permission'],
  })
  type!: TimeExceptionType;

  /** Target date of the exception (correction/overtime/permission) */
  @Prop({ required: true })
  date!: Date;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'AttendanceRecord' })
  attendanceId?: Types.ObjectId;

  /** For corrections/permissions/overtime windows */
  @Prop()
  fromTime?: Date;

  @Prop()
  toTime?: Date;

  @Prop({ required: true })
  reason!: string;

  @Prop({
    default: 'Pending',
    enum: ['Pending', 'Approved', 'Rejected', 'Escalated', 'Cancelled'],
  })
  status!: TimeExceptionStatus;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  approverId?: Types.ObjectId;

  @Prop()
  decidedAt?: Date;

  /** Escalation metadata (US 14, 18) */
  @Prop({ default: 0 })
  escalationLevel?: number;

  @Prop()
  escalatedAt?: Date;

  @Prop({ type: TimeAuditSchema })
  audit?: TimeAudit;
}

export type TimeExceptionRequestDocument = HydratedDocument<TimeExceptionRequest>;
export const TimeExceptionRequestSchema =
  SchemaFactory.createForClass(TimeExceptionRequest);