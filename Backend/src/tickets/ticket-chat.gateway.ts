import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { EncryptedChatService } from './encrypted-chat.service';
import { SendMessageDto, JoinRoomDto, TypingDto } from './dto/chat.dto';
import { EncryptionKeyType } from '../common/encryption/encryption.service';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://52.44.26.177',
      'https://onestaffos.digital',
      'https://www.onestaffos.digital',
    ],
    credentials: true,
  },
  namespace: '/tickets',
  transports: ['polling', 'websocket'],
})
export class TicketChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('TicketChatGateway');
  private connectedUsers: Map<string, { socket: Socket; userId: string; userName: string; useEncryption?: boolean }> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly encryptedChatService: EncryptedChatService,
  ) {
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    const headerToken = client.handshake.headers.authorization?.split(' ')[1];
    if (headerToken) return headerToken;

    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      for (const cookie of cookies) {
        const [name, value] = cookie.split('=');
        if (name === 'access_token' && value) {
          return decodeURIComponent(value);
        }
      }
    }
    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected - no token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      const userName = payload.email || 'User';

      // Store connection info
      this.connectedUsers.set(client.id, { socket: client, userId, userName });
      
      // Join personal notification room
      client.join(`user:${userId}`);
      
      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
      
      // Send connection success event
      client.emit('connected', { 
        message: 'Connected to ticket chat',
        userId,
      });

      // Send unread notification count
      const unreadCount = await this.chatService.getUnreadNotificationCount(userId);
      client.emit('notification_count', { count: unreadCount });

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);
    if (userInfo) {
      this.logger.log(`Client disconnected: ${client.id} (User: ${userInfo.userId})`);
      this.connectedUsers.delete(client.id);
    }
  }

  @SubscribeMessage('join_ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Verify user has access to this ticket
      const hasAccess = await this.chatService.verifyTicketAccess(data.ticketId, userInfo.userId);
      
      if (!hasAccess) {
        client.emit('error', { message: 'No access to this ticket' });
        return;
      }

      const roomName = `ticket:${data.ticketId}`;
      client.join(roomName);
      
      this.logger.log(`User ${userInfo.userId} joined room ${roomName}`);
      
      // Get chat history
      const messages = await this.chatService.getMessages(data.ticketId);
      client.emit('chat_history', { ticketId: data.ticketId, messages });

      // Notify others in the room
      client.to(roomName).emit('user_joined', {
        ticketId: data.ticketId,
        userId: userInfo.userId,
        userName: userInfo.userName,
      });

    } catch (error) {
      this.logger.error(`Join ticket error: ${error.message}`);
      client.emit('error', { message: 'Failed to join ticket chat' });
    }
  }

  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) return;

    const roomName = `ticket:${data.ticketId}`;
    client.leave(roomName);
    
    // Notify others
    client.to(roomName).emit('user_left', {
      ticketId: data.ticketId,
      userId: userInfo.userId,
      userName: userInfo.userName,
    });

    this.logger.log(`User ${userInfo.userId} left room ${roomName}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Save message to database
      const message = await this.chatService.saveMessage({
        ticketId: data.ticketId,
        senderId: userInfo.userId,
        senderName: userInfo.userName,
        message: data.message,
        attachments: data.attachments,
      });

      const roomName = `ticket:${data.ticketId}`;

      // Broadcast to all users in the room including sender
      this.server.to(roomName).emit('new_message', {
        ticketId: data.ticketId,
        message,
      });

      // Send notification to ticket owner/assignee if not in room
      await this.chatService.sendMessageNotification(
        data.ticketId,
        userInfo.userId,
        userInfo.userName,
        data.message,
      );

    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingDto,
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) return;

    const roomName = `ticket:${data.ticketId}`;
    client.to(roomName).emit('user_typing', {
      ticketId: data.ticketId,
      userId: userInfo.userId,
      userName: userInfo.userName,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) return;

    try {
      await this.chatService.markMessagesAsRead(data.ticketId, userInfo.userId);
      client.emit('messages_read', { ticketId: data.ticketId });
    } catch (error) {
      this.logger.error(`Mark read error: ${error.message}`);
    }
  }

  // Methods for external use (from services)
  
  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Broadcast ticket update to all users in ticket room
   */
  broadcastTicketUpdate(ticketId: string, update: any) {
    this.server.to(`ticket:${ticketId}`).emit('ticket_updated', update);
  }

  /**
   * Send notification count update
   */
  sendNotificationCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('notification_count', { count });
  }

  /**
   * Get online status of a user
   */
  isUserOnline(userId: string): boolean {
    for (const [, userInfo] of this.connectedUsers) {
      if (userInfo.userId === userId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all users in a ticket room
   */
  async getUsersInTicketRoom(ticketId: string): Promise<string[]> {
    const roomName = `ticket:${ticketId}`;
    const sockets = await this.server.in(roomName).fetchSockets();
    const userIds: string[] = [];
    
    for (const socket of sockets) {
      const userInfo = this.connectedUsers.get(socket.id);
      if (userInfo) {
        userIds.push(userInfo.userId);
      }
    }
    
    return userIds;
  }

  // ==========================================
  // Encryption-Related Handlers
  // ==========================================

  /**
   * Get encryption public key
   */
  @SubscribeMessage('get_encryption_key')
  handleGetEncryptionKey(@ConnectedSocket() client: Socket) {
    const keyInfo = this.encryptedChatService.getPublicKey();
    client.emit('encryption_key', keyInfo);
  }

  /**
   * Enable encryption for this connection
   */
  @SubscribeMessage('enable_encryption')
  handleEnableEncryption(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey?: string },
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (userInfo) {
      userInfo.useEncryption = true;
      this.connectedUsers.set(client.id, userInfo);
      client.emit('encryption_enabled', { 
        status: 'enabled',
        keyType: EncryptionKeyType.LIVE_CHAT,
      });
      this.logger.log(`Encryption enabled for user ${userInfo.userId}`);
    }
  }

  /**
   * Send encrypted message
   */
  @SubscribeMessage('send_encrypted_message')
  async handleSendEncryptedMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      ticketId: string;
      encryptedMessage: {
        ciphertext: string;
        iv: string;
        tag: string;
      };
      encryptedSessionKey: string;
      attachments?: string[];
    },
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Decrypt the message from client
      const decryptedMessage = this.encryptedChatService.decryptFromClient(
        data.encryptedSessionKey,
        data.encryptedMessage,
      );

      // Save the encrypted message
      const message = await this.encryptedChatService.saveEncryptedMessage({
        ticketId: data.ticketId,
        senderId: userInfo.userId,
        senderName: userInfo.userName,
        message: decryptedMessage,
        attachments: data.attachments,
      });

      const roomName = `ticket:${data.ticketId}`;

      // Broadcast encrypted message to all users in the room
      const encryptedForBroadcast = this.encryptedChatService.encryptForClient(decryptedMessage);
      
      this.server.to(roomName).emit('new_encrypted_message', {
        ticketId: data.ticketId,
        messageId: (message as any)._id?.toString() || Date.now().toString(),
        senderName: userInfo.userName,
        senderId: userInfo.userId,
        encryptedContent: encryptedForBroadcast,
        timestamp: new Date().toISOString(),
      });

      // Also emit plain message for clients not using encryption
      this.server.to(roomName).emit('new_message', {
        ticketId: data.ticketId,
        message: {
          ...(message as any).toObject?.() || message,
          message: decryptedMessage, // Send decrypted for non-encrypted clients
        },
      });

      // Send notification
      await this.chatService.sendMessageNotification(
        data.ticketId,
        userInfo.userId,
        userInfo.userName,
        '[Encrypted Message]', // Don't expose content in notification
      );

    } catch (error) {
      this.logger.error(`Encrypted message error: ${error.message}`);
      client.emit('error', { message: 'Failed to process encrypted message' });
    }
  }

  /**
   * Get encrypted chat history
   */
  @SubscribeMessage('get_encrypted_history')
  async handleGetEncryptedHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; limit?: number },
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const messages = await this.encryptedChatService.getEncryptedChatHistory(
        data.ticketId,
        userInfo.userId,
        data.limit || 100,
      );

      // Encrypt each message for the client
      const encryptedMessages = messages.map(msg => ({
        ...msg,
        encryptedContent: this.encryptedChatService.encryptForClient(msg.content),
      }));

      client.emit('encrypted_chat_history', {
        ticketId: data.ticketId,
        messages: encryptedMessages,
      });

    } catch (error) {
      this.logger.error(`Get encrypted history error: ${error.message}`);
      client.emit('error', { message: 'Failed to get encrypted history' });
    }
  }

  /**
   * Get encryption info
   */
  @SubscribeMessage('get_encryption_info')
  handleGetEncryptionInfo(@ConnectedSocket() client: Socket) {
    const info = this.encryptedChatService.getEncryptionInfo();
    client.emit('encryption_info', info);
  }
}
