import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type AccrualFrequency = 'None' | 'Monthly' | 'Quarterly' | 'Yearly';
export type RoundingMethod =
  | 'None'
  | 'Arithmetic'
  | 'AlwaysUp'
  | 'AlwaysDown';

export type ResetCriterion =
  | 'HireDate'
  | 'FirstVacationDate'
  | 'RevisedHireDate'
  | 'WorkReceivingDate'
  | 'CalendarYear';

@Schema({ _id: false })
class EligibilityRule {
  @Prop()
  minTenureMonths?: number; // BR 7 / 8

  @Prop()
  maxTenureMonths?: number;

  @Prop()
  minGrade?: string;

  @Prop()
  maxGrade?: string;

  @Prop()
  employmentType?: string; // FullTime / PartTime / Intern / Contract

  @Prop()
  locationCode?: string; // country / site code
}

@Schema({ timestamps: true })
export class LeavePolicy {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'LeaveType', required: true })
  leaveTypeId!: Types.ObjectId;

  /** Standard entitlement per year (base, before overrides & packages) */
  @Prop({ required: true })
  baseDaysPerYear!: number;

  /** Maximum duration per *single* request (if any) */
  @Prop()
  maxDaysPerRequest?: number;

  /** Minimum notice in days before start (for pre-leave requests) */
  @Prop()
  minNoticeDays?: number;

  /** Allow post-leave requests within this many days (REQ-031) */
  @Prop()
  postLeaveMaxDays?: number;

  /** Accrual configuration (REQ-003, REQ-040) */
  @Prop({ default: 'Yearly', enum: ['None', 'Monthly', 'Quarterly', 'Yearly'] })
  accrualFrequency!: AccrualFrequency;

  /** Accrual rate per period (e.g. 1.75 days / month) */
  @Prop()
  accrualRatePerPeriod?: number;

  /** Pause accrual during unpaid leave/suspension (BR 11) */
  @Prop({ default: true })
  pauseAccrualOnUnpaid!: boolean;

  /** Carry-over cap in days (REQ-041) */
  @Prop()
  carryOverCapDays?: number;

  /** Max days that can be encashed in final settlement (BR 53 cap 30) */
  @Prop()
  encashmentCapDays?: number;

  /** Leave year reset criterion (REQ-012, BR 5) */
  @Prop({
    default: 'CalendarYear',
    enum: [
      'HireDate',
      'FirstVacationDate',
      'RevisedHireDate',
      'WorkReceivingDate',
      'CalendarYear',
    ],
  })
  resetCriterion!: ResetCriterion;

  /** Rounding method (BR: store exact & rounded) */
  @Prop({
    default: 'None',
    enum: ['None', 'Arithmetic', 'AlwaysUp', 'AlwaysDown'],
  })
  roundingMethod!: RoundingMethod;

  /** Eligibility filter for this policy (tenure, grade, etc.) */
  @Prop({ type: EligibilityRule })
  eligibility?: EligibilityRule;

  /** Multi-level approval chain key or name (REQ-009) */
  @Prop()
  approvalWorkflowKey?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export type LeavePolicyDocument = HydratedDocument<LeavePolicy>;
export const LeavePolicySchema = SchemaFactory.createForClass(LeavePolicy);