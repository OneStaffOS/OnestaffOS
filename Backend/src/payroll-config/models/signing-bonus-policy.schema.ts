// src/payroll-config/models/signing-bonus-policy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ConfigStatus } from './payroll-policy.schema';

export type BonusAmountType = 'Fixed' | 'PercentageOfBase';
export type BonusFrequency = 'OneTime' | 'Installments';

@Schema({ timestamps: true })
export class SigningBonusPolicy {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "SIGN_STD", ...

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: ['Fixed', 'PercentageOfBase'],
  })
  amountType!: BonusAmountType;

  @Prop()
  fixedAmount?: number;

  @Prop()
  percentageOfBase?: number;

  @Prop({
    default: 'OneTime',
    enum: ['OneTime', 'Installments'],
  })
  frequency!: BonusFrequency;

  @Prop()
  maxInstallments?: number;

  /** Simple eligibility hints; actual logic in service */
  @Prop()
  minGrade?: string;

  @Prop()
  contractType?: string; // FullTime / PartTime / etc.

  @Prop({
    default: 'Draft',
    enum: ['Draft', 'Active', 'Archived'],
  })
  status!: ConfigStatus;

  @Prop()
  createdByUserId?: string;

  @Prop()
  approvedByUserId?: string;

  @Prop()
  approvedAt?: Date;
}

export type SigningBonusPolicyDocument = HydratedDocument<SigningBonusPolicy>;
export const SigningBonusPolicySchema =
  SchemaFactory.createForClass(SigningBonusPolicy);