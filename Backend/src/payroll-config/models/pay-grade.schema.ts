// src/payroll-config/models/pay-grade.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';
import type { ConfigStatus } from './payroll-policy.schema';

@Schema({ _id: false })
class PayGradeAllowance {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'AllowanceConfig', required: true })
  allowanceConfigId!: Types.ObjectId;

  /** Fixed amount OR percentageOfBase / percentageOfGross */
  @Prop()
  fixedAmount?: number;

  @Prop()
  percentageOfBase?: number;

  @Prop()
  percentageOfGross?: number;
}

@Schema({ timestamps: true })
export class PayGrade {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // "PG-EG-01", etc.

  @Prop({ required: true })
  name!: string; // "Junior Developer Grade 1"

  /** Link to organization structure (optional, ObjectId string references) */
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department' })
  deptId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position' })
  positionId?: Types.ObjectId;

  @Prop()
  gradeBand?: string; // "G1", "G2", "A1", ...

  @Prop({ required: true })
  baseSalary!: number;

  @Prop({ required: true, default: 'EGP' })
  currency!: string;

  /** Optional min/max salary for this grade (BR 10) */
  @Prop()
  minSalary?: number;

  @Prop()
  maxSalary?: number;

  @Prop({ type: [PayGradeAllowance], default: [] })
  allowances!: PayGradeAllowance[];

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

export type PayGradeDocument = HydratedDocument<PayGrade>;
export const PayGradeSchema = SchemaFactory.createForClass(PayGrade);