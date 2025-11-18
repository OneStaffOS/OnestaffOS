// src/time-management/time-management.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TimeManagementService } from './time-management.service';
import { TimeManagementController } from './time-management.controller';

import {
  TimeAudit,
  TimeAuditSchema,
} from './models/time-audit.schema';

import {
  ShiftAssignment,
  ShiftAssignmentSchema,
} from './models/shift-assignment.schema';

import {
  AttendanceRecord,
  AttendanceRecordSchema,
} from './models/attendance-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TimeAudit.name, schema: TimeAuditSchema },
      { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
    ]),
  ],
  controllers: [TimeManagementController],
  providers: [TimeManagementService],
  exports: [TimeManagementService],
})
export class TimeManagementModule {}