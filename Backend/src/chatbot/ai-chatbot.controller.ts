import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AIChatbotService, ChatbotResponse, PredictionResponse } from './ai-chatbot.service';
import { EncryptedChatbotService, EncryptedChatResponse } from './encrypted-chatbot.service';
import { EncryptionSchedulerService } from '../common/encryption/encryption-scheduler.service';
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { ChatMessageDto } from './dto/chat-message.dto';
import { PredictIntentDto } from './dto/predict-intent.dto';
import { EncryptedChatMessageDto } from './dto/encrypted-chat-message.dto';

const ALL_ROLES: Role[] = [
  Role.DEPARTMENT_EMPLOYEE,
  Role.DEPARTMENT_HEAD,
  Role.HR_MANAGER,
  Role.HR_EMPLOYEE,
  Role.PAYROLL_SPECIALIST,
  Role.PAYROLL_MANAGER,
  Role.SYSTEM_ADMIN,
  Role.LEGAL_POLICY_ADMIN,
  Role.RECRUITER,
  Role.FINANCE_STAFF,
  Role.JOB_CANDIDATE,
  Role.HR_ADMIN,
  Role.NEW_HIRE,
  Role.CLIENT
];

@Controller('ai-chatbot')
@UseGuards(AuthGuard, authorizationGaurd)
export class AIChatbotController {
  constructor(
    private readonly chatbotService: AIChatbotService,
    private readonly encryptedChatbotService: EncryptedChatbotService,
    private readonly encryptionSchedulerService: EncryptionSchedulerService,
  ) {}

  /**
   * Send a message to the AI chatbot (requires authentication)
  */
  @Post('chat')
  @Roles(...ALL_ROLES)
  async chat(
    @Body() dto: ChatMessageDto,
    @Req() req: any,
  ): Promise<ChatbotResponse> {
    if (!dto.message || dto.message.trim().length === 0) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    const userId = req.user?.sub;
    return this.chatbotService.chat(dto.message.trim(), userId, dto.sessionId);
  }

  /**
   * Send a message to the AI chatbot (public endpoint for quick help)
   */
  @Post('quick-help')
  @Roles(...ALL_ROLES)
  async quickHelp(@Body() dto: ChatMessageDto): Promise<ChatbotResponse> {
    if (!dto.message || dto.message.trim().length === 0) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    return this.chatbotService.chat(dto.message.trim(), undefined, dto.sessionId);
  }

  /**
   * Predict intent for a message (useful for ticket auto-categorization)
  */
  @Post('predict')
  @Roles(...ALL_ROLES)
  async predictIntent(@Body() dto: PredictIntentDto): Promise<PredictionResponse> {
    if (!dto.message || dto.message.trim().length === 0) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    return this.chatbotService.predictIntent(dto.message.trim());
  }

  /**
   * Get conversation history for current user
   */
  @Get('history')
  @Roles(...ALL_ROLES)
  async getHistory(@Req() req: any, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.sub;
    const effectiveSessionId = sessionId || userId;
    
    return {
      success: true,
      data: {
        messages: this.chatbotService.getConversationHistory(effectiveSessionId),
        sessionId: effectiveSessionId,
      },
    };
  }

  /**
   * Clear conversation history for current user
   */
  @Post('clear-history')
  @Roles(...ALL_ROLES)
  async clearHistory(@Req() req: any, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.sub;
    const effectiveSessionId = sessionId || userId;
    
    this.chatbotService.clearHistory(effectiveSessionId);
    
    return {
      success: true,
      message: 'Conversation history cleared',
    };
  }

  /**
   * Get list of intents the chatbot can handle
   */
  @Get('intents')
  @Roles(...ALL_ROLES)
  async getIntents() {
    const intents = await this.chatbotService.getIntents();
    return {
      success: true,
      data: { intents, count: intents.length },
    };
  }

  /**
   * Health check for chatbot service
   */
  @Get('health')
  @Roles(...ALL_ROLES)
  async healthCheck() {
    const isHealthy = await this.chatbotService.isHealthy();
    
    return {
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'ai-chatbot',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get suggested responses/quick actions based on intent
   */
  @Post('suggestions')
  @Roles(...ALL_ROLES)
  async getSuggestions(@Body() dto: PredictIntentDto) {
    if (!dto.message || dto.message.trim().length === 0) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    const prediction = await this.chatbotService.predictIntent(dto.message.trim());
    
    if (!prediction.success || !prediction.data) {
      return {
        success: false,
        suggestions: [],
      };
    }

    const intent = prediction.data.intent;
    const suggestions = this.getIntentSuggestions(intent);

    return {
      success: true,
      data: {
        intent,
        confidence: prediction.data.confidence,
        suggestions,
        category: this.chatbotService.mapIntentToCategory(intent),
        priority: this.chatbotService.mapIntentToPriority(intent, prediction.data.confidence),
      },
    };
  }

  private getIntentSuggestions(intent: string): string[] {
    const suggestions: Record<string, string[]> = {
      password_reset: [
        'Reset my password',
        'Show password requirements',
        'Create a ticket for password help',
      ],
      login_issues: [
        'Troubleshoot login problems',
        'Clear browser cache',
        'Check account status',
      ],
      vpn_connection: [
        'VPN setup guide',
        'Test VPN connection',
        'Contact network team',
      ],
      laptop_issues: [
        'Run diagnostics',
        'Request hardware support',
        'Schedule repair',
      ],
      software_installation: [
        'View approved software list',
        'Request software installation',
        'Self-service software center',
      ],
      email_issues: [
        'Check email settings',
        'Test email connection',
        'Contact email support',
      ],
      security_virus: [
        'Run antivirus scan',
        'Report security incident',
        'View security guidelines',
      ],
    };

    return suggestions[intent] || [
      'Create a support ticket',
      'View knowledge base',
      'Contact IT support',
    ];
  }

  // ==========================================
  // Encrypted Chat Endpoints
  // ==========================================

  /**
   * Get server's public key for client-side encryption
   */
  @Get('encryption/public-key')
  @Roles(...ALL_ROLES)
  async getEncryptionPublicKey() {
    const keyInfo = this.encryptedChatbotService.getPublicKey();
    return {
      success: true,
      data: keyInfo,
    };
  }

  /**
   * Get encryption info
   */
  @Get('encryption/info')
  @Roles(...ALL_ROLES)
  async getEncryptionInfo() {
    const info = this.encryptedChatbotService.getEncryptionInfo();
    return {
      success: true,
      data: info,
    };
  }

  /**
   * Send encrypted message (authenticated)
   */
  @Post('chat/encrypted')
  @Roles(...ALL_ROLES)
  async encryptedChat(
    @Body() dto: EncryptedChatMessageDto,
    @Req() req: any,
  ): Promise<EncryptedChatResponse> {
    const userId = req.user?.sub;
    
    return this.encryptedChatbotService.processEncryptedMessage({
      encryptedMessage: dto.encryptedMessage,
      encryptedSessionKey: dto.encryptedSessionKey,
      sessionId: dto.sessionId,
      userId,
    });
  }

  /**
   * Send encrypted message (public quick help)
   */
  @Post('quick-help/encrypted')
  @Roles(...ALL_ROLES)
  async encryptedQuickHelp(
    @Body() dto: EncryptedChatMessageDto,
  ): Promise<EncryptedChatResponse> {
    return this.encryptedChatbotService.processEncryptedMessage({
      encryptedMessage: dto.encryptedMessage,
      encryptedSessionKey: dto.encryptedSessionKey,
      sessionId: dto.sessionId,
    });
  }

  /**
   * Get encrypted conversation history
   */
  @Get('history/encrypted')
  @Roles(...ALL_ROLES)
  async getEncryptedHistory(@Req() req: any, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.sub;
    const effectiveSessionId = sessionId || userId;
    
    // Get decrypted history (server can read it)
    const messages = this.encryptedChatbotService.getConversationHistory(effectiveSessionId);
    
    return {
      success: true,
      data: {
        messages,
        sessionId: effectiveSessionId,
        isEncryptedAtRest: true,
      },
    };
  }

  /**
   * Manually trigger encryption key validation
   */
  @Post('encryption/validate')
  @Roles(...ALL_ROLES)
  async validateEncryptionKeys() {
    await this.encryptionSchedulerService.triggerValidation();
    return {
      success: true,
      message: 'Key validation completed. Check server logs for results.',
      nextScheduledValidation: this.encryptionSchedulerService.getNextValidationTime(),
    };
  }

  /**
   * Export encrypted conversation (for backup/transfer)
   */
  @Get('history/export')
  @Roles(...ALL_ROLES)
  async exportHistory(@Req() req: any, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.sub;
    const effectiveSessionId = sessionId || userId;
    
    const exportedData = this.encryptedChatbotService.exportConversation(effectiveSessionId);
    
    if (!exportedData) {
      return {
        success: false,
        error: 'No conversation found',
      };
    }

    return {
      success: true,
      data: {
        encryptedConversation: exportedData,
        sessionId: effectiveSessionId,
        exportedAt: new Date().toISOString(),
      },
    };
  }
}
