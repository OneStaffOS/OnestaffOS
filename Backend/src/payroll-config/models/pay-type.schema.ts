// src/payroll-config/models/pay-type.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ConfigStatus } from './payroll-policy.schema';

export type PayBasis = 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Contract';

@Schema({ timestamps: true })
export class PayType {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "HOURLY", "MONTHLY"

  @Prop({ required: true })
  name!: string;

  @Prop({
    required: true,
    enum: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Contract'],
  })
  basis!: PayBasis;

  @Prop()
  description?: string;

  @Prop()
  defaultHoursPerDay?: number;

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

export type PayTypeDocument = HydratedDocument<PayType>;
export const PayTypeSchema = SchemaFactory.createForClass(PayType);