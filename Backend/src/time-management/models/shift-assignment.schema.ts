import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';
import { TimeAudit, TimeAuditSchema } from './time-audit.schema';

export type ShiftAssignmentStatus =
  | 'Entered'
  | 'Submitted'
  | 'Approved'
  | 'Cancelled'
  | 'Expired'
  | 'Postponed'
  | 'Rejected';

@Schema({ timestamps: true })
export class ShiftAssignment {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  // Optional assignment by org criteria
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department' })
  deptId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position' })
  positionId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'ShiftType', required: true })
  shiftTypeId!: Types.ObjectId;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({
    default: 'Entered',
    enum: ['Entered', 'Submitted', 'Approved', 'Cancelled', 'Expired', 'Postponed', 'Rejected'],
  })
  status!: ShiftAssignmentStatus;

  /** For “why changed” / cancellation note */
  @Prop()
  comment?: string;

  /** For US 4: when expiry notification was last sent */
  @Prop()
  lastExpiryNotificationAt?: Date;

  @Prop({ type: TimeAuditSchema })
  audit?: TimeAudit;
}

export type ShiftAssignmentDocument = HydratedDocument<ShiftAssignment>;
export const ShiftAssignmentSchema = SchemaFactory.createForClass(ShiftAssignment);