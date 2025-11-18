// src/payroll-tracking/models/payslip.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type PayslipStatus =
  | 'Draft'
  | 'Available'
  | 'Paid'
  | 'Disputed'
  | 'RefundScheduled';

@Schema({ _id: false })
class PayslipComponent {
  @Prop()
  code?: string;

  @Prop()
  label?: string;

  @Prop()
  amount?: number;

  @Prop()
  category?: 'Base' | 'Allowance' | 'Tax' | 'Insurance' | 'Penalty' | 'Other';
}

@Schema({ timestamps: true })
export class Payslip {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollRun', required: true })
  payrollRunId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollRunItem', required: true })
  payrollRunItemId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop()
  employeeEmail?: string;

  @Prop({ required: true })
  periodStart!: Date;

  @Prop({ required: true })
  periodEnd!: Date;

  @Prop({
    default: 'Available',
    enum: ['Draft', 'Available', 'Paid', 'Disputed', 'RefundScheduled'],
    index: true,
  })
  status!: PayslipStatus;

  /** Key to PDF/object storage */
  @Prop()
  documentKey?: string;

  /** Main salary figures (for fast display) */
  @Prop({ default: 0 })
  baseSalary!: number;

  @Prop({ default: 0 })
  grossSalary!: number;

  @Prop({ default: 0 })
  totalDeductions!: number;

  @Prop({ default: 0 })
  netSalary!: number;

  /** Encashed leave amount etc. */
  @Prop({ default: 0 })
  leaveEncashmentAmount!: number;

  @Prop({ default: 0 })
  transportationAllowanceAmount!: number;

  /** Detailed breakdown */
  @Prop({ type: [PayslipComponent], default: [] })
  earnings!: PayslipComponent[];

  @Prop({ type: [PayslipComponent], default: [] })
  deductions!: PayslipComponent[];

  @Prop({ type: [PayslipComponent], default: [] })
  employerContributions!: PayslipComponent[];
}

export type PayslipDocument = HydratedDocument<Payslip>;
export const PayslipSchema = SchemaFactory.createForClass(Payslip);