/**
 * Encryption Key Scheduler Service
 * 
 * Handles automated key rotation and validation on a schedule.
 * Runs validation every 24 hours and logs key health status.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EncryptionService } from './encryption.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EncryptionSchedulerService {
  private readonly logger = new Logger(EncryptionSchedulerService.name);
  private readonly keysPath = path.join(process.cwd(), '.encryption-keys');

  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Validate encryption keys every 24 hours
   * Runs at 2:00 AM daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'validate-encryption-keys',
    timeZone: 'UTC',
  })
  async validateKeys(): Promise<void> {
    this.logger.log('🔍 Starting scheduled encryption key validation...');

    try {
      const validationResults = {
        aiChatbot: this.validateKeySet('ai_chatbot'),
        liveChat: this.validateKeySet('live_chat'),
      };

      // Log results
      if (validationResults.aiChatbot.valid && validationResults.liveChat.valid) {
        this.logger.log('✅ All encryption keys validated successfully');
        this.logger.log(`AI Chatbot keys age: ${validationResults.aiChatbot.ageDays} days`);
        this.logger.log(`Live Chat keys age: ${validationResults.liveChat.ageDays} days`);
      } else {
        this.logger.warn('⚠️ Key validation found issues:');
        if (!validationResults.aiChatbot.valid) {
          this.logger.error(`AI Chatbot keys: ${validationResults.aiChatbot.error}`);
        }
        if (!validationResults.liveChat.valid) {
          this.logger.error(`Live Chat keys: ${validationResults.liveChat.error}`);
        }
      }

      // Check if rotation is needed (keys older than 90 days)
      if (validationResults.aiChatbot.ageDays > 90) {
        this.logger.warn(`⚠️ AI Chatbot keys are ${validationResults.aiChatbot.ageDays} days old. Consider rotating.`);
      }
      if (validationResults.liveChat.ageDays > 90) {
        this.logger.warn(`⚠️ Live Chat keys are ${validationResults.liveChat.ageDays} days old. Consider rotating.`);
      }

      // Log next validation time
      this.logger.log('📅 Next validation scheduled for: tomorrow at 2:00 AM UTC');
    } catch (error) {
      this.logger.error(`❌ Key validation failed: ${error.message}`);
    }
  }

  /**
   * Validate a specific key set
   */
  private validateKeySet(keyType: 'ai_chatbot' | 'live_chat'): {
    valid: boolean;
    ageDays: number;
    error?: string;
  } {
    try {
      const aesKeyPath = path.join(this.keysPath, `${keyType}_aes.key`);
      const rsaPublicPath = path.join(this.keysPath, `${keyType}_rsa_public.pem`);
      const rsaPrivatePath = path.join(this.keysPath, `${keyType}_rsa_private.pem`);
      const metadataPath = path.join(this.keysPath, `${keyType}_metadata.json`);

      // Check if all key files exist
      if (!fs.existsSync(aesKeyPath)) {
        return { valid: false, ageDays: 0, error: 'AES key file missing' };
      }
      if (!fs.existsSync(rsaPublicPath)) {
        return { valid: false, ageDays: 0, error: 'RSA public key file missing' };
      }
      if (!fs.existsSync(rsaPrivatePath)) {
        return { valid: false, ageDays: 0, error: 'RSA private key file missing' };
      }

      // Check file permissions (should be 0600)
      const aesStats = fs.statSync(aesKeyPath);
      const mode = (aesStats.mode & parseInt('777', 8)).toString(8);
      if (mode !== '600') {
        this.logger.warn(`⚠️ ${keyType} AES key has insecure permissions: ${mode}, should be 600`);
      }

      // Check key age
      let ageDays = 0;
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const createdAt = new Date(metadata.createdAt);
        const now = new Date();
        ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Verify AES key length
      const aesKey = fs.readFileSync(aesKeyPath);
      if (aesKey.length !== 32) {
        return { valid: false, ageDays, error: `Invalid AES key length: ${aesKey.length} bytes (expected 32)` };
      }

      // Verify RSA keys can be read
      const publicKey = fs.readFileSync(rsaPublicPath, 'utf8');
      const privateKey = fs.readFileSync(rsaPrivatePath, 'utf8');
      
      if (!publicKey.includes('BEGIN PUBLIC KEY')) {
        return { valid: false, ageDays, error: 'Invalid RSA public key format' };
      }
      if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        return { valid: false, ageDays, error: 'Invalid RSA private key format' };
      }

      return { valid: true, ageDays };
    } catch (error) {
      return { valid: false, ageDays: 0, error: error.message };
    }
  }

  /**
   * Manual trigger for key validation (for testing or admin use)
   */
  async triggerValidation(): Promise<void> {
    this.logger.log('🔄 Manual key validation triggered');
    await this.validateKeys();
  }

  /**
   * Get next scheduled validation time
   */
  getNextValidationTime(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(2, 0, 0, 0);
    return tomorrow.toISOString();
  }
}
