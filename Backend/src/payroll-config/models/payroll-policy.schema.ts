// src/payroll-config/models/payroll-policy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfigStatus = 'Draft' | 'Active' | 'Archived';

@Schema({ timestamps: true })
export class PayrollPolicy {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // e.g. "GENERAL_RULES", "MISCONDUCT_POLICY"

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  /** Free-form JSON for policy parameters (penalty rules, rounding rules, etc.) */
  @Prop({ type: Object, default: {} })
  parameters!: Record<string, any>;

  /** Draft until approved by Payroll Manager */
  @Prop({
    default: 'Draft',
    enum: ['Draft', 'Active', 'Archived'],
    index: true,
  })
  status!: ConfigStatus;

  @Prop()
  createdByUserId?: string;

  @Prop()
  approvedByUserId?: string;

  @Prop()
  approvedAt?: Date;
}

export type PayrollPolicyDocument = HydratedDocument<PayrollPolicy>;
export const PayrollPolicySchema = SchemaFactory.createForClass(PayrollPolicy);