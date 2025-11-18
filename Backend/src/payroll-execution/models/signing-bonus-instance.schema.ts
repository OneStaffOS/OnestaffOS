// src/payroll-execution/models/signing-bonus-instance.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type SigningBonusInstanceStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Processed';

@Schema({ timestamps: true })
export class SigningBonusInstance {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'SigningBonusPolicy', required: true })
  policyId!: Types.ObjectId;

  @Prop()
  contractId?: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'EGP' })
  currency!: string;

  @Prop({
    default: 'Pending',
    enum: ['Pending', 'Approved', 'Rejected', 'Processed'],
    index: true,
  })
  status!: SigningBonusInstanceStatus;

  @Prop()
  reason?: string; // for rejection or notes

  @Prop()
  approvedByUserId?: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  processedInPayrollRunId?: Types.ObjectId;
}

export type SigningBonusInstanceDocument =
  HydratedDocument<SigningBonusInstance>;
export const SigningBonusInstanceSchema =
  SchemaFactory.createForClass(SigningBonusInstance);