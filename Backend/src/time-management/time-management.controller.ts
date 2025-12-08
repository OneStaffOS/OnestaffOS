import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TimeManagementService } from './time-management.service';
import { OfflineSyncService } from './services/offline-sync.service';
import { BackupRetentionService } from './services/backup-retention.service';
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
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  ShiftAssignmentStatus,
  CorrectionRequestStatus,
  TimeExceptionStatus,
  TimeExceptionType,
} from './models/enums/index';

@Controller('time-management')
@UseGuards(AuthGuard, authorizationGaurd)
export class TimeManagementController {
  constructor(
    private readonly timeManagementService: TimeManagementService,
    private readonly offlineSyncService: OfflineSyncService,
    private readonly backupRetentionService: BackupRetentionService,
  ) {}

  // ========== PHASE 1: SHIFT TYPE CONFIGURATION ==========

  /**
   * US-2: Create shift type
   * Accessible by: HR Manager, System Admin
   */
  @Post('shift-types')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createShiftType(@Body() createDto: CreateShiftTypeDto) {
    return this.timeManagementService.createShiftType(createDto);
  }

  /**
   * Get all shift types
   * Accessible by: HR roles, Managers
   */
  @Get('shift-types')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllShiftTypes(@Query('includeInactive') includeInactive?: string) {
    return this.timeManagementService.getAllShiftTypes(includeInactive === 'true');
  }

  /**
   * Get shift type by ID
   * Accessible by: HR roles, Managers
   */
  @Get('shift-types/:id')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getShiftTypeById(@Param('id') id: string) {
    return this.timeManagementService.getShiftTypeById(id);
  }

  /**
   * Deactivate shift type
   * Accessible by: HR Manager, System Admin
   */
  @Put('shift-types/:id/deactivate')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async deactivateShiftType(@Param('id') id: string) {
    return this.timeManagementService.deactivateShiftType(id);
  }

  // ========== PHASE 1: SHIFT CONFIGURATION ==========

  /**
   * US-2: Create shift configuration
   * Accessible by: HR Manager, System Admin
   */
  @Post('shifts')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createShift(@Body() createDto: CreateShiftDto) {
    return this.timeManagementService.createShift(createDto);
  }

  /**
   * Get all shifts
   * Accessible by: HR roles, Managers
   */
  @Get('shifts')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllShifts(@Query('includeInactive') includeInactive?: string) {
    return this.timeManagementService.getAllShifts(includeInactive === 'true');
  }

  /**
   * Get shift by ID
   * Accessible by: HR roles, Managers
   */
  @Get('shifts/:id')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getShiftById(@Param('id') id: string) {
    return this.timeManagementService.getShiftById(id);
  }

  /**
   * Update shift
   * Accessible by: HR Manager, System Admin
   */
  @Put('shifts/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateShift(@Param('id') id: string, @Body() updateDto: UpdateShiftDto) {
    return this.timeManagementService.updateShift(id, updateDto);
  }

  // ========== PHASE 1: SHIFT ASSIGNMENT MANAGEMENT ==========

  /**
   * US-1: Create shift assignment (individual, department, or position-based)
   * Accessible by: HR Admin, System Admin
   */
  @Post('shift-assignments')
  @Roles(Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async createShiftAssignment(@Body() createDto: CreateShiftAssignmentDto) {
    return this.timeManagementService.createShiftAssignment(createDto);
  }

  /**
   * Get shift assignments with filters
   * Accessible by: HR roles, Managers
   */
  @Get('shift-assignments')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getShiftAssignments(
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('positionId') positionId?: string,
    @Query('status') status?: ShiftAssignmentStatus,
  ) {
    return this.timeManagementService.getShiftAssignments({
      employeeId,
      departmentId,
      positionId,
      status,
    });
  }

  /**
   * Update shift assignment status
   * Accessible by: HR Admin, System Admin
   */
  @Put('shift-assignments/:id/status')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateShiftAssignmentStatus(
    @Param('id') id: string,
    @Body() body: { status: ShiftAssignmentStatus },
  ) {
    return this.timeManagementService.updateShiftAssignmentStatus(id, body.status);
  }

  /**
   * Update shift assignment
   * Accessible by: HR Admin, System Admin
   */
  @Put('shift-assignments/:id')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateShiftAssignment(
    @Param('id') id: string,
    @Body() updateDto: UpdateShiftAssignmentDto,
  ) {
    return this.timeManagementService.updateShiftAssignment(id, updateDto);
  }

  /**
   * US-4: Check for expiring shifts
   * Accessible by: HR Admin, System Admin
   */
  @Post('shift-assignments/check-expiring')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async checkExpiringShifts(@Query('daysBeforeExpiry') daysBeforeExpiry?: number) {
    await this.timeManagementService.checkExpiringShifts(
      daysBeforeExpiry ? parseInt(daysBeforeExpiry.toString()) : 7,
    );
    return { message: 'Expiring shifts checked and notifications sent' };
  }

  /**
   * Mark expired shift assignments
   * Accessible by: HR Admin, System Admin
   */
  @Post('shift-assignments/mark-expired')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async markExpiredShifts() {
    await this.timeManagementService.markExpiredShifts();
    return { message: 'Expired shifts marked' };
  }

  // ========== PHASE 1: CUSTOM SCHEDULING RULES ==========

  /**
   * US-3: Create custom scheduling rule
   * Accessible by: HR Manager, System Admin
   */
  @Post('schedule-rules')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createScheduleRule(@Body() createDto: CreateScheduleRuleDto) {
    return this.timeManagementService.createScheduleRule(createDto);
  }

  /**
   * Get all schedule rules
   * Accessible by: HR roles, Managers
   */
  @Get('schedule-rules')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllScheduleRules(@Query('includeInactive') includeInactive?: string) {
    return this.timeManagementService.getAllScheduleRules(includeInactive === 'true');
  }

  /**
   * Update schedule rule
   * Accessible by: HR Manager, System Admin
   */
  @Put('schedule-rules/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateScheduleRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateScheduleRuleDto,
  ) {
    return this.timeManagementService.updateScheduleRule(id, updateDto);
  }

  // ========== PHASE 2: ATTENDANCE RECORDING ==========

  /**
   * US-5: Employee clock in/out
   * Accessible by: All authenticated employees
   */
  @Post('attendance/clock')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async clockPunch(@Request() req, @Body() punchDto: ClockPunchDto) {
    return this.timeManagementService.clockPunch(req.user.employeeId, punchDto);
  }

  /**
   * US-5: Employee clock in/out using employee number (for kiosk/external systems)
   * Public endpoint - no authentication required (for physical time clocks/kiosks)
   */
  @Public()
  @Post('attendance/clock-by-id')
  async clockPunchById(@Body() punchDto: ClockPunchByIdDto) {
    return this.timeManagementService.clockPunchById(punchDto);
  }

  /**
   * Get attendance records from CSV file
   * Accessible by: All authenticated users
   */
  @Get('attendance/csv-records')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAttendanceFromCSV(@Query('employeeNumber') employeeNumber?: string) {
    return this.timeManagementService.getAttendanceFromCSV(employeeNumber);
  }

  /**
   * US-6: Manual attendance correction (Line Manager)
   * Accessible by: Department Managers, Head of Department, HR roles
   */
  @Post('attendance/manual-correction')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async manualAttendanceCorrection(@Body() correctionDto: ManualAttendanceCorrectionDto) {
    return this.timeManagementService.manualAttendanceCorrection(correctionDto);
  }

  /**
   * Get attendance records
   * Accessible by: Managers (for their team), HR roles, Payroll roles, Employees (own records)
   */
  @Get('attendance/records')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.PAYROLL_SPECIALIST,
    Role.PAYROLL_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async getAttendanceRecords(
    @Request() req,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Payroll officers and HR can query all records (no employeeId filter)
    // Regular employees can only see their own records
    const isPayrollOrHR = req.user.roles?.some((role: string) => 
      ['Payroll Specialist', 'Payroll Manager', 'HR Manager', 'HR Admin', 'System Admin'].includes(role)
    );
    
    const targetEmployeeId = isPayrollOrHR ? employeeId : (employeeId || req.user.employeeId);

    return this.timeManagementService.getAttendanceRecords(
      targetEmployeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ========== PHASE 3: ATTENDANCE CORRECTION REQUESTS ==========

  /**
   * US-13: Submit correction request (Employee)
   * Accessible by: All authenticated employees
   */
  @Post('correction-requests')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async createCorrectionRequest(
    @Request() req,
    @Body() createDto: CreateCorrectionRequestDto,
  ) {
    return this.timeManagementService.createCorrectionRequest(
      req.user.employeeId,
      createDto,
    );
  }

  /**
   * Employee: Get my correction requests
   * Accessible by: All authenticated employees
   */
  @Get('correction-requests/my')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getMyCorrectionRequests(@Request() req) {
    return this.timeManagementService.getCorrectionRequests({ employeeId: req.user.employeeId });
  }

  /**
   * Get correction requests
   * Accessible by: Managers (for review), HR roles
   */
  @Get('correction-requests')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async getCorrectionRequests(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: CorrectionRequestStatus,
  ) {
    return this.timeManagementService.getCorrectionRequests({ employeeId, status });
  }

  /**
   * US-14: Process correction request (approve/reject)
   * Accessible by: Department Managers, HR roles
   */
  @Put('correction-requests/:id/process')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async processCorrectionRequest(
    @Param('id') id: string,
    @Body() processDto: ProcessCorrectionRequestDto,
  ) {
    return this.timeManagementService.processCorrectionRequest(id, processDto);
  }

  // ========== PHASE 3: POLICY & RULE ENFORCEMENT ==========

  /**
   * US-10: Create overtime rule
   * Accessible by: HR Manager, System Admin
   */
  @Post('overtime-rules')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createOvertimeRule(@Body() createDto: CreateOvertimeRuleDto) {
    return this.timeManagementService.createOvertimeRule(createDto);
  }

  /**
   * Get all overtime rules
   * Accessible by: HR roles, Managers
   */
  @Get('overtime-rules')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllOvertimeRules(@Query('includeInactive') includeInactive?: string) {
    return this.timeManagementService.getAllOvertimeRules(includeInactive === 'true');
  }

  /**
   * Update overtime rule
   * Accessible by: HR Manager, System Admin
   */
  @Put('overtime-rules/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateOvertimeRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateOvertimeRuleDto,
  ) {
    return this.timeManagementService.updateOvertimeRule(id, updateDto);
  }

  /**
   * Approve overtime rule (HR Admin or HR Manager)
   */
  @Post('overtime-rules/:id/approve')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async approveOvertimeRule(@Param('id') id: string) {
    return this.timeManagementService.approveOvertimeRule(id);
  }

  /**
   * US-11: Create lateness rule
   * Accessible by: HR Manager, System Admin
   */
  @Post('lateness-rules')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createLatenessRule(@Body() createDto: CreateLatenessRuleDto) {
    return this.timeManagementService.createLatenessRule(createDto);
  }

  /**
   * Get all lateness rules
   * Accessible by: HR roles, Managers
   */
  @Get('lateness-rules')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllLatenessRules(@Query('includeInactive') includeInactive?: string) {
    return this.timeManagementService.getAllLatenessRules(includeInactive === 'true');
  }

  /**
   * Update lateness rule
   * Accessible by: HR Manager, System Admin
   */
  @Put('lateness-rules/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateLatenessRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateLatenessRuleDto,
  ) {
    return this.timeManagementService.updateLatenessRule(id, updateDto);
  }

  /**
   * US-12: Get repeated lateness report
   * Accessible by: HR Manager, HR Admin
   */
  @Get('reports/repeated-lateness')
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async getRepeatedLatenessReport(
    @Query('employeeId') employeeId?: string,
    @Query('threshold') threshold?: number,
  ) {
    return this.timeManagementService.getRepeatedLatenessReport(
      employeeId,
      threshold ? parseInt(threshold.toString()) : 3,
    );
  }

  @Get('reports/repeated-lateness/department')
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async getRepeatedLatenessReportForDepartment(
    @Query('departmentId') departmentId?: string,
    @Query('threshold') threshold?: string,
    @Query('windowDays') windowDays?: string,
  ) {
    if (!departmentId) {
      return [];
    }
    const thr = threshold ? Number(threshold) : undefined;
    const wnd = windowDays ? Number(windowDays) : undefined;
    return this.timeManagementService.getRepeatedLatenessReportByDepartment(departmentId, thr ?? 3, wnd ?? 30);
  }

  /**
   * Run repeated lateness detection and notify target positions.
   * Accessible by: HR Manager, HR Admin, System Admin
   */
  @Post('reports/repeated-lateness/run')
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async runRepeatedLatenessDetection(@Body() body?: { threshold?: number; windowDays?: number; positionIds?: string[] }) {
    const threshold = body?.threshold ?? 3;
    const windowDays = body?.windowDays ?? 30;
    const positionIds = body?.positionIds ?? [];

    return this.timeManagementService.detectAndEscalateRepeatedLateness({
      threshold,
      windowDays,
      notifyPositionIds: positionIds,
    });
  }

  // ========== PHASE 4: TIME EXCEPTION WORKFLOW ==========

  /**
   * Create time exception
   * Accessible by: Managers, HR roles
   */
  @Post('time-exceptions')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
  )
  async createTimeException(@Request() req, @Body() createDto: CreateTimeExceptionDto) {
    // Create time exception request (server will enforce employeeId and validations)
    // Ensure employeeId and other server-controlled properties are assigned by the server
    return this.timeManagementService.createTimeException(req.user.employeeId, createDto);
  }

  /**
   * US-14: Process time exception
   * Accessible by: Department Managers, HR roles
   */
  @Put('time-exceptions/:id/process')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async processTimeException(
    @Request() req,
    @Param('id') id: string,
    @Body() processDto: ProcessTimeExceptionDto,
  ) {
    // Only managers/hr/sysadmin roles can reach here (roles enforced by decorator).
    const processorId = req.user?.employeeId;
    return this.timeManagementService.processTimeException(id, processDto, processorId);
  }

  /**
   * Attach a time exception to its attendance record and mark it approved for payroll processing
   * Accessible by: Managers, HR roles, System Admin
   */
  @Post('time-exceptions/:id/attach')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async attachTimeExceptionToAttendance(@Request() req, @Param('id') id: string) {
    const processorId = req.user?.employeeId;
    return this.timeManagementService.attachTimeExceptionToAttendance(id, processorId);
  }

  /**
   * Get time exceptions
   * Accessible by: Managers (for assigned exceptions), HR roles
   */
  @Get('time-exceptions')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_SPECIALIST,
    Role.SYSTEM_ADMIN,
  )
  async getTimeExceptions(
    @Query('employeeId') employeeId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('status') status?: TimeExceptionStatus,
    @Query('type') type?: TimeExceptionType,
  ) {
    return this.timeManagementService.getTimeExceptions({
      employeeId,
      assignedTo,
      status,
      type,
    });
  }

  /**
   * US-18: Escalate pending requests before payroll cutoff
   * Accessible by: HR Admin, System Admin
   */
  @Post('escalate-pending')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async escalatePendingRequests() {
    await this.timeManagementService.escalatePendingRequests();
    return { message: 'Pending requests escalated successfully' };
  }

  /**
   * US-16/20: Trigger payroll synchronization for a specified window.
   * Accessible by: HR Admin, System Admin
   */
  @Post('payroll/sync')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async syncWithPayroll(@Body() body?: { startDate?: string; endDate?: string; dryRun?: boolean }) {
    const start = body?.startDate ? new Date(body.startDate) : undefined;
    const end = body?.endDate ? new Date(body.endDate) : undefined;
    const dryRun = !!body?.dryRun;
    return this.timeManagementService.syncWithPayroll({ startDate: start, endDate: end, dryRun });
  }

  /**
   * US-19: Export reports as CSV for external download
   * Accessible by: HR roles, Payroll
   * query param `type` = overtime | lateness | attendance
   */
  @Get('reports/export')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async exportReport(@Query('type') type: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string, @Query('employeeId') employeeId?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.timeManagementService.exportReportCSV(type, { start, end, employeeId });
  }

  // ========== PHASE 4: HOLIDAY & REST DAY CONFIGURATION ==========

  /**
   * US-17: Create holiday
   * Accessible by: HR Admin, System Admin
   */
  @Post('holidays')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createHoliday(@Body() createDto: CreateHolidayDto) {
    return this.timeManagementService.createHoliday(createDto);
  }

  /**
   * Convenience endpoint to create holiday from HR UI for admins
   * Protected by HR Admin role already above
   */

  /**
   * Get all holidays
   * Accessible by: All authenticated employees
   */
  @Get('holidays')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllHolidays(@Query('type') type?: string, @Query('year') year?: number) {
    return this.timeManagementService.getAllHolidays({
      type,
      year: year ? parseInt(year.toString()) : undefined,
    });
  }

  /**
   * Convenience GET endpoints used by front-end (already exists but ensure paths)
   */
  @Get('overtime-rules/list')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async listOvertimeRules(@Query('includeInactive') includeInactive?: string) {
    return this.timeManagementService.getAllOvertimeRules(includeInactive === 'true');
  }

  @Get('holidays/list')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async listHolidays(@Query('type') type?: string, @Query('year') year?: number) {
    return this.timeManagementService.listHolidays({ type, year: year ? parseInt(year.toString()) : undefined });
  }

  /**
   * Update holiday
   * Accessible by: HR Admin, System Admin
   */
  @Put('holidays/:id')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateHoliday(@Param('id') id: string, @Body() updateDto: UpdateHolidayDto) {
    return this.timeManagementService.updateHoliday(id, updateDto);
  }

  /**
   * Check if a date is a holiday
   * Accessible by: All authenticated employees
   */
  @Get('holidays/check')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async isHoliday(@Query('date') date: string) {
    const isHoliday = await this.timeManagementService.isHoliday(new Date(date));
    return { date, isHoliday };
  }

  // ========== VACATION PACKAGE INTEGRATION (US-16) ==========

  /** Create vacation package (HR Manager or System Admin) */
  @Post('vacation/packages')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createVacationPackage(@Body() createDto: any) {
    return this.timeManagementService.createVacationPackage(createDto);
  }

  /** Map package to employee */
  @Post('vacation/mappings')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createEmployeeVacation(@Body() createDto: any) {
    return this.timeManagementService.createEmployeeVacation(createDto);
  }

  /** Apply leave and update attendance records */
  @Post('vacation/apply')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async applyLeave(@Body() applyDto: any) {
    return this.timeManagementService.applyLeave(applyDto);
  }

  // ========== PHASE 5: REPORTING & ANALYTICS ==========

  /**
   * US-19: Generate overtime report
   * Accessible by: HR Officer, Payroll Officer, HR roles
   */
  @Get('reports/overtime')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
  async generateOvertimeReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.timeManagementService.generateOvertimeReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * US-19: Generate lateness report
   * Accessible by: HR Officer, Payroll Officer, HR roles
   */
  @Get('reports/lateness')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
  async generateLatenessReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.timeManagementService.generateLatenessReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * US-19: Generate attendance summary
   * Accessible by: Managers (for team), HR roles, Employees (own summary)
   */
  @Get('reports/attendance-summary')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async generateAttendanceSummary(
    @Request() req,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const targetEmployeeId = employeeId || req.user.employeeId;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    return this.timeManagementService.generateAttendanceSummary(
      targetEmployeeId,
      start,
      end,
    );
  }

  // ========== UTILITY: NOTIFICATIONS ==========

  /**
   * Get my notifications
   * Accessible by: All authenticated employees
   */
  @Get('notifications')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getNotifications(@Request() req) {
    return this.timeManagementService.getNotifications(req.user.employeeId);
  }

  /**
   * Manager test endpoint: trigger missed-punch notifications for a given employee
   */
  @Post('attendance/trigger-missed')
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async triggerMissed(@Body() body?: { employeeId?: string; date?: string; missingType?: string }) {
    // If no body provided, service will scan attendance records for today's missed punches
    const empId = body?.employeeId;
    const date = body?.date;
    const missingType = body?.missingType;
    return this.timeManagementService.triggerMissedPunchAlert(empId, date, missingType);
  }

  // ========== BR-TM-13: OFFLINE SYNC ENDPOINTS ==========

  /**
   * Queue offline punches from reconnected device
   * Accessible by: System Admin, HR Admin (device sync)
   */
  @Post('offline-sync/queue')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async queueOfflinePunches(
    @Body() body: { deviceId: string; punches: any[] }
  ) {
    this.offlineSyncService.queueBulkOfflinePunches(body.deviceId, body.punches);
    return { message: 'Punches queued for sync', count: body.punches.length };
  }

  /**
   * Get sync queue status
   * Accessible by: System Admin, HR Admin
   */
  @Get('offline-sync/status')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER)
  async getSyncStatus() {
    return this.offlineSyncService.getQueueStatus();
  }

  /**
   * Manually trigger sync for a specific device
   * Accessible by: System Admin, HR Admin
   */
  @Post('offline-sync/sync-device/:deviceId')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async syncDevice(@Param('deviceId') deviceId: string) {
    return this.offlineSyncService.syncDevice(deviceId);
  }

  /**
   * Clear queue for a device
   * Accessible by: System Admin only
   */
  @Post('offline-sync/clear-queue/:deviceId')
  @Roles(Role.SYSTEM_ADMIN)
  async clearQueue(@Param('deviceId') deviceId: string) {
    const count = this.offlineSyncService.clearDeviceQueue(deviceId);
    return { message: 'Queue cleared', count };
  }

  // ========== BR-TM-25: BACKUP & RETENTION ENDPOINTS ==========

  /**
   * Create manual backup
   * Accessible by: System Admin, HR Admin
   */
  @Post('backup/create')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async createBackup() {
    return this.backupRetentionService.createBackup();
  }

  /**
   * List all available backups
   * Accessible by: System Admin, HR Admin, HR Manager
   */
  @Get('backup/list')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER)
  async listBackups() {
    return this.backupRetentionService.listBackups();
  }

  /**
   * Restore from backup
   * Accessible by: System Admin only
   */
  @Post('backup/restore/:backupId')
  @Roles(Role.SYSTEM_ADMIN)
  async restoreBackup(@Param('backupId') backupId: string) {
    return this.backupRetentionService.restoreBackup(backupId);
  }

  /**
   * Clean up old backups manually
   * Accessible by: System Admin, HR Admin
   */
  @Post('backup/cleanup')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async cleanupBackups() {
    const deletedCount = await this.backupRetentionService.cleanupOldBackups();
    return { message: 'Cleanup completed', deletedCount };
  }

  /**
   * Get backup configuration
   * Accessible by: System Admin, HR Admin
   */
  @Get('backup/config')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async getBackupConfig() {
    return this.backupRetentionService.getConfig();
  }

  /**
   * Update backup configuration
   * Accessible by: System Admin only
   */
  @Put('backup/config')
  @Roles(Role.SYSTEM_ADMIN)
  async updateBackupConfig(@Body() config: any) {
    this.backupRetentionService.updateConfig(config);
    return { message: 'Configuration updated', config: this.backupRetentionService.getConfig() };
  }

  // ========== ESCALATION RULES (Stored in NotificationLog) ==========

  /**
   * Create escalation rule
   * Accessible by: System Admin, HR Admin
   */
  @Post('escalation-rules')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async createEscalationRule(@Body() createDto: any) {
    return this.timeManagementService.createEscalationRule(createDto);
  }

  /**
   * Get all escalation rules
   * Accessible by: System Admin, HR Admin, HR Manager
   */
  @Get('escalation-rules')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER)
  async getAllEscalationRules() {
    return this.timeManagementService.getAllEscalationRules();
  }

  /**
   * Update escalation rule
   * Accessible by: System Admin, HR Admin
   */
  @Put('escalation-rules/:id')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async updateEscalationRule(
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.timeManagementService.updateEscalationRule(id, updateDto);
  }

  /**
   * Delete escalation rule
   * Accessible by: System Admin, HR Admin
   */
  @Delete('escalation-rules/:id')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async deleteEscalationRule(@Param('id') id: string) {
    return this.timeManagementService.deleteEscalationRule(id);
  }

  /**
   * Get system settings
   * Accessible by: System Admin, HR Admin, HR Manager
   */
  @Get('settings')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER)
  async getSystemSettings() {
    return this.timeManagementService.getSystemSettings();
  }

  /**
   * Update system settings
   * Accessible by: System Admin, HR Admin
   */
  @Put('settings')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async updateSystemSettings(@Body() settings: any) {
    return this.timeManagementService.updateSystemSettings(settings);
  }
}
