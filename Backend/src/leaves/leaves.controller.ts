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
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LeavesService } from './leaves.service';
import {
  getLeaveAttachmentUploadOptions,
  UPLOAD_DIRS,
  isPathSafe,
} from '../common/upload/multer.config';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { CreateLeaveCategoryDto } from './dto/create-leave-category.dto';
import { CreateLeavePolicyDto } from './dto/create-leave-policy.dto';
import { UpdateLeavePolicyDto } from './dto/update-leave-policy.dto';
import { CreateLeaveEntitlementDto } from './dto/create-leave-entitlement.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { FlagIrregularPatternDto } from './dto/flag-irregular-pattern.dto';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { LeaveStatus } from './enums/leave-status.enum';

@Controller('leaves')
@UseGuards(AuthGuard, authorizationGaurd)
export class LeavesController {
  constructor(
    private readonly leavesService: LeavesService,
  ) {}

  // ========== PHASE 1: POLICY CONFIGURATION AND SETUP ==========

  /**
   * REQ-006: Create leave category
   * Accessible by: HR Admin, System Admin
   */
  @Post('categories')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createLeaveCategory(@Body() createDto: CreateLeaveCategoryDto) {
    return this.leavesService.createLeaveCategory(createDto);
  }

  /**
   * Get all leave categories
   * Accessible by: HR roles, Managers
   */
  @Get('categories')
  @Roles(
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.SYSTEM_ADMIN,
  )
  async getAllLeaveCategories() {
    return this.leavesService.getAllLeaveCategories();
  }

  /**
   * Update leave category
   * Accessible by: HR Admin, System Admin
   */
  @Put('categories/:id')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateLeaveCategory(@Param('id') id: string, @Body() updateDto: CreateLeaveCategoryDto) {
    return this.leavesService.updateLeaveCategory(id, updateDto);
  }

  /**
   * Delete leave category
   * Accessible by: HR Admin, System Admin
   */
  @Delete('categories/:id')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async deleteLeaveCategory(@Param('id') id: string) {
    return this.leavesService.deleteLeaveCategory(id);
  }

  /**
   * REQ-006: Create and manage leave types
   * Accessible by: HR Admin, System Admin
   */
  @Post('types')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createLeaveType(@Body() createDto: CreateLeaveTypeDto) {
    return this.leavesService.createLeaveType(createDto);
  }

  /**
   * Get all leave types
   * Accessible by: All authenticated users
   */
  @Get('types')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllLeaveTypes() {
    return this.leavesService.getAllLeaveTypes();
  }

  /**
   * Get leave type by ID
   * Accessible by: All authenticated users
   */
  @Get('types/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getLeaveTypeById(@Param('id') id: string) {
    return this.leavesService.getLeaveTypeById(id);
  }

  /**
   * Update leave type
   * Accessible by: HR Admin, System Admin
   */
  @Put('types/:id')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateLeaveType(@Param('id') id: string, @Body() updateDto: CreateLeaveTypeDto) {
    return this.leavesService.updateLeaveType(id, updateDto);
  }

  /**
   * Delete leave type
   * Accessible by: HR Admin, System Admin
   */
  @Delete('types/:id')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async deleteLeaveType(@Param('id') id: string) {
    return this.leavesService.deleteLeaveType(id);
  }

  /**
   * REQ-003, REQ-009: Configure leave policy
   * Accessible by: HR Admin, System Admin
   */
  @Post('policies')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createLeavePolicy(@Body() createDto: CreateLeavePolicyDto) {
    return this.leavesService.createLeavePolicy(createDto);
  }

  /**
   * Update leave policy
   * Accessible by: HR Admin, System Admin
   */
  @Put('policies/:id')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateLeavePolicy(@Param('id') id: string, @Body() updateDto: UpdateLeavePolicyDto) {
    return this.leavesService.updateLeavePolicy(id, updateDto);
  }

  /**
   * Delete leave policy
   * Accessible by: HR Admin, System Admin
   */
  @Delete('policies/:id')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async deleteLeavePolicy(@Param('id') id: string) {
    return this.leavesService.deleteLeavePolicy(id);
  }

  /**
   * Get all leave policies
   * Accessible by: HR roles, Managers
   */
  @Get('policies')
  @Roles(
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.SYSTEM_ADMIN,
  )
  async getAllLeavePolicies() {
    return this.leavesService.getAllLeavePolicies();
  }

  /**
   * Get leave policy by leave type
   * Accessible by: HR roles, Managers
   */
  @Get('policies/type/:leaveTypeId')
  @Roles(
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.SYSTEM_ADMIN,
  )
  async getLeavePolicyByType(@Param('leaveTypeId') leaveTypeId: string) {
    return this.leavesService.getLeavePolicyByType(leaveTypeId);
  }

  /**
   * REQ-008: Assign personalized entitlements
   * Accessible by: HR Admin, HR Manager
   */
  @Post('entitlements')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.NEW_HIRE)
  async createLeaveEntitlement(@Body() createDto: CreateLeaveEntitlementDto) {
    return this.leavesService.createLeaveEntitlement(createDto);
  }

  /**
   * Bulk assign entitlements to all employees based on policies
   * Accessible by: HR Admin, System Admin
   */
  @Post('entitlements/bulk-assign')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async bulkAssignEntitlements(@Body() body?: { policyId?: string; positionId?: string; contractType?: string }) {
    return this.leavesService.bulkAssignEntitlements(body?.policyId, body?.positionId, body?.contractType);
  }

  /**
   * REQ-010: Configure calendar & blocked days
   * Accessible by: HR Admin, System Admin
   */
  @Post('calendars')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createCalendar(@Body() createDto: CreateCalendarDto) {
    return this.leavesService.createCalendar(createDto);
  }

  /**
   * Get calendar by year
   * Accessible by: All authenticated users
   */
  @Get('calendars/:year')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getCalendarByYear(@Param('year') year: number) {
    return this.leavesService.getCalendarByYear(year);
  }

  // ========== PHASE 2: LEAVE REQUEST MANAGEMENT & WORKFLOW ==========

  /**
   * REQ-015: Submit new leave request
   * Accessible by: Employees
   */
  @Post('requests')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async submitLeaveRequest(@Body() createDto: CreateLeaveRequestDto) {
    return this.leavesService.submitLeaveRequest(createDto);
  }

  /**
   * REQ-017: Modify pending request
   * Accessible by: Employee (own requests)
   */
  @Put('requests/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async updateLeaveRequest(@Param('id') id: string, @Body() updateDto: UpdateLeaveRequestDto) {
    return this.leavesService.updateLeaveRequest(id, updateDto);
  }

  /**
   * REQ-018: Cancel pending request
   * Accessible by: Employee (own requests), HR Admin
   */
  @Delete('requests/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async cancelLeaveRequest(@Param('id') id: string) {
    return this.leavesService.cancelLeaveRequest(id);
  }

  /**
   * Get leave requests with filters
   * Accessible by: Employees (own), Managers (team), HR (all)
   */
  @Get('requests')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getLeaveRequests(
    @Query('employeeId') employeeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.leavesService.getLeaveRequests({
      employeeId,
      leaveTypeId,
      status,
      dateFrom,
      dateTo,
    });
  }

  /**
   * Get requests pending HR finalization
   * Accessible by: HR Admin, HR Manager
   * NOTE: This route MUST be defined before 'requests/:id' to avoid route collision
   */
  @Get('requests/pending-hr-finalization')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER)
  async getRequestsPendingHRFinalization() {
    return this.leavesService.getRequestsPendingHRFinalization();
  }

  /**
   * Get requests available for HR override
   * Accessible by: HR Admin, HR Manager
   * NOTE: This route MUST be defined before 'requests/:id' to avoid route collision
   */
  @Get('requests/for-override')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER)
  async getRequestsForOverride() {
    return this.leavesService.getRequestsForOverride();
  }

  /**
   * REQ-028: Get requests requiring medical verification
   * Accessible by: HR Admin, HR Manager
   * NOTE: This route MUST be defined before 'requests/:id' to avoid route collision
   */
  @Get('requests/medical-verification')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER)
  async getRequestsRequiringMedicalVerification() {
    return this.leavesService.getRequestsRequiringMedicalVerification();
  }

  /**
   * REQ-020: Get leave requests by department for manager review
   * Accessible by: Managers (Department Head, HR Manager)
   * NOTE: This route MUST be defined before 'requests/:id' to avoid route collision
   */
  @Get('requests/department/:departmentId')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async getLeaveRequestsByDepartment(
    @Param('departmentId') departmentId: string,
    @Query('status') status?: LeaveStatus,
  ) {
    return this.leavesService.getLeaveRequestsByDepartment(departmentId, status);
  }

  /**
   * Get leave request by ID
   * Accessible by: Employees (own), Managers (team), HR (all)
   * NOTE: This parameterized route MUST come AFTER all specific 'requests/...' routes
   */
  @Get('requests/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getLeaveRequestById(@Param('id') id: string) {
    return this.leavesService.getLeaveRequestById(id);
  }

  /**
   * REQ-021: Approve leave request
   * Accessible by: Managers (Manager approval), HR Admin (HR approval)
   */
  @Post('requests/:id/approve')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async approveLeaveRequest(@Param('id') id: string, @Body() approvalDto: ApproveLeaveDto) {
    return this.leavesService.approveLeaveRequest(id, approvalDto);
  }

  /**
   * REQ-022: Reject leave request
   * Accessible by: Managers (Manager approval), HR Admin (HR approval)
   */
  @Post('requests/:id/reject')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async rejectLeaveRequest(@Param('id') id: string, @Body() rejectionDto: RejectLeaveDto) {
    return this.leavesService.rejectLeaveRequest(id, rejectionDto);
  }

  // ========== PHASE 3: TRACKING, MONITORING, AND AUDITING ==========

  /**
   * REQ-031: Employee view current balance
   * Accessible by: Employees (own), Managers (team), HR (all)
   */
  @Get('balances/employee/:employeeId')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getEmployeeLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    return this.leavesService.getEmployeeLeaveBalance(employeeId, leaveTypeId);
  }

  /**
   * REQ-032: Employee view past history
   * Accessible by: Employees (own), Managers (team), HR (all)
   */
  @Get('history/employee/:employeeId')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getEmployeeLeaveHistory(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.leavesService.getEmployeeLeaveHistory(employeeId, {
      leaveTypeId,
      status,
      dateFrom,
      dateTo,
    });
  }

  /**
   * REQ-034: Manager view team balances
   * Accessible by: Managers, HR
   */
  @Post('balances/team')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getTeamLeaveBalances(@Body() body: { teamMemberIds: string[] }) {
    return this.leavesService.getTeamLeaveBalances(body.teamMemberIds);
  }

  /**
   * REQ-039: Flag irregular patterns
   * Accessible by: Managers, HR
   */
  @Post('requests/flag-irregular')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async flagIrregularPattern(@Body() flagDto: FlagIrregularPatternDto) {
    return this.leavesService.flagIrregularPattern(flagDto);
  }

  /**
   * REQ-013: Manual balance adjustment
   * Accessible by: HR Admin
   */
  @Post('adjustments')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async createManualAdjustment(@Body() createDto: CreateAdjustmentDto) {
    return this.leavesService.createManualAdjustment(createDto);
  }

  /**
   * Get adjustment history for employee
   * Accessible by: HR Admin, HR Manager
   */
  @Get('adjustments/employee/:employeeId')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getAdjustmentHistory(@Param('employeeId') employeeId: string) {
    return this.leavesService.getAdjustmentHistory(employeeId);
  }

  /**
   * REQ-040: Process monthly accrual (triggered by system/HR)
   * Accessible by: HR Admin, System Admin
   */
  @Post('accrual/monthly')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async processMonthlyAccrual(@Body() body: { employeeId: string; leaveTypeId: string }) {
    return this.leavesService.processMonthlyAccrual(body.employeeId, body.leaveTypeId);
  }

  /**
   * REQ-041: Process year-end carry-forward (triggered by system/HR)
   * Accessible by: HR Admin, System Admin
   */
  @Post('carry-forward/year-end')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async processYearEndCarryForward(@Body() body: { employeeId: string; leaveTypeId: string }) {
    return this.leavesService.processYearEndCarryForward(body.employeeId, body.leaveTypeId);
  }

  /**
   * REQ-016: Upload attachment with file
   * Accessible by: Employees, HR
   */
  @Post('attachments/upload')
  @UseInterceptors(FileInterceptor('file', getLeaveAttachmentUploadOptions()))
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async uploadAttachmentFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Store relative path for database (e.g., "leaves/attachments/filename.pdf")
    const relativePath = path.join('leaves', 'attachments', file.filename);

    // Create attachment record with disk file metadata
    const attachment = await this.leavesService.uploadAttachmentWithDisk({
      originalName: file.originalname,
      filePath: relativePath,
      fileType: file.mimetype,
      size: file.size,
    });
    
    return attachment;
  }

  /**
   * REQ-016: Upload attachment (legacy - metadata only)
   * Accessible by: Employees, HR
   */
  @Post('attachments')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async uploadAttachment(@Body() uploadDto: UploadAttachmentDto) {
    return this.leavesService.uploadAttachment(uploadDto);
  }

  /**
   * Get attachment by ID
   * Accessible by: Employees (own), Managers (team), HR (all)
   */
  @Get('attachments/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAttachmentById(@Param('id') id: string) {
    return this.leavesService.getAttachmentById(id);
  }

  /**
   * Download attachment file
   * Accessible by: Employees (own), Managers (team), HR (all)
   */
  @Get('attachments/:id/download')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async downloadAttachment(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const attachment = await this.leavesService.getAttachmentById(id);
    
    // Get file from disk storage
    if (!attachment.filePath) {
      throw new NotFoundException('No file associated with this attachment');
    }

    // Build absolute path safely
    const uploadsBase = path.join(process.cwd(), 'uploads');
    const absolutePath = path.resolve(uploadsBase, attachment.filePath);

    // Security: Prevent path traversal attacks
    if (!absolutePath.startsWith(uploadsBase)) {
      throw new BadRequestException('Invalid file path');
    }

    // Check file exists
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('File not found on disk');
    }

    const fileStream = fs.createReadStream(absolutePath);
    
    res.set({
      'Content-Type': attachment.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
    });

    return new StreamableFile(fileStream);
  }

  // ========== PHASE 4: HR FINALIZATION AND ADVANCED OPERATIONS ==========

  /**
   * REQ-025: HR Finalize Approved Requests
   * Accessible by: HR Admin, HR Manager
   */
  @Post('requests/:id/hr-finalize')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER)
  async hrFinalizeLeaveRequest(
    @Param('id') id: string,
    @Body() body: { hrUserId: string; comments?: string },
  ) {
    return this.leavesService.hrFinalizeLeaveRequest(id, body.hrUserId, body.comments);
  }

  /**
   * REQ-026: HR Override Manager Decision
   * Accessible by: HR Admin, HR Manager
   */
  @Post('requests/:id/hr-override')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER)
  async hrOverrideManagerDecision(
    @Param('id') id: string,
    @Body() body: { 
      hrUserId: string; 
      newDecision: 'approved' | 'rejected'; 
      reason: string;
      allowNegativeBalance?: boolean;
    },
  ) {
    return this.leavesService.hrOverrideManagerDecision(
      id,
      body.hrUserId,
      body.newDecision,
      body.reason,
      body.allowNegativeBalance,
    );
  }

  /**
   * REQ-027: Bulk Request Processing
   * Accessible by: HR Admin, HR Manager
   */
  @Post('requests/bulk-process')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER)
  async bulkProcessLeaveRequests(
    @Body() body: { 
      requestIds: string[]; 
      action: 'approve' | 'reject'; 
      hrUserId: string;
      reason?: string;
    },
  ) {
    return this.leavesService.bulkProcessLeaveRequests(
      body.requestIds,
      body.action,
      body.hrUserId,
      body.reason,
    );
  }

  /**
   * REQ-028: Verify medical document
   * Accessible by: HR Admin, HR Manager
   */
  @Post('requests/:id/verify-medical')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER)
  async verifyMedicalDocument(
    @Param('id') id: string,
    @Body() body: { hrUserId: string; verified: boolean; notes?: string },
  ) {
    return this.leavesService.verifyMedicalDocument(id, body.hrUserId, body.verified, body.notes);
  }
}
