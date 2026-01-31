import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BankingNonceDocument = HydratedDocument<BankingNonce>;

@Schema({ collection: 'banking_nonces', timestamps: true })
export class BankingNonce {
  @Prop({ type: String, required: true, unique: true })
  nonce: string;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  actorId: Types.ObjectId;

  @Prop({ type: String })
  txId?: string;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;
}

export const BankingNonceSchema = SchemaFactory.createForClass(BankingNonce);
BankingNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
