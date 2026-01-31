import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VerificationChallengeDocument = HydratedDocument<VerificationChallenge>;

export enum BiometricsChallengeAction {
  ENROLL = 'ENROLL',
  VERIFY = 'VERIFY',
}

@Schema({ timestamps: true, collection: 'verification_challenges' })
export class VerificationChallenge {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, index: true })
  challengeId: string;

  @Prop({ type: String, required: true })
  nonce: string;

  @Prop({ type: String, enum: BiometricsChallengeAction, required: true })
  action: BiometricsChallengeAction;

  @Prop({ type: [String], default: [] })
  livenessActions: string[];

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;
}

export const VerificationChallengeSchema = SchemaFactory.createForClass(VerificationChallenge);
VerificationChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
