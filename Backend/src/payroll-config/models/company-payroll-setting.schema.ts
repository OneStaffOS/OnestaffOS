// src/payroll-config/models/company-payroll-setting.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ConfigStatus } from './payroll-policy.schema';

export type PayFrequency = 'Monthly' | 'Weekly' | 'BiWeekly';

@Schema({ timestamps: true })
export class CompanyPayrollSetting {
  @Prop({ required: true, unique: true, default: 'DEFAULT' })
  key!: string; // single record, e.g. "DEFAULT"

  @Prop({
    default: 'Monthly',
    enum: ['Monthly', 'Weekly', 'BiWeekly'],
  })
  payFrequency!: PayFrequency;

  /** 1–31 for monthly cycles */
  @Prop()
  defaultPayDayOfMonth?: number;

  @Prop({ default: 'Africa/Cairo' })
  timeZone!: string;

  @Prop({ default: 'EGP' })
  currency!: string;

  /** Cron-like expression / description of backup plan */
  @Prop()
  backupScheduleExpression?: string;

  @Prop()
  lastBackupAt?: Date;

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

export type CompanyPayrollSettingDocument =
  HydratedDocument<CompanyPayrollSetting>;
export const CompanyPayrollSettingSchema =
  SchemaFactory.createForClass(CompanyPayrollSetting);