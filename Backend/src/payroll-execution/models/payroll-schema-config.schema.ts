// src/payroll-execution/models/payroll-schema-config.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class PayrollSchemaConfig {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "STANDARD_EG_2025"

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  /** Whether this schema is the default for a given area */
  @Prop({ default: false })
  isDefault!: boolean;
}

export type PayrollSchemaConfigDocument =
  HydratedDocument<PayrollSchemaConfig>;
export const PayrollSchemaConfigSchema =
  SchemaFactory.createForClass(PayrollSchemaConfig);