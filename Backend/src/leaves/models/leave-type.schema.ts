import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LeaveCategory =
  | 'Annual'
  | 'Sick'
  | 'Unpaid'
  | 'Mission'
  | 'Maternity'
  | 'Paternity'
  | 'Special'
  | 'Other';

export type LeaveUnit = 'Days' | 'Hours';

export type LeaveTypeStatus = 'Active' | 'Inactive' | 'Archived';

@Schema({ timestamps: true })
export class LeaveType {
  /** Unique code, e.g. "ANNUAL", "SICK", "UNPAID" */
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string;

  @Prop({ required: true })
  name!: string; // "Annual Leave", "Sick Leave", ...

  @Prop({ default: 'Annual', enum: [
    'Annual',
    'Sick',
    'Unpaid',
    'Mission',
    'Maternity',
    'Paternity',
    'Special',
    'Other',
  ] })
  category!: LeaveCategory;

  @Prop()
  description?: string;

  /** Paid or unpaid (affects payroll integration) */
  @Prop({ default: true })
  isPaid!: boolean;

  /**
   * If true, this leave reduces annual vacation balance
   * (Annual, Accidental, Compensation etc.)
   */
  @Prop({ default: false })
  deductsFromAnnualBalance!: boolean;

  /** Payroll paycode linkage (BR 6) */
  @Prop()
  payrollPayCode?: string;

  /** Unit of measurement (days / hours) */
  @Prop({ default: 'Days', enum: ['Days', 'Hours'] })
  unit!: LeaveUnit;

  /** Whether documentation is required (e.g. Sick > 1 day) */
  @Prop({ default: false })
  requiresDocument!: boolean;

  /** Free text rule, e.g. "Medical certificate for sick > 1 day" */
  @Prop()
  documentRule?: string;

  @Prop({ default: 'Active', enum: ['Active', 'Inactive', 'Archived'] })
  status!: LeaveTypeStatus;
}

export type LeaveTypeDocument = HydratedDocument<LeaveType>;
export const LeaveTypeSchema = SchemaFactory.createForClass(LeaveType);