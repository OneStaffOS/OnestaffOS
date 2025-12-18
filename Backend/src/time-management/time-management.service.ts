import { Injectable, NotFoundException, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShiftType, ShiftTypeDocument } from './models/shift-type.schema';
import { Shift, ShiftDocument } from './models/shift.schema';
import { ShiftAssignment, ShiftAssignmentDocument } from './models/shift-assignment.schema';
import { ScheduleRule, ScheduleRuleDocument } from './models/schedule-rule.schema';
import { AttendanceRecord, AttendanceRecordDocument } from './models/attendance-record.schema';
import { AttendanceCorrectionRequest, AttendanceCorrectionRequestDocument } from './models/attendance-correction-request.schema';
import { OvertimeRule, OvertimeRuleDocument } from './models/overtime-rule.schema';
import { LatenessRule, LatenessRuleDocument } from './models/lateness-rule.schema';
import { TimeException, TimeExceptionDocument } from './models/time-exception.schema';
import { Holiday, HolidayDocument } from './models/holiday.schema';
import { NotificationLog, NotificationLogDocument } from './models/notification-log.schema';
import { NotificationService } from '../notifications/notification.service';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { Position, PositionDocument } from '../organization-structure/models/position.schema';
import { Department, DepartmentDocument } from '../organization-structure/models/department.schema';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { CreateScheduleRuleDto } from './dto/create-schedule-rule.dto';
import { UpdateScheduleRuleDto } from './dto/update-schedule-rule.dto';
import { ClockPunchDto } from './dto/clock-punch.dto';
import { ClockPunchByIdDto } from './dto/clock-punch-by-id.dto';
import { ManualAttendanceCorrectionDto } from './dto/manual-attendance-correction.dto';
import { CreateCorrectionRequestDto } from './dto/create-correction-request.dto';
import { ProcessCorrectionRequestDto } from './dto/process-correction-request.dto';
import { CreateOvertimeRuleDto } from './dto/create-overtime-rule.dto';
import { UpdateOvertimeRuleDto } from './dto/update-overtime-rule.dto';
import { CreateLatenessRuleDto } from './dto/create-lateness-rule.dto';
import { UpdateLatenessRuleDto } from './dto/update-lateness-rule.dto';
import { CreateTimeExceptionDto } from './dto/create-time-exception.dto';
import { ProcessTimeExceptionDto } from './dto/process-time-exception.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import {
  ShiftAssignmentStatus,
  PunchType,
  CorrectionRequestStatus,
  TimeExceptionType,
  TimeExceptionStatus,
} from './models/enums/index';

@Injectable()
export class TimeManagementService implements OnModuleInit, OnModuleDestroy {
  private weeklyIntervalHandle: any;
  private repeatedLatenessHandle: any;
  constructor(
    @InjectModel(ShiftType.name) private shiftTypeModel: Model<ShiftTypeDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(ShiftAssignment.name) private shiftAssignmentModel: Model<ShiftAssignmentDocument>,
    @InjectModel(ScheduleRule.name) private scheduleRuleModel: Model<ScheduleRuleDocument>,
    @InjectModel(AttendanceRecord.name) private attendanceRecordModel: Model<AttendanceRecordDocument>,
    @InjectModel(AttendanceCorrectionRequest.name) private correctionRequestModel: Model<AttendanceCorrectionRequestDocument>,
    @InjectModel(OvertimeRule.name) private overtimeRuleModel: Model<OvertimeRuleDocument>,
    @InjectModel(LatenessRule.name) private latenessRuleModel: Model<LatenessRuleDocument>,
    @InjectModel(TimeException.name) private timeExceptionModel: Model<TimeExceptionDocument>,
    @InjectModel(Holiday.name) private holidayModel: Model<HolidayDocument>,
    // VacationPackage and EmployeeVacation models removed to use existing schemas instead
    @InjectModel(NotificationLog.name) private notificationLogModel: Model<NotificationLogDocument>,
    @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
    @InjectModel(Position.name) private positionModel: Model<PositionDocument>,
    @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Sync validated time data (attendance, approved exceptions, overtime)
   * with external payroll systems. If `dryRun` is true, the method returns
   * the payload without attempting network calls.
   */
  async syncWithPayroll(options?: { startDate?: Date; endDate?: Date; dryRun?: boolean }): Promise<any> {
    const payrollUrl = process.env.PAYROLL_SYNC_URL;
    const dryRun = !!options?.dryRun;

    // Default to yesterday's data if no range supplied
    const end = options?.endDate ? new Date(options.endDate) : new Date();
    const start = options?.startDate ? new Date(options.startDate) : new Date(end);
    // default window: previous day
    if (!options?.startDate) {
      start.setDate(end.getDate() - 1);
    }

    // normalize to day boundaries
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(23, 59, 59, 999);

    // Get attendance records that have been finalized for payroll in the window
    const attendanceRecords = await this.attendanceRecordModel.find({
      finalisedForPayroll: true,
      createdAt: { $gte: startDay, $lte: endDay },
    }).populate('employeeId').exec();

    // Get approved time exceptions in window
    const exceptions = await this.timeExceptionModel.find({
      status: TimeExceptionStatus.APPROVED,
      createdAt: { $gte: startDay, $lte: endDay },
    }).populate('employeeId').populate('attendanceRecordId').exec();

    // Build a compact payload
    const payload = {
      generatedAt: new Date().toISOString(),
      host: os.hostname(),
      window: { start: startDay.toISOString(), end: endDay.toISOString() },
      attendance: attendanceRecords.map((r) => ({
        id: (r as any)._id?.toString(),
        employeeId: (r as any).employeeId?._id?.toString() || (r as any).employeeId?.toString(),
        punches: (r as any).punches || [],
        totalWorkMinutes: (r as any).totalWorkMinutes,
        exceptionIds: ((r as any).exceptionIds || []).map((id: any) => id.toString()),
      })),
      exceptions: exceptions.map((e) => ({
        id: (e as any)._id?.toString(),
        employeeId: (e as any).employeeId?._id?.toString() || (e as any).employeeId?.toString(),
        attendanceRecordId: (e as any).attendanceRecordId?._id?.toString() || (e as any).attendanceRecordId?.toString(),
        type: (e as any).type,
        status: (e as any).status,
        reason: (e as any).reason,
      })),
    };

    if (dryRun || !payrollUrl) {
      return { dryRun: true, payload, note: payrollUrl ? undefined : 'PAYROLL_SYNC_URL not configured' };
    }

    // attempt to POST payload to payroll endpoint using global fetch if available
    try {
      // @ts-ignore - node 18+ provides fetch globally
      const res = await fetch(payrollUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      return { status: res.status, body: text };
    } catch (err) {
      console.error('Failed to sync with payroll:', err?.message || err);
      return { error: err?.message || String(err) };
    }
  }

  /**
   * Export reports as CSV text for given type.
   */
  async exportReportCSV(type: string, opts?: { start?: Date; end?: Date; employeeId?: string }): Promise<string> {
    let data: any[] = [];
    if (type === 'overtime') {
      if (!opts?.start || !opts?.end) throw new BadRequestException('start and end dates required');
      data = await this.generateOvertimeReport(opts.start, opts.end) as any[];
    } else if (type === 'lateness') {
      if (!opts?.start || !opts?.end) throw new BadRequestException('start and end dates required');
      data = await this.generateLatenessReport(opts.start, opts.end) as any[];
    } else if (type === 'attendance') {
      if (!opts?.start || !opts?.end || !opts?.employeeId) throw new BadRequestException('employeeId, start and end dates required');
      const summary = await this.generateAttendanceSummary(opts.employeeId, opts.start, opts.end);
      data = [summary];
    } else {
      throw new BadRequestException('Unknown report type');
    }

    // Convert array of objects to CSV
    if (!data || data.length === 0) return '';
    const keys = Array.from(new Set(data.flatMap(d => Object.keys(d))));
    const lines = [keys.join(',')];
    for (const row of data) {
      const vals = keys.map(k => {
        const v = row[k];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
        return '"' + String(v).replace(/"/g, '""') + '"';
      });
      lines.push(vals.join(','));
    }
    return lines.join('\n');
  }

  // ==================== PHASE 1: SHIFT CONFIGURATION & TYPES ====================

  /**
   * US-2: Create shift type (Normal, Split, Overnight, Rotational, etc.)
   */
  async createShiftType(createDto: CreateShiftTypeDto): Promise<ShiftType> {
    const shiftType = new this.shiftTypeModel(createDto);
    return shiftType.save();
  }

  /**
   * Get all shift types
   */
  async getAllShiftTypes(includeInactive = false): Promise<ShiftType[]> {
    const filter = includeInactive ? {} : { active: true };
    return this.shiftTypeModel.find(filter).exec();
  }

  /**
   * Get shift type by ID
   */
  async getShiftTypeById(id: string): Promise<ShiftType> {
    const shiftType = await this.shiftTypeModel.findById(id).exec();
    if (!shiftType) {
      throw new NotFoundException(`Shift type with ID ${id} not found`);
    }
    return shiftType;
  }

  /**
   * Deactivate shift type
   */
  async deactivateShiftType(id: string): Promise<ShiftType> {
    const shiftType = await this.shiftTypeModel.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    ).exec();
    if (!shiftType) {
      throw new NotFoundException(`Shift type with ID ${id} not found`);
    }
    return shiftType;
  }

  // ==================== PHASE 1: SHIFT CONFIGURATION ====================

  /**
   * US-2: Create shift with configuration
   */
  async createShift(createDto: CreateShiftDto): Promise<Shift> {
    const shift = new this.shiftModel(createDto);
    return shift.save();
  }

  /**
   * Get all shifts
   */
  async getAllShifts(includeInactive = false): Promise<Shift[]> {
    const filter = includeInactive ? {} : { active: true };
    return this.shiftModel.find(filter).populate('shiftType').exec();
  }

  /**
   * Get shift by ID
   */
  async getShiftById(id: string): Promise<Shift> {
    const shift = await this.shiftModel.findById(id).populate('shiftType').exec();
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return shift;
  }

  /**
   * Update shift
   */
  async updateShift(id: string, updateDto: UpdateShiftDto): Promise<Shift> {
    const shift = await this.shiftModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return shift;
  }

  // ==================== PHASE 1: SHIFT ASSIGNMENT MANAGEMENT ====================

  /**
   * US-1: Assign shifts to employees (individually, by department, or by position)
   */
  async createShiftAssignment(createDto: CreateShiftAssignmentDto): Promise<ShiftAssignment> {
    // Validate at least one target is provided
    if (!createDto.employeeId && !createDto.departmentId && !createDto.positionId) {
      throw new BadRequestException('Must specify at least one of: employeeId, departmentId, or positionId');
    }

    // Ensure ID fields are stored as ObjectId instances (avoid accidental string storage)
    const data: any = { ...createDto };
    if (createDto.employeeId) data.employeeId = new Types.ObjectId(createDto.employeeId as any);
    if (createDto.departmentId) data.departmentId = new Types.ObjectId(createDto.departmentId as any);
    if (createDto.positionId) data.positionId = new Types.ObjectId(createDto.positionId as any);
    if (createDto.shiftId) data.shiftId = new Types.ObjectId(createDto.shiftId as any);
    if (createDto.scheduleRuleId) data.scheduleRuleId = new Types.ObjectId(createDto.scheduleRuleId as any);

    const assignment = new this.shiftAssignmentModel(data);
    return assignment.save();
  }

  /**
   * Get shift assignments with filters
   */
  async getShiftAssignments(filters: {
    employeeId?: string;
    departmentId?: string;
    positionId?: string;
    status?: ShiftAssignmentStatus;
  }): Promise<ShiftAssignment[]> {
    const query: any = {};
    if (filters.employeeId) query.employeeId = new Types.ObjectId(filters.employeeId);
    if (filters.departmentId) query.departmentId = new Types.ObjectId(filters.departmentId);
    if (filters.positionId) query.positionId = new Types.ObjectId(filters.positionId);
    if (filters.status) query.status = filters.status;

    return this.shiftAssignmentModel
      .find(query)
      .populate('shiftId')
      .populate('scheduleRuleId')
      .populate('employeeId')
      .populate('departmentId')
      .populate('positionId')
      .exec();
  }

  /**
   * Update shift assignment status
   */
  async updateShiftAssignmentStatus(
    id: string,
    status: ShiftAssignmentStatus,
  ): Promise<ShiftAssignment> {
    const assignment = await this.shiftAssignmentModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!assignment) {
      throw new NotFoundException(`Shift assignment with ID ${id} not found`);
    }
    return assignment;
  }

  /**
   * Update shift assignment
   */
  async updateShiftAssignment(
    id: string,
    updateDto: UpdateShiftAssignmentDto,
  ): Promise<ShiftAssignment> {
    // Convert any id-like fields to ObjectId to preserve types
    const updateData: any = { ...updateDto };
    if ((updateDto as any).employeeId) updateData.employeeId = new Types.ObjectId((updateDto as any).employeeId);
    if ((updateDto as any).departmentId) updateData.departmentId = new Types.ObjectId((updateDto as any).departmentId);
    if ((updateDto as any).positionId) updateData.positionId = new Types.ObjectId((updateDto as any).positionId);
    if ((updateDto as any).shiftId) updateData.shiftId = new Types.ObjectId((updateDto as any).shiftId);
    if ((updateDto as any).scheduleRuleId) updateData.scheduleRuleId = new Types.ObjectId((updateDto as any).scheduleRuleId);

    const assignment = await this.shiftAssignmentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!assignment) {
      throw new NotFoundException(`Shift assignment with ID ${id} not found`);
    }
    return assignment;
  }

  /**
   * US-4: Check for expiring shifts and send notifications
   */
  async checkExpiringShifts(daysBeforeExpiry = 7): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

    const expiringAssignments = await this.shiftAssignmentModel
      .find({
        status: ShiftAssignmentStatus.APPROVED,
        endDate: { $lte: expiryDate, $gte: new Date() },
      })
      .populate('employeeId')
      .populate('shiftId')
      .exec();

    for (const assignment of expiringAssignments) {
      // Build message
      const emp: any = assignment.employeeId;
      const shift: any = assignment.shiftId;
      const shiftIdStr = shift?._id?.toString() || (assignment.shiftId ? assignment.shiftId.toString() : '');
      const shiftName = shift?.name || '';
      const expiry = assignment.endDate ? new Date(assignment.endDate).toISOString() : '';
      const message = `Please note that the shift type ${shiftIdStr} ${shiftName} is about to expire on ${expiry}. Please either renew or archive.`;

      // Create a Notification (for notification center and delivery)
      try {
        // Use SYSTEM user as creator for system-generated alerts
        await this.notificationService.createNotification(
          '692a056cfad7d194cd3f0992',
          {
            title: 'Shift Expiry',
            message,
            targetRole: 'EMPLOYEE',
            targetEmployeeIds: [(emp && emp._id) ? (emp._id.toString()) : undefined].filter(Boolean) as string[],
            sendAt: new Date(),
          } as any,
        );
      } catch (err) {
        // log but continue
        console.error('Failed to create Notification document:', err?.message || err);
      }

      // Also save a NotificationLog entry for the employee (quick center list)
      try {
        await this.createNotification(
          (emp && emp._id) ? (emp._id.toString()) : assignment.employeeId as any,
          'Shift Expiry',
          message,
        );
      } catch (err) {
        console.error('Failed to create NotificationLog entry:', err?.message || err);
      }
    }
  }

  /**
   * Mark expired shift assignments
   */
  async markExpiredShifts(): Promise<void> {
    await this.shiftAssignmentModel
      .updateMany(
        {
          status: ShiftAssignmentStatus.APPROVED,
          endDate: { $lt: new Date() },
        },
        { status: ShiftAssignmentStatus.EXPIRED },
      )
      .exec();
  }

  // ==================== PHASE 1: CUSTOM SCHEDULING RULES ====================

  /**
   * US-3: Define custom scheduling rules (flex-time, rotational, etc.)
   */
  async createScheduleRule(createDto: CreateScheduleRuleDto): Promise<ScheduleRule> {
    const rule = new this.scheduleRuleModel(createDto);
    return rule.save();
  }

  /**
   * Get all schedule rules
   */
  async getAllScheduleRules(includeInactive = false): Promise<ScheduleRule[]> {
    const filter = includeInactive ? {} : { active: true };
    return this.scheduleRuleModel.find(filter).exec();
  }

  /**
   * Update schedule rule
   */
  async updateScheduleRule(id: string, updateDto: UpdateScheduleRuleDto): Promise<ScheduleRule> {
    const rule = await this.scheduleRuleModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!rule) {
      throw new NotFoundException(`Schedule rule with ID ${id} not found`);
    }
    return rule;
  }

  // ==================== PHASE 2: ATTENDANCE RECORDING ====================

  /**
   * US-5: Employee clock in/out
   * BR-TM-10: Restrict early/late clock-ins based on shift configuration
   */
  async clockPunch(employeeId: string, punchDto: ClockPunchDto): Promise<AttendanceRecord> {
    // Determine the calendar date for the punch based on the punch timestamp
    const punchTime = punchDto.time ? new Date(punchDto.time) : new Date();
    const punchDateStart = new Date(punchTime);
    punchDateStart.setHours(0, 0, 0, 0);
    const punchDateEnd = new Date(punchDateStart);
    punchDateEnd.setDate(punchDateEnd.getDate() + 1);

    // BR-TM-10: Validate clock-in restrictions based on assigned shift
    const shiftAssignment = await this.shiftAssignmentModel
      .findOne({
        employeeId: new Types.ObjectId(employeeId),
        status: ShiftAssignmentStatus.APPROVED,
        startDate: { $lte: punchTime },
        $or: [{ endDate: { $gte: punchTime } }, { endDate: null }],
      })
      .populate('shiftId')
      .exec();

    if (shiftAssignment && shiftAssignment.shiftId) {
      const shift = shiftAssignment.shiftId as any;
      if (shift && shift.startTime && shift.endTime) {
        const [startHour, startMinute] = shift.startTime.split(':').map(Number);
        const [endHour, endMinute] = shift.endTime.split(':').map(Number);
        
        const shiftStartTime = new Date(punchTime);
        shiftStartTime.setHours(startHour, startMinute, 0, 0);
        
        const shiftEndTime = new Date(punchTime);
        shiftEndTime.setHours(endHour, endMinute, 0, 0);

        // Apply grace period for clock-in
        const graceInMs = (shift.graceInMinutes || 0) * 60 * 1000;
        const graceOutMs = (shift.graceOutMinutes || 0) * 60 * 1000;
        
        const earliestAllowedIn = new Date(shiftStartTime.getTime() - graceInMs);
        const latestAllowedOut = new Date(shiftEndTime.getTime() + graceOutMs);

        if (punchDto.type === PunchType.IN && punchTime < earliestAllowedIn) {
          throw new BadRequestException(`Clock-in not allowed before ${earliestAllowedIn.toLocaleTimeString()}. Too early for your shift.`);
        }
        
        if (punchDto.type === PunchType.OUT && punchTime > latestAllowedOut) {
          throw new BadRequestException(`Clock-out not allowed after ${latestAllowedOut.toLocaleTimeString()}. Too late for your shift without overtime approval.`);
        }
      }
    }

    // Fetch employee profile for CSV logging
    const employee = await this.employeeProfileModel.findById(new Types.ObjectId(employeeId)).exec();
    
    // Save to CSV file for external systems (if employee has employeeNumber)
    if (employee && employee.employeeNumber) {
      await this.saveAttendanceToCSV({
        employeeNumber: employee.employeeNumber,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        type: punchDto.type,
        time: punchTime,
      });
    }

    // Find or create the attendance record for the punch's calendar date.
    // Query by punches.time so this works even when schema doesn't have timestamps.
    let attendanceRecord = await this.attendanceRecordModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      'punches.time': { $gte: punchDateStart, $lt: punchDateEnd },
    }).exec();

    if (!attendanceRecord) {
      attendanceRecord = new this.attendanceRecordModel({
        employeeId: new Types.ObjectId(employeeId),
        punches: [],
        totalWorkMinutes: 0,
        // By default mark as missed until we verify both an IN and an OUT exist
        hasMissedPunch: true,
        exceptionIds: [],
        finalisedForPayroll: true,
      });
    }

    // Allow multiple punches per day
    // Get today's punches to check logical sequence
    const todayPunches = attendanceRecord.punches.filter(
      (p) => new Date(p.time) >= punchDateStart && new Date(p.time) < punchDateEnd,
    );
    
    // Check if last punch was same type (prevent double IN or double OUT in sequence)
    if (todayPunches.length > 0) {
      const lastPunch = todayPunches[todayPunches.length - 1];
      if (lastPunch.type === punchDto.type) {
        const action = punchDto.type === PunchType.IN ? 'clock in' : 'clock out';
        throw new BadRequestException(`You cannot ${action} twice in a row. Please ${punchDto.type === PunchType.IN ? 'clock out' : 'clock in'} first.`);
      }
    }

    // Add punch (metadata tracked via DTO for external systems)
    attendanceRecord.punches.push({
      type: punchDto.type,
      time: punchTime,
    });

    // Recalculate work minutes
    attendanceRecord.totalWorkMinutes = this.calculateWorkMinutes(attendanceRecord.punches);

    // Check for missed punches
    attendanceRecord.hasMissedPunch = this.checkMissedPunches(attendanceRecord.punches);

    // Send missed punch alert if needed
    if (attendanceRecord.hasMissedPunch) {
      // create a lightweight notification log entry (existing behavior)
      await this.createNotification(
        employeeId,
        'MISSED_PUNCH_ALERT',
        'Please correct your attendance record - missing punch detected',
      );

      // Also create Notification documents (for inbox and manager alerts) using system sender
      try {
        const systemSenderId = '692a056cfad7d194cd3f0992';

        // determine missing punch type (IN or OUT)
        const inCount = attendanceRecord.punches.filter((p) => p.type === PunchType.IN).length;
        const outCount = attendanceRecord.punches.filter((p) => p.type === PunchType.OUT).length;
        let missingType = 'IN/OUT';
        if (inCount > outCount) missingType = 'OUT';
        else if (outCount > inCount) missingType = 'IN';

        const missedDate = punchDateStart.toISOString().split('T')[0];

        // Employee notification
        const empMsg = `You have missed today ${missingType} punch for date ${missedDate}. If you believe this is a mistake please contact your line manager.`;
        await this.notificationService.createNotification(systemSenderId, {
          title: 'Missed Punch',
          message: empMsg,
          targetRole: 'EMPLOYEE',
          targetEmployeeIds: [employeeId],
          sendAt: new Date(),
        } as any);

        // Try to find the employee's department head (line manager) and notify them
        try {
          const profile = await this.employeeProfileModel.findById(new Types.ObjectId(employeeId)).select('firstName lastName primaryDepartmentId').exec();
          if (profile && profile.primaryDepartmentId) {
            const dept = await this.departmentModel.findById(profile.primaryDepartmentId).select('headPositionId').exec();
            if (dept && dept.headPositionId) {
              const manager = await this.employeeProfileModel.findOne({ primaryPositionId: dept.headPositionId }).select('_id firstName lastName').exec();
              if (manager && manager._id) {
                const empName = `${(profile as any).firstName || ''} ${(profile as any).lastName || ''}`.trim();
                const mgrMsg = `Please note that one of your department employees: ${empName} has a missed ${missingType} punch on ${missedDate}. Please correct it manually if you belive it is a mistake.`;
                // Target the department head explicitly using their employee id
                await this.notificationService.createNotification(systemSenderId, {
                  title: 'Missed Punch',
                  message: mgrMsg,
                  targetEmployeeIds: [manager._id.toString()],
                  sendAt: new Date(),
                } as any);
              }
            }
          }
        } catch (err) {
          // do not fail the whole operation if manager lookup/notify fails
          console.error('Failed to resolve/notify manager for missed punch:', err?.message || err);
        }
      } catch (err) {
        console.error('Failed to create Notification documents for missed punch:', err?.message || err);
      }
    }

    return attendanceRecord.save();
  }

  /**
   * US-5: Employee clock in/out using employee number (for kiosk/external systems)
   * Looks up employee by employeeNumber and calls clockPunch
   */
  async clockPunchById(punchDto: ClockPunchByIdDto): Promise<AttendanceRecord> {
    // Find employee by employeeNumber
    const employee = await this.employeeProfileModel.findOne({
      employeeNumber: punchDto.employeeNumber,
    }).exec();

    if (!employee) {
      throw new NotFoundException(`Employee with number ${punchDto.employeeNumber} not found`);
    }

    // Save to CSV file for external systems
    await this.saveAttendanceToCSV({
      employeeNumber: punchDto.employeeNumber,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      type: punchDto.type,
      time: punchDto.time || new Date(),
    });

    // Call the existing clockPunch method with the employee's _id
    return this.clockPunch(employee._id.toString(), {
      type: punchDto.type,
      time: punchDto.time,
    });
  }

  /**
   * Save attendance punch to external CSV file
   */
  private async saveAttendanceToCSV(data: {
    employeeNumber: string;
    employeeName: string;
    type: PunchType;
    time: Date;
  }): Promise<void> {
    const csvDir = path.join(process.cwd(), 'uploads', 'attendance-logs');
    const csvFile = path.join(csvDir, 'attendance.csv');

    // Ensure directory exists
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }

    const timestamp = new Date(data.time).toISOString();
    const date = timestamp.split('T')[0];
    const time = new Date(data.time).toLocaleTimeString('en-US', { hour12: false });
    
    const csvRow = `${data.employeeNumber},${data.employeeName},${data.type},${date},${time},${timestamp}\n`;

    // Check if file exists, if not create with header
    if (!fs.existsSync(csvFile)) {
      const header = 'EmployeeNumber,EmployeeName,PunchType,Date,Time,Timestamp\n';
      fs.writeFileSync(csvFile, header, 'utf8');
    }

    // Append the new record
    fs.appendFileSync(csvFile, csvRow, 'utf8');
  }

  /**
   * Read attendance records from CSV file
   */
  async getAttendanceFromCSV(employeeNumber?: string): Promise<any[]> {
    const csvFile = path.join(process.cwd(), 'uploads', 'attendance-logs', 'attendance.csv');

    if (!fs.existsSync(csvFile)) {
      return [];
    }

    const content = fs.readFileSync(csvFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Skip header
    const records = lines.slice(1).map(line => {
      const [empNum, empName, type, date, time, timestamp] = line.split(',');
      return {
        employeeNumber: empNum,
        employeeName: empName,
        punchType: type,
        date,
        time,
        timestamp,
      };
    });

    // Filter by employee number if provided
    if (employeeNumber) {
      return records.filter(r => r.employeeNumber === employeeNumber);
    }

    return records;
  }

  /**
   * Calculate total work minutes from punches
   */
  private calculateWorkMinutes(punches: any[]): number {
    // Sort punches chronologically and pair the nearest IN before an OUT
    let totalMinutes = 0;
    const sorted = [...punches].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    let lastIn: number | null = null;

    for (const p of sorted) {
      if (p.type === PunchType.IN) {
        lastIn = new Date(p.time).getTime();
      } else if (p.type === PunchType.OUT) {
        const outTime = new Date(p.time).getTime();
        if (lastIn !== null) {
          const diffMinutes = (outTime - lastIn) / (1000 * 60);
          if (diffMinutes > 0) totalMinutes += diffMinutes;
          lastIn = null;
        } else {
          // unmatched OUT - ignore for minutes calculation
        }
      }
    }

    return Math.round(totalMinutes);
  }

  /**
   * Check if punches are balanced (IN/OUT pairs)
   */
  private checkMissedPunches(punches: any[]): boolean {
    // Consider a record balanced (no missed punch) once at least one IN and one OUT exist.
    // Until both exist, treat as missed.
    const inCount = punches.filter((p) => p.type === PunchType.IN).length;
    const outCount = punches.filter((p) => p.type === PunchType.OUT).length;
    return !(inCount >= 1 && outCount >= 1);
  }

  /**
   * US-6: Manual attendance correction by Line Manager
   */
  async manualAttendanceCorrection(
    correctionDto: ManualAttendanceCorrectionDto,
  ): Promise<AttendanceRecord> {
    const attendanceRecord = await this.attendanceRecordModel
      .findById(correctionDto.attendanceRecordId)
      .exec();

    if (!attendanceRecord) {
      throw new NotFoundException('Attendance record not found');
    }

    // Update punches
    attendanceRecord.punches = correctionDto.punches as any;

    // Recalculate
    attendanceRecord.totalWorkMinutes = this.calculateWorkMinutes(attendanceRecord.punches);
    attendanceRecord.hasMissedPunch = this.checkMissedPunches(attendanceRecord.punches);

    // Log manual adjustment
    await this.createNotification(
      correctionDto.employeeId,
      'MANUAL_ATTENDANCE_CORRECTION',
      `Your attendance was manually corrected. Reason: ${correctionDto.reason || 'N/A'}`,
    );

    return attendanceRecord.save();
  }

  /**
   * Get attendance records for employee
   */
  async getAttendanceRecords(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AttendanceRecord[]> {
    const query: any = {};

    // If employeeId is provided, filter by employee
    if (employeeId) {
      query.employeeId = new Types.ObjectId(employeeId);
    }

    // Filter by punch time if dates are provided
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      query['punches.time'] = dateFilter;
    }

    return this.attendanceRecordModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeNumber')
      .sort({ 'punches.0.time': -1 })
      .exec();
  }

  // ==================== PHASE 3: ATTENDANCE CORRECTION REQUESTS ====================

  /**
   * US-13: Employee submits correction request
   */
  async createCorrectionRequest(
    employeeId: string,
    createDto: CreateCorrectionRequestDto,
  ): Promise<AttendanceCorrectionRequest> {
    // Verify attendance record exists
    const attendanceRecord = await this.attendanceRecordModel.findById(createDto.attendanceRecordId).exec();
    if (!attendanceRecord) {
      throw new NotFoundException('Attendance record not found');
    }

    // Mark attendance record as not finalized
    attendanceRecord.finalisedForPayroll = false;
    await attendanceRecord.save();

    const request = new this.correctionRequestModel({
      employeeId: new Types.ObjectId(employeeId),
      attendanceRecord: createDto.attendanceRecordId,
      reason: createDto.reason,
      status: CorrectionRequestStatus.SUBMITTED,
    });

    return request.save();
  }

  /**
   * Get correction requests for review
   */
  async getCorrectionRequests(filters: {
    employeeId?: string;
    status?: CorrectionRequestStatus;
  }): Promise<AttendanceCorrectionRequest[]> {
    const query: any = {};
    if (filters.employeeId) query.employeeId = new Types.ObjectId(filters.employeeId);
    if (filters.status) query.status = filters.status;

    return this.correctionRequestModel
      .find(query)
      .populate('employeeId')
      .populate('attendanceRecord')
      .exec();
  }

  /**
   * US-14: Process correction request (approve/reject)
   */
  async processCorrectionRequest(
    requestId: string,
    processDto: ProcessCorrectionRequestDto,
  ): Promise<AttendanceCorrectionRequest> {
    const request = await this.correctionRequestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException('Correction request not found');
    }

    request.status = processDto.status;

    // If approved, finalize the attendance record
    if (processDto.status === CorrectionRequestStatus.APPROVED) {
      const attendanceRecord = await this.attendanceRecordModel.findById(request.attendanceRecord).exec();
      if (attendanceRecord) {
        attendanceRecord.finalisedForPayroll = true;
        await attendanceRecord.save();
      }
    }

    return request.save();
  }

  // ==================== PHASE 3: POLICY & RULE ENFORCEMENT ====================

  /**
   * US-10: Configure overtime and short-time rules
   */
  async createOvertimeRule(createDto: CreateOvertimeRuleDto): Promise<OvertimeRule> {
    const rule = new this.overtimeRuleModel(createDto);
    return rule.save();
  }

  // Admin update to approve an overtime rule
  async approveOvertimeRule(id: string): Promise<OvertimeRule> {
    const rule = await this.overtimeRuleModel.findByIdAndUpdate(id, { approved: true }, { new: true }).exec();
    if (!rule) throw new NotFoundException(`Overtime rule with ID ${id} not found`);
    return rule;
  }

  /**
   * Get all overtime rules
   */
  async getAllOvertimeRules(includeInactive = false): Promise<OvertimeRule[]> {
    const filter = includeInactive ? {} : { active: true };
    return this.overtimeRuleModel.find(filter).exec();
  }

  /**
   * Update overtime rule
   */
  async updateOvertimeRule(id: string, updateDto: UpdateOvertimeRuleDto): Promise<OvertimeRule> {
    const rule = await this.overtimeRuleModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!rule) {
      throw new NotFoundException(`Overtime rule with ID ${id} not found`);
    }
    return rule;
  }

  /**
   * US-11: Configure lateness and penalty rules
   */
  async createLatenessRule(createDto: CreateLatenessRuleDto): Promise<LatenessRule> {
    const rule = new this.latenessRuleModel(createDto);
    return rule.save();
  }

  /**
   * Get all lateness rules
   */
  async getAllLatenessRules(includeInactive = false): Promise<LatenessRule[]> {
    const filter = includeInactive ? {} : { active: true };
    return this.latenessRuleModel.find(filter).exec();
  }

  /**
   * Update lateness rule
   */
  async updateLatenessRule(id: string, updateDto: UpdateLatenessRuleDto): Promise<LatenessRule> {
    const rule = await this.latenessRuleModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!rule) {
      throw new NotFoundException(`Lateness rule with ID ${id} not found`);
    }
    return rule;
  }

  /**
   * US-12: Flag repeated lateness for disciplinary tracking
   */
  async getRepeatedLatenessReport(
    employeeId?: string,
    threshold = 3,
  ): Promise<any[]> {
    // Find attendance records with lateness exceptions
    const query: any = {
      exceptionIds: { $exists: true, $ne: [] },
    };
    if (employeeId) query.employeeId = new Types.ObjectId(employeeId);

    const records = await this.attendanceRecordModel.find(query).populate('exceptionIds').exec();

    // Group by employee and count lateness occurrences
    const latenessMap = new Map<string, number>();
    for (const record of records) {
      const empId = record.employeeId.toString();
      const latenessCount = (record.exceptionIds as any[]).filter(
        (ex: any) => ex.type === TimeExceptionType.LATE,
      ).length;

      latenessMap.set(empId, (latenessMap.get(empId) || 0) + latenessCount);
    }

    // Filter employees exceeding threshold
    const result: { employeeId: string; latenessCount: number }[] = [];
    for (const [empId, count] of latenessMap.entries()) {
      if (count >= threshold) {
        result.push({ employeeId: empId, latenessCount: count });
      }
    }

    return result;
  }

  /**
   * Detect repeated lateness within a rolling window and notify given positions.
   * Non-invasive: does not modify employee schema or create persistent flags.
   */
  async detectAndEscalateRepeatedLateness(options?: {
    threshold?: number;
    windowDays?: number;
    notifyPositionIds?: string[];
  }): Promise<{ processedEmployees: number; notificationsCreated: number; details: any[] }> {
    const threshold = options?.threshold ?? 3;
    const windowDays = options?.windowDays ?? 30;
    const notifyPositionIds = options?.notifyPositionIds ?? [];

    const systemSenderId = '692a056cfad7d194cd3f0992';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);

    // Find lateness exceptions within the window
    const latenessExceptions = await this.timeExceptionModel
      .find({ type: TimeExceptionType.LATE, createdAt: { $gte: startDate } })
      .populate('employeeId')
      .exec();

    // Group by employeeId
    const counts = new Map<string, number>();
    for (const ex of latenessExceptions) {
      const empId = (ex.employeeId as any)?._id?.toString() || (ex.employeeId ? ex.employeeId.toString() : '');
      if (!empId) continue;
      counts.set(empId, (counts.get(empId) || 0) + 1);
    }

    let notificationsCreated = 0;
    const details: any[] = [];

    for (const [empId, count] of counts.entries()) {
      if (count < threshold) continue;

      // Resolve employee profile for readable name
      let profile: any = null;
      try {
        profile = await this.employeeProfileModel.findById(new Types.ObjectId(empId)).select('firstName lastName primaryPositionId').exec();
      } catch (err) {
        profile = null;
      }

      const empName = profile ? `${(profile as any).firstName || ''} ${(profile as any).lastName || ''}`.trim() : empId;
      const message = `${empName} has been late ${count} times in the last ${windowDays} days.`;

      try {
        // Create a Notification targeted at the provided positions (e.g., HR managers)
        await this.notificationService.createNotification(systemSenderId, {
          title: 'Repeated Lateness Alert',
          message,
          targetPositionIds: notifyPositionIds,
          sendAt: new Date(),
        } as any);

        notificationsCreated += 1;
      } catch (err) {
        console.error('Failed to create repeated lateness notification:', err?.message || err);
      }

      details.push({ employeeId: empId, employeeName: empName, latenessCount: count });
    }

    return { processedEmployees: details.length, notificationsCreated, details };
  }

  /**
   * Get repeated lateness report scoped to a department.
   * Returns employees in the department exceeding the threshold within the windowDays.
   */
  async getRepeatedLatenessReportByDepartment(
    departmentId: string,
    threshold = 3,
    windowDays = 30,
  ): Promise<{ employeeId: string; latenessCount: number }[]> {
    if (!departmentId) return [];

    // find employees in the department
    const emps = await this.employeeProfileModel.find({ primaryDepartmentId: new Types.ObjectId(departmentId) }).select('_id').exec();
    const empIds = emps.map(e => (e as any)._id);
    if (!empIds || empIds.length === 0) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);

    const latenessExceptions = await this.timeExceptionModel
      .find({ type: TimeExceptionType.LATE, createdAt: { $gte: startDate }, employeeId: { $in: empIds } })
      .exec();

    // count per employee
    const counts = new Map<string, number>();
    for (const ex of latenessExceptions) {
      const empId = (ex.employeeId || '').toString();
      counts.set(empId, (counts.get(empId) || 0) + 1);
    }

    const result: { employeeId: string; latenessCount: number }[] = [];
    for (const [empId, count] of counts.entries()) {
      if (count >= threshold) result.push({ employeeId: empId, latenessCount: count });
    }

    return result;
  }

  // ==================== PHASE 4: TIME EXCEPTION WORKFLOW ====================

  /**
   * Create time exception
   */
  async createTimeException(employeeId: string, createDto: CreateTimeExceptionDto): Promise<TimeException> {
    // Build server-controlled payload: set employeeId and default server-side fields.
    // Server receives createDto and will validate/normalize as needed.

    // Resolve assignedTo if frontend provided a position id (e.g., department.headPositionId)
    let resolvedAssignedTo: string | undefined = undefined;
    try {
      const maybeAssigned = (createDto as any).assignedTo;
      if (maybeAssigned) {
        // If it's already an employee id, ensure it exists
        try {
          const emp = await this.employeeProfileModel.findById(String(maybeAssigned)).select('_id').lean().exec();
          if (emp && (emp as any)._id) {
            resolvedAssignedTo = String((emp as any)._id);
          }
        } catch (e) {
          // ignore - we'll try position resolution below
        }

        // If not resolved yet, treat value as possible Position id and try to resolve
        if (!resolvedAssignedTo) {
          try {
            const pos = await this.positionModel.findById(String(maybeAssigned)).select('_id').lean().exec();
            if (pos && (pos as any)._id) {
              // find an employee with primaryPositionId == pos._id
              const manager = await this.employeeProfileModel.findOne({ primaryPositionId: new Types.ObjectId(String(pos._id)) }).select('_id').lean().exec();
              if (manager && (manager as any)._id) {
                resolvedAssignedTo = String((manager as any)._id);
              }
            }
          } catch (e) {
            // ignore resolution errors
          }
        }
      }
    } catch (err) {
      // assignedTo resolution failed silently; proceed without assignedTo
    }

    const data: any = {
      ...createDto,
      employeeId: new Types.ObjectId(employeeId),
      // If type is not provided by business logic, default to MANUAL_ADJUSTMENT
      type: (createDto as any).type ?? TimeExceptionType.MANUAL_ADJUSTMENT,
      // Ensure new exceptions start in OPEN status
      status: TimeExceptionStatus.OPEN,
    };

    // If we resolved an employee id for assignedTo, store that in the data
    if (resolvedAssignedTo) {
      data.assignedTo = new Types.ObjectId(resolvedAssignedTo);
    } else if ((createDto as any).assignedTo) {
      // If frontend supplied assignedTo but we couldn't resolve it to an employee,
      // attempt to store it as-is if it looks like a valid ObjectId (this may be
      // a direct employee id). Otherwise omit assignedTo and log a debug note.
      const maybe = String((createDto as any).assignedTo);
      if (/^[a-fA-F0-9]{24}$/.test(maybe)) {
        data.assignedTo = new Types.ObjectId(maybe);
      } else {
        // supplied assignedTo not resolvable, omit it
      }
    }

    const exception = new this.timeExceptionModel(data);
    const saved = await exception.save();

    // Update attendance record to include this exception
    await this.attendanceRecordModel.findByIdAndUpdate(
      createDto.attendanceRecordId,
      { $push: { exceptionIds: saved._id } },
    ).exec();

    // Notify assigned person
    await this.createNotification(
      createDto.assignedTo,
      'TIME_EXCEPTION_ASSIGNED',
      `New time exception assigned`,
    );

    return saved;
  }

  /**
   * US-14: Review and process time exceptions
   */
  async processTimeException(
    exceptionId: string,
    processDto: ProcessTimeExceptionDto,
    processorId?: string,
  ): Promise<TimeException> {
    // Processing time exception (audit entries persisted via notifications)

    const exception = await this.timeExceptionModel.findById(exceptionId).exec();
    if (!exception) {
      throw new NotFoundException('Time exception not found');
    }

    const prevStatus = exception.status;
    exception.status = processDto.status;

    // Note: The TimeException schema does not include `processedBy` or
    // `processedAt` fields (schemas are fixed). Instead of adding those
    // properties, create a lightweight NotificationLog entry to record who
    // processed the exception and when for traceability.
    const processedAt = new Date();
    if (processorId) {
      try {
        await this.createNotification(
          processorId,
          'TIME_EXCEPTION_PROCESSED_BY',
          `You processed time exception ${exception._id} - ${processDto.status} at ${processedAt.toISOString()}${processDto.notes ? ': ' + processDto.notes : ''}`,
        );
      } catch (err) {
        console.error('Failed to record processor notification for time exception:', err?.message || err);
      }
    }

    // Record an audit-like entry for traceability. The TimeException schema
    // does not include an `auditTrail` field (schema must remain unchanged),
    // so persist a lightweight audit entry via NotificationLog for now and
    // also emit a server console log.
    const auditEntry = {
      action: String(processDto.status),
      by: processorId ? new Types.ObjectId(processorId) : undefined,
      at: new Date(),
      notes: processDto.notes || '',
      fromStatus: prevStatus,
      toStatus: processDto.status,
    };

    try {
      // store as a NotificationLog entry with a reserved type so it can be
      // retrieved later if needed for auditing. Target the processor if
      // provided, otherwise target the assignedTo or employee.
      const targetForAudit = processorId || (exception.assignedTo ? (exception.assignedTo as any).toString() : undefined) || (exception.employeeId ? (exception.employeeId as any).toString() : undefined);
      if (targetForAudit) {
        await this.createNotification(
          targetForAudit,
          'TIME_EXCEPTION_AUDIT',
          `Audit: exception ${exception._id} ${auditEntry.fromStatus}=>${auditEntry.toStatus} by ${processorId || 'system'} at ${auditEntry.at.toISOString()}${auditEntry.notes ? ' — ' + auditEntry.notes : ''}`,
        );
      }
    } catch (err) {
      console.error('Failed to record audit entry for time exception:', err?.message || err);
    }
    // Also keep a server-side console trace for immediate debugging
    console.info('TimeException audit entry:', auditEntry, 'exceptionId:', exception._id?.toString());

    const saved = await exception.save();

    // If approved or rejected, finalize the attendance record so payroll can proceed
    if (processDto.status === TimeExceptionStatus.APPROVED || processDto.status === TimeExceptionStatus.REJECTED) {
      try {
        await this.attendanceRecordModel.findByIdAndUpdate(
          exception.attendanceRecordId,
          { finalisedForPayroll: true },
        ).exec();
      } catch (err) {
        console.error('Failed to finalize attendance record after processing exception:', err?.message || err);
      }
    }

    // Notify interested parties
    try {
      const empId = exception.employeeId ? (exception.employeeId as any).toString() : undefined;
      const assignedToId = exception.assignedTo ? (exception.assignedTo as any).toString() : undefined;

      if (processDto.status === TimeExceptionStatus.APPROVED) {
        if (empId) await this.createNotification(empId, 'TIME_EXCEPTION_APPROVED', `Your time exception has been approved${processDto.notes ? ': ' + processDto.notes : ''}`);
      } else if (processDto.status === TimeExceptionStatus.REJECTED) {
        if (empId) await this.createNotification(empId, 'TIME_EXCEPTION_REJECTED', `Your time exception has been rejected${processDto.notes ? ': ' + processDto.notes : ''}`);
      }

      if (assignedToId) await this.createNotification(assignedToId, 'TIME_EXCEPTION_PROCESSED', `Time exception ${exception._id} processed: ${processDto.status}`);
    } catch (err) {
      console.error('Failed to send notifications for processed time exception:', err?.message || err);
    }

    return saved;
  }

  /**
   * Attach a time exception to its attendance record and mark it approved
   * This will add the exception id to the attendanceRecord.exceptionIds array
   * and set attendanceRecord.finalisedForPayroll = false to ensure payroll
   * picks up the updated state.
   */
  async attachTimeExceptionToAttendance(exceptionId: string, processorId?: string): Promise<TimeException> {
    const exception = await this.timeExceptionModel.findById(exceptionId).exec();
    if (!exception) {
      throw new NotFoundException('Time exception not found');
    }

    // Update attendance record: add exception id (if not already present) and mark as not finalised for payroll
    try {
      await this.attendanceRecordModel.findByIdAndUpdate(
        exception.attendanceRecordId,
        { $addToSet: { exceptionIds: exception._id }, finalisedForPayroll: false },
      ).exec();
    } catch (err) {
      console.error('Failed to attach exception to attendance record:', err?.message || err);
    }

    // Mark the exception as APPROVED and persist an audit-like notification
    exception.status = TimeExceptionStatus.APPROVED;
    try {
      const target = processorId || (exception.assignedTo ? (exception.assignedTo as any).toString() : undefined) || (exception.employeeId ? (exception.employeeId as any).toString() : undefined);
      if (target) {
        await this.createNotification(target, 'TIME_EXCEPTION_APPROVED_AND_ATTACHED', `Exception ${exception._id} attached to attendance record and approved by ${processorId || 'system'}`);
      }
    } catch (err) {
      console.error('Failed to create notification for attachTimeExceptionToAttendance:', err?.message || err);
    }

    return exception.save();
  }

  /**
   * Get time exceptions for review
   */
  async getTimeExceptions(filters: {
    employeeId?: string;
    assignedTo?: string;
    status?: TimeExceptionStatus;
    type?: TimeExceptionType;
  }): Promise<TimeException[]> {
    const query: any = {};
    if (filters.employeeId) query.employeeId = new Types.ObjectId(filters.employeeId);
    if (filters.assignedTo) query.assignedTo = new Types.ObjectId(filters.assignedTo);
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    return this.timeExceptionModel.find(query).populate('employeeId').populate('assignedTo').exec();
  }

  /**
   * US-18: Escalate pending requests before payroll cutoff
   */
  async escalatePendingRequests(): Promise<void> {
    // Escalate pending correction requests
    await this.correctionRequestModel.updateMany(
      { status: CorrectionRequestStatus.SUBMITTED },
      { status: CorrectionRequestStatus.ESCALATED },
    ).exec();

    // Escalate pending time exceptions
    await this.timeExceptionModel.updateMany(
      { status: TimeExceptionStatus.PENDING },
      { status: TimeExceptionStatus.ESCALATED },
    ).exec();
  }

  // ==================== PHASE 4: HOLIDAY & REST DAY CONFIGURATION ====================

  /**
   * US-17: Define holidays and rest days
   */
  async createHoliday(createDto: CreateHolidayDto): Promise<Holiday> {
    const holiday = new this.holidayModel(createDto);
    return holiday.save();
  }

  // ========== VACATION PACKAGE INTEGRATION ==========

  async createVacationPackage(createDto: any): Promise<any> {
    // VacationPackage master records are currently not supported without a dedicated schema.
    // To comply with the request to avoid adding new schemas, this endpoint will return a BadRequest.
    throw new BadRequestException('Vacation packages are not supported without a dedicated schema.');
  }

  async createEmployeeVacation(createDto: any): Promise<any> {
    // Store the employee-vacation mapping inside the existing EmployeeProfile
    // schema as a `vacation` nested object. We do not modify the schema file;
    // use `strict: false` on the update to permit adding this nested field.
    const update: any = {
      $set: {
        'vacation.packageId': createDto.packageId,
        'vacation.entitledDays': createDto.entitledDays ?? 0,
      },
    };
    if (createDto.effectiveFrom) update.$set['vacation.effectiveFrom'] = new Date(createDto.effectiveFrom);
    if (createDto.effectiveTo) update.$set['vacation.effectiveTo'] = new Date(createDto.effectiveTo);

    await this.employeeProfileModel.updateOne(
      { _id: new Types.ObjectId(createDto.employeeId) },
      update,
      { strict: false },
    ).exec();

    // Return a minimal mapping object for now
    return {
      // @ts-ignore - shape is ad-hoc (no dedicated schema)
      employeeId: new Types.ObjectId(createDto.employeeId),
      // @ts-ignore
      packageId: createDto.packageId,
      // @ts-ignore
      entitledDays: createDto.entitledDays ?? 0,
    } as any;
  }

  /**
   * Apply leave for an employee: create/update attendance records for each date
   * and update employeeVacation.usedDays accordingly.
   */
  async applyLeave(applyDto: any): Promise<any> {
    // Validate inputs
    const { employeeId, startDate, endDate, type } = applyDto;
    if (!employeeId || !startDate || !endDate) throw new BadRequestException('Missing fields');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) throw new BadRequestException('endDate must be >= startDate');

    // Build list of dates (UTC midnight)
    const dates: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }

    const appliedRecords: any[] = [];
    for (const d of dates) {
      const dayStart = new Date(d + 'T00:00:00.000Z');
      const dayEnd = new Date(d + 'T23:59:59.999Z');

      // find or create attendance record for that employee and date
      let attendance = await this.attendanceRecordModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
        'punches.time': { $gte: dayStart, $lt: dayEnd },
      }).exec();

      if (!attendance) {
        attendance = new this.attendanceRecordModel({
          employeeId: new Types.ObjectId(employeeId),
          punches: [],
          totalWorkMinutes: 0,
          hasMissedPunch: false,
          exceptionIds: [],
          finalisedForPayroll: false,
        });
      }

      // Mark a simple flag by adding a guest TimeException of type VACATION? Better: create a TimeException record
      const timeEx = new this.timeExceptionModel({
        employeeId: new Types.ObjectId(employeeId),
        type: (type && typeof type === 'string') ? type : 'MANUAL_ADJUSTMENT',
        attendanceRecordId: attendance._id,
        assignedTo: attendance.employeeId,
        status: TimeExceptionStatus.RESOLVED,
        reason: 'Applied leave via Vacation Integration',
      });
      const savedEx = await timeEx.save();

      // push the exception id into attendance record if not present and mark finalisedForPayroll false
      await this.attendanceRecordModel.findByIdAndUpdate(attendance._id, { $addToSet: { exceptionIds: savedEx._id }, finalisedForPayroll: false }).exec();

      appliedRecords.push({ date: d, attendanceRecordId: attendance._id, timeExceptionId: savedEx._id });
    }

    // Update usedDays on EmployeeProfile.vacation (create field if missing).
    try {
      await this.employeeProfileModel.updateOne(
        { _id: new Types.ObjectId(employeeId) },
        { $inc: { 'vacation.usedDays': dates.length } },
        { strict: false },
      ).exec();
    } catch (err) {
      console.error('Failed to update EmployeeProfile.vacation.usedDays:', err?.message || err);
    }

    return { appliedDates: dates, appliedRecords };
  }

  /**
   * Get all holidays
   */
  async getAllHolidays(filters?: { type?: string; year?: number }): Promise<Holiday[]> {
    const query: any = { active: true };
    if (filters?.type) query.type = filters.type;

    if (filters?.year) {
      const startDate = new Date(filters.year, 0, 1);
      const endDate = new Date(filters.year, 11, 31);
      query.startDate = { $gte: startDate, $lte: endDate };
    }

    return this.holidayModel.find(query).exec();
  }

  // Helper to parse and return holidays in a frontend-friendly format
  async listHolidays(filters?: { type?: string; year?: number }) {
    const holidays = await this.getAllHolidays(filters);
    return holidays.map(h => ({
      _id: (h as any)._id,
      type: (h as any).type,
      name: (h as any).name,
      startDate: (h as any).startDate,
      endDate: (h as any).endDate,
      active: (h as any).active,
    }));
  }

  /**
   * Update holiday
   */
  async updateHoliday(id: string, updateDto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.holidayModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!holiday) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }
    return holiday;
  }

  /**
   * Check if a date is a holiday
   */
  async isHoliday(date: Date): Promise<boolean> {
    const holiday = await this.holidayModel.findOne({
      active: true,
      startDate: { $lte: date },
      $or: [{ endDate: { $gte: date } }, { endDate: null }],
    }).exec();

    return !!holiday;
  }

  // ==================== PHASE 5: REPORTING & ANALYTICS ====================

  /**
   * US-19: Generate overtime and exception reports
   */
  async generateOvertimeReport(startDate: Date, endDate: Date): Promise<any[]> {
    const exceptions = await this.timeExceptionModel
      .find({
        type: TimeExceptionType.OVERTIME_REQUEST,
        status: TimeExceptionStatus.APPROVED,
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate('employeeId')
      .populate('attendanceRecordId')
      .exec();

    return exceptions.map((ex) => ({
      employeeId: ex.employeeId,
      attendanceRecordId: ex.attendanceRecordId,
      type: ex.type,
      status: ex.status,
      reason: ex.reason,
    }));
  }

  /**
   * Generate lateness and penalty report
   */
  async generateLatenessReport(startDate: Date, endDate: Date): Promise<any[]> {
    const exceptions = await this.timeExceptionModel
      .find({
        type: TimeExceptionType.LATE,
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate('employeeId')
      .populate('attendanceRecordId')
      .exec();

    return exceptions.map((ex) => ({
      employeeId: ex.employeeId,
      attendanceRecordId: ex.attendanceRecordId,
      type: ex.type,
      status: ex.status,
      reason: ex.reason,
    }));
  }

  /**
   * Generate attendance summary report
   */
  async generateAttendanceSummary(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const records = await this.attendanceRecordModel
      .find({
        employeeId: new Types.ObjectId(employeeId),
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .exec();

    const totalDays = records.length;
    const totalWorkMinutes = records.reduce((sum, rec) => sum + rec.totalWorkMinutes, 0);
    const daysWithMissedPunches = records.filter((rec) => rec.hasMissedPunch).length;

    return {
      employeeId,
      totalDays,
      totalWorkMinutes,
      totalWorkHours: Math.round(totalWorkMinutes / 60 * 100) / 100,
      daysWithMissedPunches,
      averageWorkMinutesPerDay: totalDays > 0 ? Math.round(totalWorkMinutes / totalDays) : 0,
    };
  }

  // ==================== UTILITY: NOTIFICATION MANAGEMENT ====================

  /**
   * Create notification log
   */
  private async createNotification(
    recipientId: string | Types.ObjectId,
    type: string,
    message: string,
  ): Promise<NotificationLog> {
    const notification = new this.notificationLogModel({
      to: recipientId,
      type,
      message,
    });
    return notification.save();
  }

  /**
   * Get notifications for an employee
   */
  async getNotifications(employeeId: string): Promise<NotificationLog[]> {
    return this.notificationLogModel
      .find({ to: new Types.ObjectId(employeeId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Trigger missed-punch notifications for an employee (manager test utility)
   */
  async triggerMissedPunchAlert(employeeId?: string, dateIso?: string, missingType?: string): Promise<{ message: string; processed: number }> {
    const systemSenderId = '692a056cfad7d194cd3f0992';
    const targetDate = dateIso ? new Date(dateIso) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const inOutDefault = missingType ? missingType.toUpperCase() : 'IN/OUT';

    // Build query: if employeeId provided, target that employee; otherwise scan attendance records for the target date with hasMissedPunch=true
    let records: AttendanceRecord[] = [] as any;
    if (employeeId) {
      const rec = await this.attendanceRecordModel.findOne({ employeeId: new Types.ObjectId(employeeId), 'punches.time': { $gte: dayStart, $lt: dayEnd } }).exec();
      if (rec) records = [rec as any];
    } else {
      // scan for attendance records with hasMissedPunch = true and punches within the date
      records = await this.attendanceRecordModel.find({ hasMissedPunch: true, 'punches.time': { $gte: dayStart, $lt: dayEnd } }).exec();
    }

    let processed = 0;

    for (const attendanceRecord of records) {
      const empIdStr = (attendanceRecord.employeeId || '').toString();

      // determine missing type if not provided
      const inCount = attendanceRecord.punches.filter((p) => p.type === PunchType.IN).length;
      const outCount = attendanceRecord.punches.filter((p) => p.type === PunchType.OUT).length;
      let missingTypeResolved = inOutDefault;
      if (inCount > outCount) missingTypeResolved = 'OUT';
      else if (outCount > inCount) missingTypeResolved = 'IN';

      const missedDate = dayStart.toISOString().split('T')[0];

      // create lightweight notification log for employee
      try {
        await this.createNotification(empIdStr, 'MISSED_PUNCH_ALERT', `Please correct your attendance record - missing ${missingTypeResolved} punch detected for ${missedDate}`);
      } catch (err) {
        console.error('Failed to create NotificationLog for triggerMissedPunchAlert:', err?.message || err);
      }

      // Employee notification document
      try {
        const empMsg = `You have missed today ${missingTypeResolved} punch for date ${missedDate}. If you believe this is a mistake please contact your line manager.`;
        await this.notificationService.createNotification(systemSenderId, {
          title: 'Missed Punch',
          message: empMsg,
          targetRole: 'EMPLOYEE',
          targetEmployeeIds: [empIdStr],
          sendAt: new Date(),
        } as any);
      } catch (err) {
        console.error('Failed to create employee Notification document for triggerMissedPunchAlert:', err?.message || err);
      }

      // Manager notification (resolve department head)
      try {
        const profile = await this.employeeProfileModel.findById(new Types.ObjectId(empIdStr)).select('firstName lastName primaryDepartmentId').exec();
        if (profile && profile.primaryDepartmentId) {
          const dept = await this.departmentModel.findById(profile.primaryDepartmentId).select('headPositionId').exec();
          if (dept && dept.headPositionId) {
            const manager = await this.employeeProfileModel.findOne({ primaryPositionId: dept.headPositionId }).select('_id firstName lastName').exec();
            if (manager && manager._id) {
              const empName = `${(profile as any).firstName || ''} ${(profile as any).lastName || ''}`.trim();
              const mgrMsg = `Please note that one of your department ${empIdStr} ${empName} ${missingTypeResolved} ${missedDate} please correct it manually.`;
              // Target the department head explicitly using their employee id
              await this.notificationService.createNotification(systemSenderId, {
                title: 'Missed Punch',
                message: mgrMsg,
                targetEmployeeIds: [manager._id.toString()],
                sendAt: new Date(),
              } as any);
            }
          }
        }
      } catch (err) {
        console.error('Failed to notify manager in triggerMissedPunchAlert:', err?.message || err);
      }

      processed += 1;
    }

    return { message: 'Trigger processed', processed };
  }

  // Schedule a weekly run to scan for missed punches.
  onModuleInit() {
    // Run once on startup for yesterday to catch recent missed punches
    const runNow = async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateIso = yesterday.toISOString().split('T')[0];
        await this.triggerMissedPunchAlert(undefined, dateIso, undefined);
        console.log('[TimeManagementService] Weekly missed-punch scan completed for', dateIso);
      } catch (err) {
        console.error('[TimeManagementService] Weekly missed-punch scan failed', err?.message || err);
      }
    };

    // run immediately
    runNow();

    // schedule every 1 day (24 hours)
    const ms1day = 24 * 60 * 60 * 1000;
    this.weeklyIntervalHandle = setInterval(runNow, ms1day);

    // schedule repeated lateness detection daily as well (non-invasive alerting)
    const runLatenessDetect = async () => {
      try {
        // default: last 30 days, threshold 3, notify HR positions provided by product owners
        await this.detectAndEscalateRepeatedLateness({
          threshold: 3,
          windowDays: 30,
          notifyPositionIds: ['69287f14a395a74b94e5b612', '6925fc30567bcbe7c23fcb0a'],
        });
        console.log('[TimeManagementService] Repeated lateness detection run completed');
      } catch (err) {
        console.error('[TimeManagementService] Repeated lateness detection failed', err?.message || err);
      }
    };

    // run now once and then daily
    runLatenessDetect();
    this.repeatedLatenessHandle = setInterval(runLatenessDetect, ms1day);

    // Schedule payroll synchronization daily at configured hour (default 02:00)
    try {
      const syncHour = Number(process.env.PAYROLL_SYNC_HOUR ?? 2);
      const now = new Date();
      const nextSync = new Date(now);
      nextSync.setHours(syncHour, 0, 0, 0);
      if (nextSync <= now) nextSync.setDate(nextSync.getDate() + 1);
      const msUntilSync = nextSync.getTime() - now.getTime();
      setTimeout(() => {
        this.syncWithPayroll({ dryRun: false }).catch(() => {});
        setInterval(() => this.syncWithPayroll({ dryRun: false }).catch(() => {}), ms1day);
      }, msUntilSync);
    } catch (err) {
      console.error('Failed to schedule payroll sync:', err?.message || err);
    }

    // Schedule escalation before payroll cutoff (default 23:00)
    try {
      const escHour = Number(process.env.PAYROLL_ESCALATION_HOUR ?? 23);
      const now2 = new Date();
      const nextEsc = new Date(now2);
      nextEsc.setHours(escHour, 0, 0, 0);
      if (nextEsc <= now2) nextEsc.setDate(nextEsc.getDate() + 1);
      const msUntilEsc = nextEsc.getTime() - now2.getTime();
      setTimeout(() => {
        this.escalatePendingRequests().catch(() => {});
        setInterval(() => this.escalatePendingRequests().catch(() => {}), ms1day);
      }, msUntilEsc);
    } catch (err) {
      // Silently handle error
    }
  }

  onModuleDestroy() {
    if (this.weeklyIntervalHandle) clearInterval(this.weeklyIntervalHandle);
    if (this.repeatedLatenessHandle) clearInterval(this.repeatedLatenessHandle);
  }

  // ========== ESCALATION RULES (Using existing NotificationLog schema) ==========

  /**
   * Create a new escalation rule using NotificationLog
   * Stores escalation config as JSON string in the message field
   */
  async createEscalationRule(createDto: any): Promise<any> {
    const rule = new this.notificationLogModel({
      to: null, // System-level rule
      type: 'ESCALATION_RULE',
      message: JSON.stringify({
        ruleType: createDto.ruleType,
        hoursBeforePayrollCutoff: createDto.hoursBeforePayrollCutoff,
        escalateToRoles: createDto.escalateToRoles,
        notificationTemplate: createDto.notificationTemplate,
        isActive: createDto.isActive,
      }),
    });
    await rule.save();
    return { _id: rule._id, ...createDto };
  }

  /**
   * Get all escalation rules from NotificationLog where type = 'ESCALATION_RULE'
   */
  async getAllEscalationRules(): Promise<any[]> {
    const logs = await this.notificationLogModel.find({ type: 'ESCALATION_RULE' }).exec();
    return logs.map(log => {
      try {
        const data = JSON.parse(log.message || '{}');
        return {
          _id: log._id,
          ruleType: data.ruleType,
          hoursBeforePayrollCutoff: data.hoursBeforePayrollCutoff,
          escalateToRoles: data.escalateToRoles,
          notificationTemplate: data.notificationTemplate,
          isActive: data.isActive,
        };
      } catch (e) {
        return null;
      }
    }).filter(r => r !== null);
  }

  /**
   * Update an escalation rule
   */
  async updateEscalationRule(id: string, updateDto: any): Promise<any> {
    const log = await this.notificationLogModel.findById(id).exec();
    if (!log || log.type !== 'ESCALATION_RULE') {
      throw new NotFoundException(`Escalation rule ${id} not found`);
    }
    
    const data = JSON.parse(log.message || '{}');
    if (updateDto.ruleType !== undefined) data.ruleType = updateDto.ruleType;
    if (updateDto.hoursBeforePayrollCutoff !== undefined) data.hoursBeforePayrollCutoff = updateDto.hoursBeforePayrollCutoff;
    if (updateDto.escalateToRoles !== undefined) data.escalateToRoles = updateDto.escalateToRoles;
    if (updateDto.notificationTemplate !== undefined) data.notificationTemplate = updateDto.notificationTemplate;
    if (updateDto.isActive !== undefined) data.isActive = updateDto.isActive;
    
    log.message = JSON.stringify(data);
    await log.save();
    
    return {
      _id: log._id,
      ...data,
    };
  }

  /**
   * Delete an escalation rule
   */
  async deleteEscalationRule(id: string): Promise<{ message: string }> {
    const result = await this.notificationLogModel.findOneAndDelete({ _id: id, type: 'ESCALATION_RULE' }).exec();
    if (!result) {
      throw new NotFoundException(`Escalation rule ${id} not found`);
    }
    return { message: 'Escalation rule deleted successfully' };
  }

  /**
   * Get system settings using NotificationLog for config storage
   */
  async getSystemSettings(): Promise<any> {
    let settings = await this.notificationLogModel.findOne({ 
      type: 'SYSTEM_SETTINGS',
      to: null 
    }).exec();
    
    if (!settings) {
      // Create default settings
      settings = new this.notificationLogModel({
        to: null,
        type: 'SYSTEM_SETTINGS',
        message: JSON.stringify({
          module: 'time-management',
          payrollCutoffDay: 25,
          additionalSettings: {},
        }),
      });
      await settings.save();
    }
    
    const data = JSON.parse(settings.message || '{}');
    return {
      module: data.module || 'time-management',
      payrollCutoffDay: data.payrollCutoffDay || 25,
      additionalSettings: data.additionalSettings || {},
    };
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(updateDto: any): Promise<any> {
    let settings = await this.notificationLogModel.findOne({ 
      type: 'SYSTEM_SETTINGS',
      to: null 
    }).exec();
    
    if (!settings) {
      settings = new this.notificationLogModel({
        to: null,
        type: 'SYSTEM_SETTINGS',
        message: JSON.stringify({
          module: 'time-management',
          payrollCutoffDay: updateDto.payrollCutoffDay || 25,
          additionalSettings: updateDto.additionalSettings || {},
        }),
      });
    } else {
      const data = JSON.parse(settings.message || '{}');
      if (updateDto.payrollCutoffDay !== undefined) data.payrollCutoffDay = updateDto.payrollCutoffDay;
      if (updateDto.additionalSettings !== undefined) data.additionalSettings = updateDto.additionalSettings;
      settings.message = JSON.stringify(data);
    }
    
    await settings.save();
    
    const data = JSON.parse(settings.message || '{}');
    return {
      module: data.module || 'time-management',
      payrollCutoffDay: data.payrollCutoffDay || 25,
      additionalSettings: data.additionalSettings || {},
    };
  }
}
