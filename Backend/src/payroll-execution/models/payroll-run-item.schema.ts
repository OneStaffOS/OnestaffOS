// src/payroll-execution/models/payroll-run-item.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type HrEventType = 'Normal' | 'NewHire' | 'Resignation' | 'Termination';

@Schema({ _id: false })
class ComponentBreakdown {
  @Prop()
  code?: string; // e.g. "BASE", "TRANS", "TAX_INCOME", "SOCIAL_INS"

  @Prop()
  label?: string;

  @Prop()
  amount?: number;

  // 👇 Explicit type so NestJS/Mongoose stops complaining
  @Prop({ type: MSchema.Types.Mixed })
  meta?: Record<string, any>;
}

@Schema({ timestamps: true })
export class PayrollRunItem {
  @Prop({
    type: MSchema.Types.ObjectId,
    ref: 'PayrollRun',
    required: true,
    index: true,
  })
  payrollRunId!: Types.ObjectId;

  @Prop({
    type: MSchema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
  })
  employeeId!: Types.ObjectId;

  @Prop()
  employeeEmail?: string;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayGrade' })
  payGradeId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department' })
  deptId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position' })
  positionId?: Types.ObjectId;

  @Prop({
    default: 'Normal',
    enum: ['Normal', 'NewHire', 'Resignation', 'Termination'],
  })
  hrEvent!: HrEventType;

  /** Core amounts */
  @Prop({ default: 0 })
  baseSalary!: number;

  @Prop({ default: 0 })
  allowancesTotal!: number;

  @Prop({ default: 0 })
  grossSalary!: number;

  @Prop({ default: 0 })
  taxesTotal!: number;

  @Prop({ default: 0 })
  insuranceTotal!: number;

  @Prop({ default: 0 })
  otherDeductionsTotal!: number;

  @Prop({ default: 0 })
  penaltiesTotal!: number; // misconduct, late, absences, etc.

  @Prop({ default: 0 })
  unpaidLeaveDeductions!: number;

  @Prop({ default: 0 })
  overtimePay!: number;

  @Prop({ default: 0 })
  signingBonusAmount!: number;

  @Prop({ default: 0 })
  resignationBenefitsAmount!: number;

  @Prop({ default: 0 })
  terminationBenefitsAmount!: number;

  @Prop({ default: 0 })
  refundsAmount!: number; // disputes + expense claim refunds

  @Prop({ default: 0 })
  netSalary!: number;

  @Prop({ default: 0 })
  finalPaidSalary!: number;

  /** Detailed breakdown arrays for auditability (BR 36, 59) */
  @Prop({ type: [ComponentBreakdown], default: [] })
  earningsBreakdown!: ComponentBreakdown[];

  @Prop({ type: [ComponentBreakdown], default: [] })
  deductionBreakdown!: ComponentBreakdown[];

  @Prop({ type: [ComponentBreakdown], default: [] })
  employerContributionBreakdown!: ComponentBreakdown[];

  /** Anomaly flags (REQ-PY-5) */
  @Prop({ default: false })
  missingBankAccount!: boolean;

  @Prop({ default: false })
  negativeNetPay!: boolean;

  @Prop({ default: false })
  suddenSalarySpike!: boolean;

  @Prop()
  anomalyNotes?: string;
}

export type PayrollRunItemDocument = HydratedDocument<PayrollRunItem>;
export const PayrollRunItemSchema =
  SchemaFactory.createForClass(PayrollRunItem);