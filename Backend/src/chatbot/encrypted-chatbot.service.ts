/**
 * Encrypted AI Chatbot Service
 * 
 * Wraps the AI Chatbot service with encryption support for:
 * - End-to-end encryption of messages
 * - Encryption at rest for conversation history
 * - Secure session key exchange
 */

import { Injectable, Logger } from '@nestjs/common';
import { AIChatbotService, ChatbotResponse, ChatMessage } from './ai-chatbot.service';
import { 
  EncryptionService, 
  EncryptedData, 
  EncryptionKeyType 
} from '../common/encryption/encryption.service';

export interface EncryptedChatRequest {
  encryptedMessage: {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  encryptedSessionKey: string;
  sessionId?: string;
  userId?: string;
}

// Secure response - omits plaintext message
export interface EncryptedChatResponse {
  success: boolean;
  sessionId?: string;
  userId?: string;
  data?: {
    intent: string;
    confidence: number;
    predictions: Array<{ intent: string; confidence: number }>;
    requiresEscalation: boolean;
    escalationReason?: string;
    timestamp: string;
    // Note: message is intentionally omitted for security
  };
  error?: string;
  encryptedData?: {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  isEncrypted: boolean;
}

export interface EncryptedConversation {
  sessionId: string;
  messages: EncryptedData[];
  createdAt: Date;
  lastActivity: Date;
}

@Injectable()
export class EncryptedChatbotService {
  private readonly logger = new Logger(EncryptedChatbotService.name);
  private readonly keyType = EncryptionKeyType.AI_CHATBOT;
  
  // Store encrypted conversations (in production, use Redis or DB)
  private encryptedConversations: Map<string, EncryptedConversation> = new Map();
  
  // Store client session keys for response encryption
  private clientSessionKeys: Map<string, Buffer> = new Map();

  constructor(
    private readonly chatbotService: AIChatbotService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.logger.log('EncryptedChatbotService initialized');
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
   * Process encrypted message from client
   */
  async processEncryptedMessage(
    request: EncryptedChatRequest,
  ): Promise<EncryptedChatResponse> {
    try {
      // Extract and store client's session key for response encryption
      const clientSessionKey = this.encryptionService.decryptSessionKey(
        request.encryptedSessionKey,
        this.keyType,
      );

      // Decrypt the message from client
      const decryptedMessage = this.encryptionService.decryptFromClient(
        request.encryptedSessionKey,
        request.encryptedMessage,
        this.keyType,
      );

      this.logger.debug(`Decrypted message: "${decryptedMessage.substring(0, 50)}..."`);

      const sessionId = request.sessionId || this.encryptionService.generateSessionId();
      
      // Store client's session key for this session
      this.clientSessionKeys.set(sessionId, clientSessionKey);
      
      // Process with the underlying chatbot service
      const response = await this.chatbotService.chat(
        decryptedMessage,
        request.userId,
        sessionId,
      );

      // Store encrypted conversation history
      this.storeEncryptedMessage(sessionId, 'user', decryptedMessage);
      if (response.data?.message) {
        this.storeEncryptedMessage(sessionId, 'assistant', response.data.message);
      }

      // Encrypt the response using client's session key (so they can decrypt it)
      const encryptedResponse = this.encryptionService.encryptForClient(
        response.data?.message || '',
        clientSessionKey,
      );

      // Return encrypted response without plaintext message
      return {
        success: response.success,
        sessionId: response.sessionId,
        userId: response.userId,
        data: response.data ? {
          intent: response.data.intent,
          confidence: response.data.confidence,
          predictions: response.data.predictions,
          requiresEscalation: response.data.requiresEscalation,
          escalationReason: response.data.escalationReason,
          timestamp: response.data.timestamp,
          // Omit plaintext message for security
        } : undefined,
        encryptedData: {
          ciphertext: encryptedResponse.ciphertext,
          iv: encryptedResponse.iv,
          tag: encryptedResponse.tag,
        },
        isEncrypted: true,
      };
    } catch (error) {
      this.logger.error(`Failed to process encrypted message: ${error.message}`);
      return {
        success: false,
        error: 'Failed to decrypt and process message',
        isEncrypted: false,
      };
    }
  }

  /**
   * Process regular (unencrypted) message but encrypt for storage
   */
  async chat(
    message: string,
    userId?: string,
    sessionId?: string,
  ): Promise<ChatbotResponse> {
    const effectiveSessionId = sessionId || this.encryptionService.generateSessionId();
    
    // Process with the underlying chatbot service
    const response = await this.chatbotService.chat(message, userId, effectiveSessionId);

    // Store encrypted conversation history
    this.storeEncryptedMessage(effectiveSessionId, 'user', message);
    if (response.data?.message) {
      this.storeEncryptedMessage(effectiveSessionId, 'assistant', response.data.message);
    }

    return response;
  }

  /**
   * Store encrypted message in conversation history
   */
  private storeEncryptedMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    message: string,
  ): void {
    // Encrypt the message for storage
    const encryptedMessage = this.encryptionService.encryptChatbotMessage(
      JSON.stringify({
        role,
        content: message,
        timestamp: new Date().toISOString(),
      }),
    );

    // Get or create conversation
    if (!this.encryptedConversations.has(sessionId)) {
      this.encryptedConversations.set(sessionId, {
        sessionId,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      });
    }

    const conversation = this.encryptedConversations.get(sessionId)!;
    conversation.messages.push(encryptedMessage);
    conversation.lastActivity = new Date();

    // Limit stored messages
    if (conversation.messages.length > 100) {
      conversation.messages.shift();
    }
  }

  /**
   * Get decrypted conversation history
   */
  getConversationHistory(sessionId: string): ChatMessage[] {
    const conversation = this.encryptedConversations.get(sessionId);
    if (!conversation) {
      return [];
    }

    const messages: ChatMessage[] = [];
    for (const encryptedMessage of conversation.messages) {
      try {
        const decrypted = this.encryptionService.decryptChatbotMessage(encryptedMessage);
        const parsed = JSON.parse(decrypted);
        messages.push({
          role: parsed.role,
          content: parsed.content,
          timestamp: new Date(parsed.timestamp),
        });
      } catch (error) {
        this.logger.error(`Failed to decrypt message: ${error.message}`);
      }
    }

    return messages;
  }

  /**
   * Get encrypted conversation history (for secure export)
   */
  getEncryptedHistory(sessionId: string): EncryptedData[] {
    const conversation = this.encryptedConversations.get(sessionId);
    return conversation?.messages || [];
  }

  /**
   * Clear conversation history (securely)
   */
  clearHistory(sessionId: string): void {
    this.encryptedConversations.delete(sessionId);
    this.clientSessionKeys.delete(sessionId);
  }

  /**
   * Export conversation for storage (encrypted)
   */
  exportConversation(sessionId: string): string | null {
    const conversation = this.encryptedConversations.get(sessionId);
    if (!conversation) {
      return null;
    }

    // Double-encrypt for export
    return this.encryptionService.encryptForStorage(
      JSON.stringify(conversation),
      this.keyType,
    );
  }

  /**
   * Import conversation from storage
   */
  importConversation(encryptedConversation: string, sessionId: string): boolean {
    try {
      const decrypted = this.encryptionService.decryptFromStorage(encryptedConversation);
      const conversation: EncryptedConversation = JSON.parse(decrypted);
      conversation.sessionId = sessionId;
      this.encryptedConversations.set(sessionId, conversation);
      return true;
    } catch (error) {
      this.logger.error(`Failed to import conversation: ${error.message}`);
      return false;
    }
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
}
