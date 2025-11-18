// src/payroll-execution/models/exit-benefit-instance.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';
import type { ExitType } from '../../payroll-config/models/exit-benefit-policy.schema';

export type ExitBenefitInstanceStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Processed';

@Schema({ timestamps: true })
export class ExitBenefitInstance {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['Resignation', 'Termination', 'Both'],
  })
  exitType!: ExitType;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'ExitBenefitPolicy', required: true })
  policyId!: Types.ObjectId;

  @Prop()
  offboardingCaseId?: string; // link to Offboarding subsystem

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'EGP' })
  currency!: string;

  @Prop({
    default: 'Pending',
    enum: ['Pending', 'Approved', 'Rejected', 'Processed'],
    index: true,
  })
  status!: ExitBenefitInstanceStatus;

  @Prop()
  reason?: string;

  @Prop()
  approvedByUserId?: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  processedInPayrollRunId?: Types.ObjectId;
}

export type ExitBenefitInstanceDocument =
  HydratedDocument<ExitBenefitInstance>;
export const ExitBenefitInstanceSchema =
  SchemaFactory.createForClass(ExitBenefitInstance);