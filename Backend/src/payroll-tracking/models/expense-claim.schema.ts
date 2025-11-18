// src/payroll-tracking/models/expense-claim.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type ExpenseClaimStatus =
  | 'Submitted'
  | 'Rejected'
  | 'ApprovedBySpecialist'
  | 'ApprovedByManager'
  | 'Closed';

@Schema({ _id: false })
class ExpenseAttachment {
  @Prop({ required: true }) key!: string;
  @Prop({ required: true }) name!: string;
  @Prop() contentType?: string;
}

@Schema({ timestamps: true })
export class ExpenseClaim {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop()
  employeeEmail?: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'EGP' })
  currency!: string;

  @Prop()
  expenseDate?: Date;

  @Prop({ type: [ExpenseAttachment], default: [] })
  attachments!: ExpenseAttachment[];

  @Prop({
    default: 'Submitted',
    enum: [
      'Submitted',
      'Rejected',
      'ApprovedBySpecialist',
      'ApprovedByManager',
      'Closed',
    ],
    index: true,
  })
  status!: ExpenseClaimStatus;

  @Prop()
  resolutionNote?: string;

  @Prop()
  specialistUserId?: string;

  @Prop()
  managerUserId?: string;

  @Prop()
  financeUserId?: string;

  @Prop()
  refundProcessedInRunId?: Types.ObjectId;
}

export type ExpenseClaimDocument = HydratedDocument<ExpenseClaim>;
export const ExpenseClaimSchema = SchemaFactory.createForClass(ExpenseClaim);