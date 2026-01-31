import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BankingActorKeyDocument = HydratedDocument<BankingActorKey>;

@Schema({ collection: 'banking_actor_keys', timestamps: true })
export class BankingActorKey {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  actorId: Types.ObjectId;

  @Prop({ type: String, required: true })
  actorRole: string;

  @Prop({ type: String, required: true })
  keyId: string;

  @Prop({ type: Number, default: 1 })
  keyVersion: number;

  @Prop({ type: Object, required: true })
  publicKeyJwk: Record<string, any>;

  @Prop({ type: String, default: 'Ed25519' })
  algorithm: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String, default: 'ACTIVE' })
  keyStatus: string;

  @Prop({ type: Date })
  revokedAt?: Date;
}

export const BankingActorKeySchema = SchemaFactory.createForClass(BankingActorKey);
BankingActorKeySchema.index({ actorId: 1, keyId: 1 }, { unique: true });
BankingActorKeySchema.index({ actorId: 1, actorRole: 1, keyStatus: 1 });
