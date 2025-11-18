// src/payroll-execution/models/payroll-area.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type PayrollAreaStatus = 'Active' | 'Inactive';

@Schema({ timestamps: true })
export class PayrollArea {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "EG-MAIN-MONTHLY"

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  /** Optional scoping to org structure / legal entity / cost center */
  @Prop({ type: [MSchema.Types.ObjectId], ref: 'Department', default: [] })
  deptIds!: Types.ObjectId[];

  @Prop({ type: [MSchema.Types.ObjectId], ref: 'Position', default: [] })
  positionIds!: Types.ObjectId[];

  @Prop()
  legalEntityCode?: string;

  @Prop({
    default: 'Active',
    enum: ['Active', 'Inactive'],
  })
  status!: PayrollAreaStatus;
}

export type PayrollAreaDocument = HydratedDocument<PayrollArea>;
export const PayrollAreaSchema = SchemaFactory.createForClass(PayrollArea);