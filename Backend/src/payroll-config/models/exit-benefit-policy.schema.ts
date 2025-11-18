// src/payroll-config/models/exit-benefit-policy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ConfigStatus } from './payroll-policy.schema';

export type ExitType = 'Resignation' | 'Termination' | 'Both';
export type ExitBenefitFormulaType =
  | 'PerServiceYear'
  | 'FlatAmount'
  | 'CustomExpression';

@Schema({ timestamps: true })
export class ExitBenefitPolicy {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "RES_STD", "TERM_STD"

  @Prop({ required: true })
  name!: string;

  @Prop({
    required: true,
    enum: ['Resignation', 'Termination', 'Both'],
  })
  appliesTo!: ExitType;

  @Prop({
    default: 'PerServiceYear',
    enum: ['PerServiceYear', 'FlatAmount', 'CustomExpression'],
  })
  formulaType!: ExitBenefitFormulaType;

  @Prop()
  flatAmount?: number;

  @Prop()
  amountPerServiceYear?: number;

  /** Optional custom formula string if needed */
  @Prop()
  customFormula?: string;

  /** Caps, min/max months/years of service, etc. */
  @Prop()
  minServiceMonths?: number;

  @Prop()
  maxServiceMonths?: number;

  @Prop()
  maxAmount?: number;

  @Prop()
  description?: string;

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

export type ExitBenefitPolicyDocument = HydratedDocument<ExitBenefitPolicy>;
export const ExitBenefitPolicySchema =
  SchemaFactory.createForClass(ExitBenefitPolicy);