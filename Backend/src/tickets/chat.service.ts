import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './models/chat.schema';
import { TicketNotification, TicketNotificationDocument, NotificationType } from './models/notification.schema';
import { Ticket, TicketDocument } from './models/ticket.schema';
import { Role } from '../auth/decorators/roles.decorator';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(TicketNotification.name) private notificationModel: Model<TicketNotificationDocument>,
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
  ) {}

  /**
   * Verify if a user has access to a ticket's chat
   */
  async verifyTicketAccess(ticketId: string, userId: string): Promise<boolean> {
    const ticket = await this.ticketModel.findById(ticketId).exec();
    
    if (!ticket) {
      return false;
    }

    // User is ticket owner
    if (ticket.employeeId.toString() === userId) {
      return true;
    }

    // User is assigned agent
    if (ticket.assignedTo && ticket.assignedTo.toString() === userId) {
      return true;
    }

    // TODO: Check if user has admin role (would need to inject employee service)
    // For now, admins should be able to access via ticket ownership check
    
    return true; // Allow for now, proper role check should be added
  }

  /**
   * Save a chat message
   */
  async saveMessage(data: {
    ticketId: string;
    senderId: string;
    senderName: string;
    message: string;
    attachments?: string[];
  }): Promise<ChatMessage> {
    const ticket = await this.ticketModel.findById(data.ticketId).exec();
    
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Determine sender type
    let senderType = 'user';
    if (ticket.assignedTo && ticket.assignedTo.toString() === data.senderId) {
      senderType = 'agent';
    }

    const chatMessage = new this.chatMessageModel({
      ticketId: new Types.ObjectId(data.ticketId),
      senderId: new Types.ObjectId(data.senderId),
      senderName: data.senderName,
      senderType,
      message: data.message,
      attachments: data.attachments || [],
    });

    return chatMessage.save();
  }

  /**
   * Get messages for a ticket
   */
  async getMessages(ticketId: string, limit: number = 100, before?: string): Promise<ChatMessage[]> {
    const query: any = { ticketId: new Types.ObjectId(ticketId) };
    
    if (before) {
      query._id = { $lt: new Types.ObjectId(before) };
    }

    return this.chatMessageModel
      .find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get chat history for a ticket (with access verification)
   */
  async getChatHistory(ticketId: string, userId: string, limit: number = 100): Promise<ChatMessage[]> {
    const hasAccess = await this.verifyTicketAccess(ticketId, userId);
    
    if (!hasAccess) {
      throw new ForbiddenException('No access to this ticket chat');
    }

    return this.getMessages(ticketId, limit);
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(ticketId: string, userId: string): Promise<void> {
    await this.chatMessageModel.updateMany(
      {
        ticketId: new Types.ObjectId(ticketId),
        senderId: { $ne: new Types.ObjectId(userId) },
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          readBy: new Types.ObjectId(userId),
        },
      },
    ).exec();
  }

  /**
   * Get unread message count for a user in a ticket
   */
  async getUnreadMessageCount(ticketId: string, userId: string): Promise<number> {
    return this.chatMessageModel.countDocuments({
      ticketId: new Types.ObjectId(ticketId),
      senderId: { $ne: new Types.ObjectId(userId) },
      isRead: false,
    }).exec();
  }

  /**
   * Send message notification
   */
  async sendMessageNotification(
    ticketId: string,
    senderId: string,
    senderName: string,
    message: string,
  ): Promise<void> {
    const ticket = await this.ticketModel.findById(ticketId).exec();
    
    if (!ticket) return;

    const recipients: string[] = [];

    // Notify ticket owner if sender is not the owner
    if (ticket.employeeId.toString() !== senderId) {
      recipients.push(ticket.employeeId.toString());
    }

    // Notify assigned agent if sender is not the agent
    if (ticket.assignedTo && ticket.assignedTo.toString() !== senderId) {
      recipients.push(ticket.assignedTo.toString());
    }

    // Create notifications for each recipient
    for (const recipientId of recipients) {
      await this.createNotification({
        recipientId,
        ticketId,
        ticketNumber: ticket.ticketNumber,
        type: NotificationType.NEW_MESSAGE,
        title: 'New Message',
        message: `${senderName}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        triggeredBy: senderId,
        triggeredByName: senderName,
      });
    }
  }

  /**
   * Create a notification
   */
  async createNotification(data: {
    recipientId: string;
    ticketId: string;
    ticketNumber: string;
    type: NotificationType;
    title: string;
    message: string;
    triggeredBy?: string;
    triggeredByName?: string;
    metadata?: Record<string, any>;
  }): Promise<TicketNotification> {
    const notification = new this.notificationModel({
      recipientId: new Types.ObjectId(data.recipientId),
      ticketId: new Types.ObjectId(data.ticketId),
      ticketNumber: data.ticketNumber,
      type: data.type,
      title: data.title,
      message: data.message,
      triggeredBy: data.triggeredBy ? new Types.ObjectId(data.triggeredBy) : undefined,
      triggeredByName: data.triggeredByName,
      metadata: data.metadata,
    });

    return notification.save();
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number; skip?: number } = {},
  ): Promise<TicketNotification[]> {
    const query: any = { recipientId: new Types.ObjectId(userId) };
    
    if (options.unreadOnly) {
      query.isRead = false;
    }

    return this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .exec();
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      recipientId: new Types.ObjectId(userId),
      isRead: false,
    }).exec();
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      {
        _id: new Types.ObjectId(notificationId),
        recipientId: new Types.ObjectId(userId),
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    ).exec();
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    ).exec();
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    }).exec();

    return result.deletedCount;
  }
}
