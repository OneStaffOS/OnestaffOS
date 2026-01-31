import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true, index: true })
  ticketId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true, enum: ['user', 'agent', 'system'] })
  senderType: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  readBy: Types.ObjectId;

  // Encryption fields
  @Prop({ default: false })
  isEncrypted: boolean;

  @Prop({ type: String, enum: ['none', 'aes-256-gcm', 'hybrid'], default: 'none' })
  encryptionType: string;

  @Prop({ type: Number, default: 1 })
  encryptionVersion: number;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Index for efficient querying
ChatMessageSchema.index({ ticketId: 1, createdAt: 1 });
ChatMessageSchema.index({ senderId: 1 });
ChatMessageSchema.index({ isEncrypted: 1 });
