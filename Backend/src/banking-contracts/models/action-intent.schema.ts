import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BankingActionIntentDocument = HydratedDocument<BankingActionIntent>;

@Schema({ collection: 'banking_action_intents', timestamps: true })
export class BankingActionIntent {
  @Prop({ type: String, required: true, unique: true })
  txId: string;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  actorId: Types.ObjectId;

  @Prop({ type: String, required: true })
  actorRole: string;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: Types.ObjectId, ref: 'ServiceContract' })
  contractId?: Types.ObjectId;

  @Prop({ type: String })
  payloadHash?: string;

  @Prop({ type: String })
  nonce?: string;

  @Prop({ type: Date })
  payloadTimestamp?: Date;
}

export const BankingActionIntentSchema = SchemaFactory.createForClass(BankingActionIntent);
BankingActionIntentSchema.index({ actorId: 1, action: 1, createdAt: -1 });
