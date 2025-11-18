import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type AdjustmentType =
  | 'Grant'
  | 'Correction'
  | 'CarryOver'
  | 'Encashment'
  | 'Penalty';

@Schema({ timestamps: true })
export class LeaveAdjustment {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'LeaveType', required: true })
  leaveTypeId!: Types.ObjectId;

  /** Signed amount (+ credit, - debit) – exact and rounded */
  @Prop({ required: true })
  amountExact!: number;

  @Prop({ required: true })
  amountRounded!: number;

  @Prop({
    default: 'Correction',
    enum: ['Grant', 'Correction', 'CarryOver', 'Encashment', 'Penalty'],
  })
  type!: AdjustmentType;

  /** Optional link back to a leave request or offboarding settlement */
  @Prop({ type: MSchema.Types.ObjectId, ref: 'LeaveRequest' })
  relatedRequestId?: Types.ObjectId;

  /** Who did this adjustment (HR Admin) */
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  adjustedByEmployeeId?: Types.ObjectId;

  @Prop()
  reason?: string;
}

export type LeaveAdjustmentDocument = HydratedDocument<LeaveAdjustment>;
export const LeaveAdjustmentSchema =
  SchemaFactory.createForClass(LeaveAdjustment);