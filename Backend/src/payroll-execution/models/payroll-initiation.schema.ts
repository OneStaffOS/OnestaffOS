// src/payroll-execution/models/payroll-initiation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type PayrollInitiationStatus =
  | 'PendingReview'
  | 'Approved'
  | 'Rejected';

@Schema({ timestamps: true })
export class PayrollInitiation {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'PayrollArea', required: true })
  payrollAreaId!: Types.ObjectId;

  @Prop({ required: true })
  periodStart!: Date;

  @Prop({ required: true })
  periodEnd!: Date;

  @Prop({
    default: 'PendingReview',
    enum: ['PendingReview', 'Approved', 'Rejected'],
    index: true,
  })
  status!: PayrollInitiationStatus;

  @Prop()
  rejectionReason?: string;

  @Prop()
  createdByUserId?: string;

  @Prop()
  decidedByUserId?: string;

  @Prop()
  decidedAt?: Date;
}

export type PayrollInitiationDocument = HydratedDocument<PayrollInitiation>;
export const PayrollInitiationSchema =
  SchemaFactory.createForClass(PayrollInitiation);