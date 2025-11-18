// src/payroll-config/models/tax-rule.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ConfigStatus } from './payroll-policy.schema';

@Schema({ _id: false })
class TaxBracket {
  @Prop({ required: true })
  minInclusive!: number;

  @Prop({ required: true })
  maxExclusive!: number;

  /** Percentage, e.g. 0.15 for 15% */
  @Prop({ required: true })
  rate!: number;

  /** Optional fixed amount portion */
  @Prop()
  fixedAmount?: number;
}

@Schema({ timestamps: true })
export class TaxRule {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "EGP_INCOME_2025"

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop()
  countryCode?: string; // "EG"

  @Prop()
  currency?: string; // "EGP"

  @Prop()
  effectiveFrom?: Date;

  @Prop()
  effectiveTo?: Date;

  @Prop({ type: [TaxBracket], default: [] })
  brackets!: TaxBracket[];

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

export type TaxRuleDocument = HydratedDocument<TaxRule>;
export const TaxRuleSchema = SchemaFactory.createForClass(TaxRule);