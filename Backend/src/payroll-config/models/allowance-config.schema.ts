// src/payroll-config/models/allowance-config.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ConfigStatus } from './payroll-policy.schema';

export type AllowanceType =
  | 'Transportation'
  | 'Housing'
  | 'Meals'
  | 'Shift'
  | 'Other';

export type AllowanceCalcMethod =
  | 'Fixed'
  | 'PercentageOfBase'
  | 'PercentageOfGross';

@Schema({ timestamps: true })
export class AllowanceConfig {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "TRANS", "HOUSE"

  @Prop({ required: true })
  name!: string;

  @Prop({
    default: 'Other',
    enum: ['Transportation', 'Housing', 'Meals', 'Shift', 'Other'],
  })
  type!: AllowanceType;

  @Prop({
    default: 'Fixed',
    enum: ['Fixed', 'PercentageOfBase', 'PercentageOfGross'],
  })
  calculationMethod!: AllowanceCalcMethod;

  @Prop()
  fixedAmount?: number;

  @Prop()
  percentage?: number;

  /** Whether taxable & insurable (affects TaxRule/InsuranceBracket) */
  @Prop({ default: false })
  isTaxable!: boolean;

  @Prop({ default: false })
  isInsurable!: boolean;

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

export type AllowanceConfigDocument = HydratedDocument<AllowanceConfig>;
export const AllowanceConfigSchema =
  SchemaFactory.createForClass(AllowanceConfig);