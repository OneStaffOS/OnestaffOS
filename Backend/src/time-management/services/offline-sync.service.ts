/**
 * BR-TM-13: Attendance device offline sync mechanism
 * 
 * Handles synchronization of attendance data from devices that may go offline
 * Implements queuing, deduplication, and automatic retry logic
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceRecord, AttendanceRecordDocument } from '../models/attendance-record.schema';
import { PunchType } from '../models/enums/index';

export interface OfflinePunchData {
  employeeId: string;
  employeeNumber?: string;
  type: PunchType;
  time: Date;
  location?: string;
  terminalId?: string;
  deviceId?: string;
  deviceTimestamp?: string; // Device-side timestamp for deduplication
  syncAttempts?: number;
}

@Injectable()
export class OfflineSyncService {
  private readonly logger = new Logger(OfflineSyncService.name);
  private syncQueue: Map<string, OfflinePunchData[]> = new Map();
  private readonly MAX_SYNC_ATTEMPTS = 5;
  private readonly SYNC_INTERVAL_MS = 60000; // 1 minute
  private syncIntervalHandle: any;

  constructor(
    @InjectModel(AttendanceRecord.name)
    private attendanceRecordModel: Model<AttendanceRecordDocument>,
  ) {
    this.startAutoSync();
  }

  /**
   * BR-TM-13: Queue punch data from offline device
   * Devices can submit data to this queue when they reconnect
   */
  queueOfflinePunch(deviceId: string, punchData: OfflinePunchData): void {
    if (!this.syncQueue.has(deviceId)) {
      this.syncQueue.set(deviceId, []);
    }

    const queue = this.syncQueue.get(deviceId)!;
    
    // Check for duplicates using deviceTimestamp
    const isDuplicate = queue.some(
      existing =>
        existing.employeeId === punchData.employeeId &&
        existing.deviceTimestamp === punchData.deviceTimestamp &&
        existing.type === punchData.type
    );

    if (!isDuplicate) {
      punchData.syncAttempts = 0;
      queue.push(punchData);
      this.logger.log(`Queued offline punch for device ${deviceId}. Queue size: ${queue.length}`);
    } else {
      this.logger.warn(`Duplicate punch detected for device ${deviceId}, skipping`);
    }
  }

  /**
   * BR-TM-13: Bulk queue punches from reconnected device
   */
  queueBulkOfflinePunches(deviceId: string, punches: OfflinePunchData[]): void {
    punches.forEach(punch => this.queueOfflinePunch(deviceId, punch));
    this.logger.log(`Bulk queued ${punches.length} punches from device ${deviceId}`);
  }

  /**
   * BR-TM-13: Process sync queue automatically
   * Attempts to sync queued punches to database
   */
  async processSyncQueue(): Promise<void> {
    if (this.syncQueue.size === 0) {
      return;
    }

    this.logger.log(`Processing sync queue. Devices: ${this.syncQueue.size}`);

    for (const [deviceId, queue] of this.syncQueue.entries()) {
      if (queue.length === 0) continue;

      const processedIndices: number[] = [];

      for (let i = 0; i < queue.length; i++) {
        const punchData = queue[i];

        try {
          await this.syncPunchToDatabase(punchData);
          processedIndices.push(i);
          this.logger.log(
            `Synced offline punch: Employee ${punchData.employeeId}, Type ${punchData.type}, Device ${deviceId}`
          );
        } catch (error) {
          punchData.syncAttempts = (punchData.syncAttempts || 0) + 1;
          
          if (punchData.syncAttempts >= this.MAX_SYNC_ATTEMPTS) {
            this.logger.error(
              `Max sync attempts reached for punch: Employee ${punchData.employeeId}, Device ${deviceId}. Removing from queue.`,
              error
            );
            processedIndices.push(i); // Remove after max attempts
          } else {
            this.logger.warn(
              `Sync attempt ${punchData.syncAttempts}/${this.MAX_SYNC_ATTEMPTS} failed for Employee ${punchData.employeeId}`,
              error.message
            );
          }
        }
      }

      // Remove successfully processed punches from queue
      if (processedIndices.length > 0) {
        const remainingQueue = queue.filter((_, index) => !processedIndices.includes(index));
        this.syncQueue.set(deviceId, remainingQueue);
        this.logger.log(
          `Device ${deviceId}: Processed ${processedIndices.length} punches. Remaining: ${remainingQueue.length}`
        );
      }
    }

    // Clean up empty device queues
    for (const [deviceId, queue] of this.syncQueue.entries()) {
      if (queue.length === 0) {
        this.syncQueue.delete(deviceId);
      }
    }
  }

  /**
   * Sync a single punch to the database
   */
  private async syncPunchToDatabase(punchData: OfflinePunchData): Promise<void> {
    const punchTime = new Date(punchData.time);
    const punchDateStart = new Date(punchTime);
    punchDateStart.setHours(0, 0, 0, 0);
    const punchDateEnd = new Date(punchDateStart);
    punchDateEnd.setDate(punchDateEnd.getDate() + 1);

    // Find or create attendance record
    let attendanceRecord = await this.attendanceRecordModel
      .findOne({
        employeeId: punchData.employeeId,
        'punches.time': { $gte: punchDateStart, $lt: punchDateEnd },
      })
      .exec();

    if (!attendanceRecord) {
      attendanceRecord = new this.attendanceRecordModel({
        employeeId: punchData.employeeId,
        punches: [],
        totalWorkMinutes: 0,
        hasMissedPunch: true,
        exceptionIds: [],
        finalisedForPayroll: true,
      });
    }

    // Check for duplicates in existing punches
    const isDuplicate = attendanceRecord.punches.some(
      p =>
        Math.abs(new Date(p.time).getTime() - punchTime.getTime()) < 1000 &&
        p.type === punchData.type
    );

    if (!isDuplicate) {
      attendanceRecord.punches.push({
        type: punchData.type,
        time: punchTime,
      });

      // Sort punches by time
      attendanceRecord.punches.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      await attendanceRecord.save();
    } else {
      this.logger.warn(`Duplicate punch already in database, skipping sync`);
    }
  }

  /**
   * Start automatic sync process
   */
  private startAutoSync(): void {
    this.syncIntervalHandle = setInterval(() => {
      this.processSyncQueue().catch(error => {
        this.logger.error('Auto sync failed', error);
      });
    }, this.SYNC_INTERVAL_MS);

    this.logger.log(`Offline sync service started. Sync interval: ${this.SYNC_INTERVAL_MS}ms`);
  }

  /**
   * Stop automatic sync (for cleanup)
   */
  stopAutoSync(): void {
    if (this.syncIntervalHandle) {
      clearInterval(this.syncIntervalHandle);
      this.logger.log('Offline sync service stopped');
    }
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): { deviceId: string; queueSize: number; oldestPunch?: Date }[] {
    const status: { deviceId: string; queueSize: number; oldestPunch?: Date }[] = [];

    for (const [deviceId, queue] of this.syncQueue.entries()) {
      const oldestPunch = queue.length > 0 ? new Date(queue[0].time) : undefined;
      status.push({
        deviceId,
        queueSize: queue.length,
        oldestPunch,
      });
    }

    return status;
  }

  /**
   * Manually trigger sync for a specific device
   */
  async syncDevice(deviceId: string): Promise<{ synced: number; failed: number }> {
    const queue = this.syncQueue.get(deviceId);
    if (!queue || queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    const initialSize = queue.length;
    await this.processSyncQueue();
    const remainingSize = this.syncQueue.get(deviceId)?.length || 0;

    return {
      synced: initialSize - remainingSize,
      failed: remainingSize,
    };
  }

  /**
   * Clear queue for a device (admin function)
   */
  clearDeviceQueue(deviceId: string): number {
    const queue = this.syncQueue.get(deviceId);
    const size = queue?.length || 0;
    this.syncQueue.delete(deviceId);
    this.logger.log(`Cleared queue for device ${deviceId}. Removed ${size} items`);
    return size;
  }
}
