/**
 * WebAuthnChallenge Schema
 * Stores temporary challenge data for WebAuthn registration and authentication
 * Challenges expire after 5 minutes to prevent replay attacks
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WebAuthnChallengeDocument = WebAuthnChallenge & Document;

export enum ChallengeType {
  REGISTRATION = 'registration',
  AUTHENTICATION = 'authentication',
}

@Schema({ timestamps: true, collection: 'webauthn_challenges' })
export class WebAuthnChallenge {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  challenge: string; // Base64URL encoded challenge

  @Prop({ type: String, enum: ChallengeType, required: true })
  type: ChallengeType;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ default: '' })
  correlationId: string; // For debugging and request tracing

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const WebAuthnChallengeSchema = SchemaFactory.createForClass(WebAuthnChallenge);

// TTL index to auto-delete expired challenges (MongoDB handles cleanup)
WebAuthnChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for lookups
WebAuthnChallengeSchema.index({ employeeId: 1, type: 1 });
