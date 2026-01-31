import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketNotificationDocument = TicketNotification & Document;

export enum NotificationType {
  TICKET_CREATED = 'ticket_created',
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_COMMENTED = 'ticket_commented',
  TICKET_RESOLVED = 'ticket_resolved',
  TICKET_CLOSED = 'ticket_closed',
  NEW_MESSAGE = 'new_message',
  WORKFLOW_UPDATED = 'workflow_updated',
}

@Schema({ timestamps: true })
export class TicketNotification {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  recipientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true })
  ticketId: Types.ObjectId;

  @Prop({ required: true })
  ticketNumber: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  triggeredBy: Types.ObjectId;

  @Prop()
  triggeredByName: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt: Date;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const TicketNotificationSchema = SchemaFactory.createForClass(TicketNotification);

// Indexes for efficient querying
TicketNotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
TicketNotificationSchema.index({ ticketId: 1 });
