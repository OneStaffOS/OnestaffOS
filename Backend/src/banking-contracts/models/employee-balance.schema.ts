import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmployeeBalanceDocument = HydratedDocument<EmployeeBalance>;

@Schema({ collection: 'employee_balances', timestamps: true })
export class EmployeeBalance {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, unique: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Number, required: true, default: 0 })
  balance: number;

  @Prop({ type: Date })
  lastUpdatedAt?: Date;
}

export const EmployeeBalanceSchema = SchemaFactory.createForClass(EmployeeBalance);
EmployeeBalanceSchema.index({ employeeId: 1 });
