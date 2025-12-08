/**
 * BR-TM-25: Data backup and retention policy service
 * 
 * Implements continuous backup of time management data with configurable retention
 * Handles attendance records, shift assignments, corrections, and exceptions
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceRecord, AttendanceRecordDocument } from '../models/attendance-record.schema';
import { ShiftAssignment, ShiftAssignmentDocument } from '../models/shift-assignment.schema';
import { AttendanceCorrectionRequest, AttendanceCorrectionRequestDocument } from '../models/attendance-correction-request.schema';
import { TimeException, TimeExceptionDocument } from '../models/time-exception.schema';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface BackupConfig {
  enabled: boolean;
  retentionDays: number;
  backupPath: string;
  includeAttendance: boolean;
  includeShiftAssignments: boolean;
  includeCorrections: boolean;
  includeExceptions: boolean;
}

export interface BackupMetadata {
  timestamp: Date;
  recordCount: number;
  collections: string[];
  size: number;
  checksum?: string;
}

@Injectable()
export class BackupRetentionService {
  private readonly logger = new Logger(BackupRetentionService.name);
  private config: BackupConfig;

  constructor(
    @InjectModel(AttendanceRecord.name)
    private attendanceRecordModel: Model<AttendanceRecordDocument>,
    @InjectModel(ShiftAssignment.name)
    private shiftAssignmentModel: Model<ShiftAssignmentDocument>,
    @InjectModel(AttendanceCorrectionRequest.name)
    private correctionRequestModel: Model<AttendanceCorrectionRequestDocument>,
    @InjectModel(TimeException.name)
    private timeExceptionModel: Model<TimeExceptionDocument>,
  ) {
    this.config = this.loadConfig();
    this.ensureBackupDirectory();
  }

  /**
   * Load backup configuration from environment or defaults
   */
  private loadConfig(): BackupConfig {
    return {
      enabled: process.env.BACKUP_ENABLED !== 'false',
      retentionDays: Number(process.env.BACKUP_RETENTION_DAYS) || 90,
      backupPath: process.env.BACKUP_PATH || path.join(os.homedir(), '.time-management-backups'),
      includeAttendance: true,
      includeShiftAssignments: true,
      includeCorrections: true,
      includeExceptions: true,
    };
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupPath)) {
      fs.mkdirSync(this.config.backupPath, { recursive: true });
      this.logger.log(`Created backup directory: ${this.config.backupPath}`);
    }
  }

  /**
   * BR-TM-25: Daily backup scheduled at 2 AM
   * Uses cron job for automatic execution
   */
  @Cron('0 2 * * *', {
    name: 'daily-time-management-backup',
  })
  async performScheduledBackup(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.log('Backup is disabled in configuration');
      return;
    }

    try {
      await this.createBackup();
      await this.cleanupOldBackups();
      this.logger.log('Scheduled backup completed successfully');
    } catch (error) {
      this.logger.error('Scheduled backup failed', error);
    }
  }

  /**
   * Create a full backup of time management data
   */
  async createBackup(): Promise<BackupMetadata> {
    const timestamp = new Date();
    const backupId = this.generateBackupId(timestamp);
    const backupDir = path.join(this.config.backupPath, backupId);

    fs.mkdirSync(backupDir, { recursive: true });

    const metadata: BackupMetadata = {
      timestamp,
      recordCount: 0,
      collections: [],
      size: 0,
    };

    try {
      // Backup attendance records
      if (this.config.includeAttendance) {
        const attendanceCount = await this.backupCollection(
          this.attendanceRecordModel,
          'attendance_records',
          backupDir
        );
        metadata.recordCount += attendanceCount;
        metadata.collections.push('attendance_records');
      }

      // Backup shift assignments
      if (this.config.includeShiftAssignments) {
        const shiftCount = await this.backupCollection(
          this.shiftAssignmentModel,
          'shift_assignments',
          backupDir
        );
        metadata.recordCount += shiftCount;
        metadata.collections.push('shift_assignments');
      }

      // Backup correction requests
      if (this.config.includeCorrections) {
        const correctionCount = await this.backupCollection(
          this.correctionRequestModel,
          'correction_requests',
          backupDir
        );
        metadata.recordCount += correctionCount;
        metadata.collections.push('correction_requests');
      }

      // Backup time exceptions
      if (this.config.includeExceptions) {
        const exceptionCount = await this.backupCollection(
          this.timeExceptionModel,
          'time_exceptions',
          backupDir
        );
        metadata.recordCount += exceptionCount;
        metadata.collections.push('time_exceptions');
      }

      // Calculate backup size
      metadata.size = this.calculateDirectorySize(backupDir);

      // Write metadata file
      const metadataPath = path.join(backupDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      this.logger.log(
        `Backup created: ${backupId}, Records: ${metadata.recordCount}, Size: ${this.formatBytes(metadata.size)}`
      );

      return metadata;
    } catch (error) {
      this.logger.error(`Backup creation failed: ${backupId}`, error);
      // Clean up partial backup
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
      throw error;
    }
  }

  /**
   * Backup a single collection to JSON file
   */
  private async backupCollection(
    model: Model<any>,
    collectionName: string,
    backupDir: string
  ): Promise<number> {
    const records = await model.find().lean().exec();
    const filePath = path.join(backupDir, `${collectionName}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
    
    this.logger.log(`Backed up ${records.length} records from ${collectionName}`);
    return records.length;
  }

  /**
   * BR-TM-25: Clean up backups older than retention period
   */
  async cleanupOldBackups(): Promise<number> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.retentionDays);

    let deletedCount = 0;

    try {
      const backups = fs.readdirSync(this.config.backupPath);

      for (const backup of backups) {
        const backupPath = path.join(this.config.backupPath, backup);
        const metadataPath = path.join(backupPath, 'metadata.json');

        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as BackupMetadata;
          const backupDate = new Date(metadata.timestamp);

          if (backupDate < retentionDate) {
            fs.rmSync(backupPath, { recursive: true, force: true });
            deletedCount++;
            this.logger.log(`Deleted old backup: ${backup} (${backupDate.toISOString()})`);
          }
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleanup completed: ${deletedCount} old backups removed`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('Backup cleanup failed', error);
      return deletedCount;
    }
  }

  /**
   * Restore data from a specific backup
   */
  async restoreBackup(backupId: string): Promise<{ restored: number; errors: string[] }> {
    const backupDir = path.join(this.config.backupPath, backupId);
    
    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const result = { restored: 0, errors: [] as string[] };

    try {
      // Restore attendance records
      const attendancePath = path.join(backupDir, 'attendance_records.json');
      if (fs.existsSync(attendancePath)) {
        const count = await this.restoreCollection(
          this.attendanceRecordModel,
          attendancePath,
          'attendance_records'
        );
        result.restored += count;
      }

      // Restore shift assignments
      const shiftPath = path.join(backupDir, 'shift_assignments.json');
      if (fs.existsSync(shiftPath)) {
        const count = await this.restoreCollection(
          this.shiftAssignmentModel,
          shiftPath,
          'shift_assignments'
        );
        result.restored += count;
      }

      // Restore correction requests
      const correctionPath = path.join(backupDir, 'correction_requests.json');
      if (fs.existsSync(correctionPath)) {
        const count = await this.restoreCollection(
          this.correctionRequestModel,
          correctionPath,
          'correction_requests'
        );
        result.restored += count;
      }

      // Restore time exceptions
      const exceptionPath = path.join(backupDir, 'time_exceptions.json');
      if (fs.existsSync(exceptionPath)) {
        const count = await this.restoreCollection(
          this.timeExceptionModel,
          exceptionPath,
          'time_exceptions'
        );
        result.restored += count;
      }

      this.logger.log(`Restore completed: ${backupId}, Records restored: ${result.restored}`);
    } catch (error) {
      result.errors.push(error.message);
      this.logger.error(`Restore failed: ${backupId}`, error);
    }

    return result;
  }

  /**
   * Restore a single collection from backup file
   */
  private async restoreCollection(
    model: Model<any>,
    filePath: string,
    collectionName: string
  ): Promise<number> {
    const records = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Use insertMany with ordered: false to continue on duplicates
    try {
      const result = await model.insertMany(records, { ordered: false });
      this.logger.log(`Restored ${result.length} records to ${collectionName}`);
      return result.length;
    } catch (error) {
      // Some duplicates are expected
      const inserted = error.insertedDocs?.length || 0;
      this.logger.warn(`Restored ${inserted} records to ${collectionName} (some duplicates skipped)`);
      return inserted;
    }
  }

  /**
   * List all available backups
   */
  listBackups(): BackupMetadata[] {
    const backups: BackupMetadata[] = [];

    try {
      const backupDirs = fs.readdirSync(this.config.backupPath);

      for (const dir of backupDirs) {
        const metadataPath = path.join(this.config.backupPath, dir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          backups.push(metadata);
        }
      }

      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      this.logger.error('Failed to list backups', error);
    }

    return backups;
  }

  /**
   * Generate backup ID from timestamp
   */
  private generateBackupId(timestamp: Date): string {
    return `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}`;
  }

  /**
   * Calculate total size of directory
   */
  private calculateDirectorySize(dirPath: string): number {
    let totalSize = 0;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }

    return totalSize;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get backup configuration
   */
  getConfig(): BackupConfig {
    return { ...this.config };
  }

  /**
   * Update backup configuration
   */
  updateConfig(updates: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...updates };
    this.ensureBackupDirectory();
    this.logger.log('Backup configuration updated', this.config);
  }
}
