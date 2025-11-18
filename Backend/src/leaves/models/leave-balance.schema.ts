import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

@Schema({ _id: false })
class BalanceValue {
  /** Exact decimal value before rounding */
  @Prop({ default: 0 })
  exact!: number;

  /** Rounded value actually displayed/used (per policy rounding rules) */
  @Prop({ default: 0 })
  rounded!: number;
}

@Schema({ timestamps: true })
export class LeaveBalance {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'LeaveType', required: true, index: true })
  leaveTypeId!: Types.ObjectId;

  /** Optional package reference driving this balance */
  @Prop({ type: MSchema.Types.ObjectId, ref: 'LeavePackage' })
  packageId?: Types.ObjectId;

  /** Period window (e.g. leave year) */
  @Prop({ required: true })
  periodStart!: Date;

  @Prop({ required: true })
  periodEnd!: Date;

  /** Amounts split by semantics */
  @Prop({ type: BalanceValue, default: () => ({}) })
  accrued!: BalanceValue;

  @Prop({ type: BalanceValue, default: () => ({}) })
  taken!: BalanceValue;

  @Prop({ type: BalanceValue, default: () => ({}) })
  pending!: BalanceValue;

  @Prop({ type: BalanceValue, default: () => ({}) })
  carryOver!: BalanceValue;

  @Prop({ type: BalanceValue, default: () => ({}) })
  balance!: BalanceValue; // remaining

  /** Accrual meta */
  @Prop()
  lastAccrualRunAt?: Date;

  @Prop({ default: false })
  accrualSuspended!: boolean; // when on unpaid leave, suspension, etc. (BR 11)

  @Prop()
  accrualSuspendedReason?: string;
}

export type LeaveBalanceDocument = HydratedDocument<LeaveBalance>;
export const LeaveBalanceSchema = SchemaFactory.createForClass(LeaveBalance);