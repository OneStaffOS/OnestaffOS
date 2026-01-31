import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { AxiosResponse } from 'axios';

export interface ChatbotResponse {
  success: boolean;
  data?: {
    message: string;
    intent: string;
    confidence: number;
    predictions: Array<{ intent: string; confidence: number }>;
    requiresEscalation: boolean;
    escalationReason?: string;
    timestamp: string;
  };
  error?: string;
  sessionId?: string;
  userId?: string;
}

export interface PredictionResponse {
  success: boolean;
  data?: {
    intent: string;
    confidence: number;
    predictions: Array<{ intent: string; confidence: number }>;
  };
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  confidence?: number;
}

@Injectable()
export class AIChatbotService {
  private readonly logger = new Logger(AIChatbotService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs = 30000; // 30 second timeout

  // In-memory conversation history (in production, use Redis or DB)
  private conversations: Map<string, ChatMessage[]> = new Map();

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.CHATBOT_API_URL || 'http://localhost:5050';
    this.logger.log(`AI Chatbot Service initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Send a message to the AI chatbot and get a response
   */
  async chat(
    message: string,
    userId?: string,
    sessionId?: string,
  ): Promise<ChatbotResponse> {
    const effectiveSessionId = sessionId || userId || 'anonymous';

    try {
      this.logger.debug(`Processing message for session ${effectiveSessionId}: "${message.substring(0, 50)}..."`);

      const response: AxiosResponse<ChatbotResponse> = await firstValueFrom(
        this.httpService
          .post<ChatbotResponse>(`${this.baseUrl}/api/chatbot/message`, {
            message,
            userId,
            sessionId: effectiveSessionId,
          })
          .pipe(
            timeout(this.timeoutMs),
            catchError((error) => {
              this.logger.error(`Chatbot API error: ${error.message}`);
              throw new HttpException(
                'Chatbot service temporarily unavailable',
                HttpStatus.SERVICE_UNAVAILABLE,
              );
            }),
          ),
      );

      // Store conversation history
      if (response.data.success && response.data.data) {
        this.addToHistory(effectiveSessionId, {
          role: 'user',
          content: message,
          timestamp: new Date(),
        });
        this.addToHistory(effectiveSessionId, {
          role: 'assistant',
          content: response.data.data.message,
          timestamp: new Date(),
          intent: response.data.data.intent,
          confidence: response.data.data.confidence,
        });
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to process chat message: ${error.message}`);
      
      // Return fallback response
      return {
        success: false,
        error: 'Unable to process your request at this time. Please try again later.',
        data: {
          message: "I'm sorry, but I'm temporarily unavailable. Please try again in a moment or contact support directly.",
          intent: 'fallback',
          confidence: 0,
          predictions: [],
          requiresEscalation: true,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Predict intent for ticket classification
   */
  async predictIntent(message: string): Promise<PredictionResponse> {
    try {
      const response: AxiosResponse<PredictionResponse> = await firstValueFrom(
        this.httpService
          .post<PredictionResponse>(`${this.baseUrl}/api/chatbot/predict`, {
            message,
          })
          .pipe(
            timeout(this.timeoutMs),
            catchError((error) => {
              this.logger.error(`Prediction API error: ${error.message}`);
              throw new HttpException(
                'Intent prediction service unavailable',
                HttpStatus.SERVICE_UNAVAILABLE,
              );
            }),
          ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to predict intent: ${error.message}`);
      return {
        success: false,
        error: 'Unable to predict intent',
      };
    }
  }

  /**
   * Get available intents
   */
  async getIntents(): Promise<string[]> {
    try {
      const response: AxiosResponse<{ success: boolean; data: { intents: string[] } }> = await firstValueFrom(
        this.httpService
          .get<{ success: boolean; data: { intents: string[] } }>(
            `${this.baseUrl}/api/chatbot/intents`,
          )
          .pipe(
            timeout(10000),
            catchError((error) => {
              this.logger.error(`Get intents error: ${error.message}`);
              throw error;
            }),
          ),
      );

      return response.data.success ? response.data.data.intents : [];
    } catch (error) {
      this.logger.error(`Failed to get intents: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if chatbot service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response: AxiosResponse<{ status: string }> = await firstValueFrom(
        this.httpService
          .get<{ status: string }>(`${this.baseUrl}/health`)
          .pipe(timeout(5000)),
      );
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): ChatMessage[] {
    return this.conversations.get(sessionId) || [];
  }

  /**
   * Clear conversation history for a session
   */
  clearHistory(sessionId: string): void {
    this.conversations.delete(sessionId);
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(sessionId: string, message: ChatMessage): void {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }
    
    const history = this.conversations.get(sessionId)!;
    history.push(message);
    
    // Keep only last 50 messages per session
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Map chatbot intent to ticket category
   */
  mapIntentToCategory(intent: string): string {
    const categoryMapping: Record<string, string> = {
      // Account & Access
      password_reset: 'Account & Access',
      login_issues: 'Account & Access',
      mfa_setup: 'Account & Access',
      account_unlock: 'Account & Access',
      
      // Network
      vpn_connection: 'Network',
      wifi_issues: 'Network',
      network_connectivity: 'Network',
      firewall_issues: 'Network',
      
      // Hardware
      laptop_issues: 'Hardware',
      printer_issues: 'Hardware',
      monitor_display: 'Hardware',
      keyboard_mouse: 'Hardware',
      
      // Software
      software_installation: 'Software',
      browser_issues: 'Software',
      email_issues: 'Software',
      office_365: 'Software',
      teams_issues: 'Software',
      video_conferencing: 'Software',
      calendar_sync: 'Software',
      mobile_email: 'Software',
      update_issues: 'Software',
      
      // Security
      security_virus: 'Security',
      security_phishing: 'Security',
      security_password_policy: 'Security',
      
      // HR
      hr_leave_request: 'HR',
      hr_payroll: 'HR',
      hr_benefits: 'HR',
      performance_review: 'HR',
      new_employee: 'HR',
      
      // General
      equipment_request: 'Equipment',
      data_transfer: 'Data',
      backup_recovery: 'Data',
      remote_work: 'Remote Work',
      system_slow: 'Performance',
      admin_rights: 'Access',
      
      // Tickets
      create_ticket: 'General',
      ticket_status: 'General',
    };

    return categoryMapping[intent] || 'General';
  }

  /**
   * Map chatbot intent to ticket priority
   */
  mapIntentToPriority(intent: string, confidence: number): 'low' | 'medium' | 'high' | 'urgent' {
    // High priority intents
    const urgentIntents = ['security_virus', 'security_phishing', 'account_unlock'];
    const highIntents = ['vpn_connection', 'login_issues', 'system_slow', 'network_connectivity'];
    
    if (urgentIntents.includes(intent)) {
      return 'urgent';
    }
    
    if (highIntents.includes(intent)) {
      return 'high';
    }
    
    // If low confidence, escalate priority
    if (confidence < 0.5) {
      return 'high';
    }
    
    if (confidence < 0.7) {
      return 'medium';
    }
    
    return 'low';
  }
}
