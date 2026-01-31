import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AIChatbotService } from './ai-chatbot.service';
import { EncryptedChatbotService } from './encrypted-chatbot.service';
import { AIChatbotController } from './ai-chatbot.controller';
import { EncryptionModule } from '../common/encryption';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    EncryptionModule,
  ],
  controllers: [AIChatbotController],
  providers: [AIChatbotService, EncryptedChatbotService],
  exports: [AIChatbotService, EncryptedChatbotService],
})
export class AIChatbotModule {}
