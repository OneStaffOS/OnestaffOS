/**
 * Encryption Module
 * 
 * Provides encryption services for the application.
 * Import this module in any feature module that needs encryption.
 */

import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EncryptionService } from './encryption.service';
import { EncryptionSchedulerService } from './encryption-scheduler.service';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [EncryptionService, EncryptionSchedulerService],
  exports: [EncryptionService, EncryptionSchedulerService],
})
export class EncryptionModule {}
