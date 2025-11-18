// src/payroll-config/models/insurance-bracket.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ConfigStatus } from './payroll-policy.schema';

export type InsuranceType = 'Social' | 'Health' | 'Pension' | 'Unemployment';

@Schema({ _id: false })
class InsuranceBracketRange {
  @Prop({ required: true })
  minBaseInclusive!: number;

  @Prop({ required: true })
  maxBaseExclusive!: number;

  /** e.g. 0.11 for 11% */
  @Prop({ required: true })
  employeeRate!: number;

  @Prop({ required: true })
  employerRate!: number;
}

@Schema({ timestamps: true })
export class InsuranceBracket {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "SOCIAL_2025", ...

  @Prop({ required: true })
  name!: string;

  @Prop({
    required: true,
    enum: ['Social', 'Health', 'Pension', 'Unemployment'],
  })
  type!: InsuranceType;

  @Prop()
  countryCode?: string;

  @Prop()
  currency?: string;

  @Prop()
  effectiveFrom?: Date;

  @Prop()
  effectiveTo?: Date;

  @Prop({ type: [InsuranceBracketRange], default: [] })
  brackets!: InsuranceBracketRange[];

  @Prop({
    default: 'Draft',
    enum: ['Draft', 'Active', 'Archived'],
  })
  status!: ConfigStatus;

  @Prop()
  createdByUserId?: string;

  /** Specifically approved by HR Manager (REQ-PY-22) */
  @Prop()
  approvedByHrManagerId?: string;

  @Prop()
  approvedAt?: Date;
}

export type InsuranceBracketDocument = HydratedDocument<InsuranceBracket>;
export const InsuranceBracketSchema =
  SchemaFactory.createForClass(InsuranceBracket);