// src/payroll-tracking/models/payroll-dispute.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type PayrollDisputeStatus =
  | 'Submitted'
  | 'Rejected'
  | 'ApprovedBySpecialist'
  | 'ApprovedByManager'
  | 'Closed';

@Schema({ timestamps: true })
export class PayrollDispute {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Payslip', required: true })
  payslipId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollRun', required: true })
  payrollRunId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop()
  employeeEmail?: string;

  @Prop({ required: true })
  reason!: string; // short reason

  @Prop()
  details?: string; // longer explanation

  @Prop({
    default: 'Submitted',
    enum: [
      'Submitted',
      'Rejected',
      'ApprovedBySpecialist',
      'ApprovedByManager',
      'Closed',
    ],
    index: true,
  })
  status!: PayrollDisputeStatus;

  @Prop()
  resolutionNote?: string;

  @Prop({ default: 0 })
  refundAmount!: number;

  @Prop()
  specialistUserId?: string;

  @Prop()
  managerUserId?: string;

  @Prop()
  financeUserId?: string;

  /** Payroll run where refund actually applied (for tracking) */
  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollRun' })
  refundProcessedInRunId?: Types.ObjectId;
}

export type PayrollDisputeDocument = HydratedDocument<PayrollDispute>;
export const PayrollDisputeSchema =
  SchemaFactory.createForClass(PayrollDispute);