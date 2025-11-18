// src/payroll-execution/models/payroll-run.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type PayrollRunStatus =
  | 'DraftGenerated'
  | 'UnderReview'
  | 'WaitingManagerApproval'
  | 'WaitingFinanceApproval'
  | 'Approved'
  | 'Paid'
  | 'Frozen'
  | 'Cancelled';

@Schema({ timestamps: true })
export class PayrollRun {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollArea', required: true })
  payrollAreaId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollSchemaConfig' })
  schemaConfigId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollInitiation' })
  initiationId?: Types.ObjectId;

  @Prop({ required: true })
  periodStart!: Date;

  @Prop({ required: true })
  periodEnd!: Date;

  @Prop({
    default: 'DraftGenerated',
    enum: [
      'DraftGenerated',
      'UnderReview',
      'WaitingManagerApproval',
      'WaitingFinanceApproval',
      'Approved',
      'Paid',
      'Frozen',
      'Cancelled',
    ],
    index: true,
  })
  status!: PayrollRunStatus;

  /** Multi-step approval metadata */
  @Prop()
  createdByUserId?: string; // Payroll Specialist

  @Prop()
  managerApprovedByUserId?: string;

  @Prop()
  managerApprovedAt?: Date;

  @Prop()
  financeApprovedByUserId?: string;

  @Prop()
  financeApprovedAt?: Date;

  /** Freeze / unfreeze (REQ-PY-7, REQ-PY-19) */
  @Prop({ default: false })
  isFrozen!: boolean;

  @Prop()
  frozenAt?: Date;

  @Prop()
  frozenByUserId?: string;

  @Prop()
  unfreezeReason?: string;

  @Prop()
  unfrozenAt?: Date;

  /** Aggregated totals for dashboards & reports */
  @Prop({ default: 0 })
  employeesCount!: number;

  @Prop({ default: 0 })
  totalGrossAmount!: number;

  @Prop({ default: 0 })
  totalNetAmount!: number;

  @Prop({ default: 0 })
  totalTaxes!: number;

  @Prop({ default: 0 })
  totalInsurance!: number;
}

export type PayrollRunDocument = HydratedDocument<PayrollRun>;
export const PayrollRunSchema = SchemaFactory.createForClass(PayrollRun);