import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CompanyBalanceDocument = HydratedDocument<CompanyBalance>;

@Schema({ collection: 'company_balances', timestamps: true })
export class CompanyBalance {
  @Prop({ type: Number, required: true, default: 0 })
  balance: number;

  @Prop({ type: Date })
  lastUpdatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'BankingTransaction' })
  lastTransactionId?: Types.ObjectId;
}

export const CompanyBalanceSchema = SchemaFactory.createForClass(CompanyBalance);
