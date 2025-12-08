import { Injectable, OnModuleInit } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';

@Injectable()
export class DeadlineReminderService implements OnModuleInit {
  private intervalHandle: NodeJS.Timeout;

  constructor(private readonly recruitmentService: RecruitmentService) {}

  onModuleInit() {
    // Run daily at 9 AM
    this.scheduleDailyReminders();
  }

  private scheduleDailyReminders() {
    // Calculate time until next 9 AM
    const now = new Date();
    const next9AM = new Date(now);
    next9AM.setHours(9, 0, 0, 0);
    
    if (next9AM <= now) {
      next9AM.setDate(next9AM.getDate() + 1);
    }

    const msUntilNext9AM = next9AM.getTime() - now.getTime();

    // Schedule first run
    setTimeout(() => {
      this.sendReminders();
      // Then run daily
      this.intervalHandle = setInterval(() => {
        this.sendReminders();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilNext9AM);
  }

  private async sendReminders() {
    try {
      console.log('[DeadlineReminderService] Sending onboarding task deadline reminders...');
      const result = await this.recruitmentService.sendTaskDeadlineReminders();
      console.log(`[DeadlineReminderService] Sent ${result.sent} reminders, ${result.errors} errors`);
    } catch (error) {
      console.error('[DeadlineReminderService] Error sending reminders:', error);
    }
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }
}
