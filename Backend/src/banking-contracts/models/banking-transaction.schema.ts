import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BankingTransactionType } from '../enums/banking-contracts.enums';

export type BankingTransactionDocument = HydratedDocument<BankingTransaction>;

@Schema({ collection: 'banking_transactions', timestamps: true })
export class BankingTransaction {
  @Prop({ type: String, required: true, unique: true })
  transactionId: string;

  @Prop({ type: String, enum: Object.values(BankingTransactionType), required: true })
  transactionType: BankingTransactionType;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: true })
  companyDelta: number;

  @Prop({ type: Number, required: true })
  employeeDelta: number;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  employeeId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceContract' })
  contractId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'payrollRuns' })
  payrollRunId?: Types.ObjectId;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Date, required: true })
  transactionAt: Date;

  @Prop({ type: String })
  txId?: string;

  @Prop({ type: String })
  action?: string;

  @Prop({ type: String })
  actorRole?: string;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  actorId?: Types.ObjectId;

  @Prop({ type: String })
  actorKeyId?: string;

  @Prop({ type: String })
  actorSignature?: string;

  @Prop({ type: String })
  nonce?: string;

  @Prop({ type: Date })
  intentTimestamp?: Date;

  @Prop({ type: String })
  cryptoStatus?: string;

  @Prop({ type: String })
  legacyAlgorithm?: string;

  @Prop({ type: String })
  previousTransactionHash?: string;

  @Prop({ type: String })
  ledgerHmac?: string;

  @Prop({ type: String })
  payloadHash: string;

  @Prop({ type: String })
  signature: string;

  @Prop({ type: Number, default: 1 })
  signatureVersion: number;

  @Prop({ type: String })
  publicKeyFingerprint?: string;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  createdByEmployeeId?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const BankingTransactionSchema = SchemaFactory.createForClass(BankingTransaction);
BankingTransactionSchema.index({ transactionType: 1, transactionAt: -1 });
BankingTransactionSchema.index({ employeeId: 1, transactionAt: -1 });
BankingTransactionSchema.index({ payrollRunId: 1 });
BankingTransactionSchema.index({ txId: 1 }, { unique: true, sparse: true });
BankingTransactionSchema.index({ actorId: 1, intentTimestamp: -1 });
