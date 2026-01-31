import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RecognitionEventDocument = HydratedDocument<RecognitionEvent>;

export enum RecognitionEventType {
  ENROLL = 'ENROLL',
  VERIFY = 'VERIFY',
}

export enum RecognitionEventStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  SUSPICIOUS = 'SUSPICIOUS',
}

@Schema({ timestamps: true, collection: 'recognition_events' })
export class RecognitionEvent {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: String, enum: RecognitionEventType, required: true })
  eventType: RecognitionEventType;

  @Prop({ type: String, enum: RecognitionEventStatus, required: true })
  status: RecognitionEventStatus;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: String })
  challengeId?: string;

  @Prop({ type: Number })
  score?: number;

  @Prop({ type: Number })
  threshold?: number;

  @Prop({ type: String })
  verificationTokenHash?: string;

  @Prop({ type: Date })
  verificationTokenExpiresAt?: Date;

  @Prop({ type: Date })
  verificationTokenUsedAt?: Date;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const RecognitionEventSchema = SchemaFactory.createForClass(RecognitionEvent);
RecognitionEventSchema.index({ employeeId: 1, createdAt: -1 });
RecognitionEventSchema.index({ verificationTokenHash: 1 });
