// src/payroll-tracking/models/refund-record.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type RefundSourceType = 'Dispute' | 'ExpenseClaim';
export type RefundStatus =
  | 'PendingInclusion'
  | 'IncludedInPayroll'
  | 'Cancelled';

@Schema({ timestamps: true })
export class RefundRecord {
  @Prop({
    required: true,
    enum: ['Dispute', 'ExpenseClaim'],
  })
  sourceType!: RefundSourceType;

  @Prop({ required: true })
  sourceId!: string; // ObjectId string of dispute or expense claim

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop()
  employeeEmail?: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'EGP' })
  currency!: string;

  @Prop({
    default: 'PendingInclusion',
    enum: ['PendingInclusion', 'IncludedInPayroll', 'Cancelled'],
    index: true,
  })
  status!: RefundStatus;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollRun' })
  payrollRunId?: Types.ObjectId;

  @Prop()
  comment?: string;
}

export type RefundRecordDocument = HydratedDocument<RefundRecord>;
export const RefundRecordSchema = SchemaFactory.createForClass(RefundRecord);