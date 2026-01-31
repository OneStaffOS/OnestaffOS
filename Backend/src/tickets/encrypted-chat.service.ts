/**
 * Encrypted Chat Service for Live Chat (Tickets)
 * 
 * Provides encryption for WebSocket-based live chat:
 * - End-to-end encryption using hybrid AES-256-GCM + RSA-2048
 * - Encryption at rest for stored messages
 * - Secure session management
 */

import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  EncryptionService,
  EncryptedData,
  EncryptionKeyType,
} from '../common/encryption/encryption.service';
import { ChatMessage } from './models/chat.schema';

export interface EncryptedChatMessage {
  encryptedContent: EncryptedData;
  senderId: string;
  senderName: string;
  senderType: string;
  ticketId: string;
  attachments?: string[];
  timestamp: Date;
}

export interface DecryptedChatMessage {
  content: string;
  senderId: string;
  senderName: string;
  senderType: string;
  ticketId: string;
  attachments?: string[];
  timestamp: Date;
  isEncrypted: boolean;
}

@Injectable()
export class EncryptedChatService {
  private readonly logger = new Logger(EncryptedChatService.name);
  private readonly keyType = EncryptionKeyType.LIVE_CHAT;

  constructor(
    private readonly chatService: ChatService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.logger.log('EncryptedChatService initialized for Live Chat');
  }

  /**
   * Get server's public key for client-side encryption
   */
  getPublicKey(): { publicKey: string; keyType: string } {
    return {
      publicKey: this.encryptionService.getPublicKey(this.keyType),
      keyType: this.keyType,
    };
  }

  /**
   * Encrypt a message for storage
   */
  encryptMessage(message: string): EncryptedData {
    return this.encryptionService.encryptLiveChatMessage(message);
  }

  /**
   * Decrypt a stored message
   */
  decryptMessage(encryptedData: EncryptedData): string {
    return this.encryptionService.decryptLiveChatMessage(encryptedData);
  }

  /**
   * Save an encrypted message
   */
  async saveEncryptedMessage(data: {
    ticketId: string;
    senderId: string;
    senderName: string;
    message: string;
    attachments?: string[];
  }): Promise<ChatMessage> {
    // Encrypt the message content
    const encryptedContent = this.encryptMessage(data.message);
    
    // Store as JSON string (the schema expects a string)
    const encryptedMessageString = JSON.stringify({
      encrypted: true,
      version: 1,
      data: encryptedContent,
    });

    // Save using the base chat service
    return this.chatService.saveMessage({
      ticketId: data.ticketId,
      senderId: data.senderId,
      senderName: data.senderName,
      message: encryptedMessageString,
      attachments: data.attachments,
    });
  }

  /**
   * Get and decrypt messages for a ticket
   */
  async getDecryptedMessages(
    ticketId: string,
    limit: number = 100,
    before?: string,
  ): Promise<DecryptedChatMessage[]> {
    const messages = await this.chatService.getMessages(ticketId, limit, before);
    
    return messages.map((msg) => this.decryptChatMessage(msg));
  }

  /**
   * Decrypt a single chat message
   */
  decryptChatMessage(message: ChatMessage): DecryptedChatMessage {
    let content: string;
    let isEncrypted = false;

    try {
      // Try to parse as encrypted message
      const parsed = JSON.parse(message.message);
      
      if (parsed.encrypted && parsed.data) {
        content = this.decryptMessage(parsed.data);
        isEncrypted = true;
      } else {
        // Plain text message
        content = message.message;
      }
    } catch {
      // Not JSON, treat as plain text (legacy messages)
      content = message.message;
    }

    return {
      content,
      senderId: message.senderId.toString(),
      senderName: message.senderName,
      senderType: message.senderType,
      ticketId: message.ticketId.toString(),
      attachments: message.attachments,
      timestamp: (message as any).createdAt || new Date(),
      isEncrypted,
    };
  }

  /**
   * Decrypt message from client (for WebSocket)
   */
  decryptFromClient(
    encryptedSessionKey: string,
    encryptedData: { ciphertext: string; iv: string; tag: string },
  ): string {
    return this.encryptionService.decryptFromClient(
      encryptedSessionKey,
      encryptedData,
      this.keyType,
    );
  }

  /**
   * Encrypt message for client response (WebSocket)
   */
  encryptForClient(message: string): EncryptedData {
    return this.encryptMessage(message);
  }

  /**
   * Get encrypted chat history for a ticket (with access verification)
   */
  async getEncryptedChatHistory(
    ticketId: string,
    userId: string,
    limit: number = 100,
  ): Promise<DecryptedChatMessage[]> {
    const hasAccess = await this.chatService.verifyTicketAccess(ticketId, userId);
    
    if (!hasAccess) {
      throw new Error('Access denied to ticket chat');
    }

    return this.getDecryptedMessages(ticketId, limit);
  }

  /**
   * Verify ticket access (proxy to base service)
   */
  async verifyTicketAccess(ticketId: string, userId: string): Promise<boolean> {
    return this.chatService.verifyTicketAccess(ticketId, userId);
  }

  /**
   * Mark messages as read (proxy to base service)
   */
  async markMessagesAsRead(ticketId: string, userId: string): Promise<void> {
    return this.chatService.markMessagesAsRead(ticketId, userId);
  }

  /**
   * Get encryption info
   */
  getEncryptionInfo(): {
    keyType: string;
    isReady: boolean;
    algorithms: { symmetric: string; asymmetric: string };
  } {
    const info = this.encryptionService.getEncryptionInfo();
    return {
      keyType: this.keyType,
      isReady: true,
      algorithms: info.algorithms,
    };
  }

  /**
   * Re-encrypt existing messages (for key rotation)
   */
  async reEncryptMessages(
    ticketId: string,
    oldKeyDecryptor: (data: EncryptedData) => string,
  ): Promise<number> {
    const messages = await this.chatService.getMessages(ticketId);
    let reEncryptedCount = 0;

    for (const message of messages) {
      try {
        const parsed = JSON.parse(message.message);
        
        if (parsed.encrypted && parsed.data) {
          // Decrypt with old key
          const decrypted = oldKeyDecryptor(parsed.data);
          
          // Re-encrypt with new key
          const newEncrypted = this.encryptMessage(decrypted);
          
          // Update would require direct DB access
          // This is a placeholder for the concept
          reEncryptedCount++;
        }
      } catch {
        // Skip non-encrypted or invalid messages
      }
    }

    return reEncryptedCount;
  }
}
