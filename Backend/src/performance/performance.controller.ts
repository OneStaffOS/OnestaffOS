import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { CreateAppraisalTemplateDto } from './dto/create-appraisal-template.dto';
import { UpdateAppraisalTemplateDto } from './dto/update-appraisal-template.dto';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpdateAppraisalCycleDto } from './dto/update-appraisal-cycle.dto';
import { CreateBulkAssignmentDto } from './dto/create-bulk-assignment.dto';
import { CreateAppraisalRatingDto } from './dto/create-appraisal-rating.dto';
import { UpdateAppraisalRatingDto } from './dto/update-appraisal-rating.dto';
import { AcknowledgeAppraisalDto } from './dto/acknowledge-appraisal.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';

@Controller('performance')
@UseGuards(AuthGuard, authorizationGaurd)
export class PerformanceController {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly employeeProfileService: EmployeeProfileService,
  ) {}

  // ========== PHASE 1: TEMPLATE MANAGEMENT ==========

  /**
   * REQ-PP-01: Create appraisal template
   * Accessible by: HR Manager, System Admin
   */
  @Post('templates')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createAppraisalTemplate(@Body() createDto: CreateAppraisalTemplateDto) {
    return this.performanceService.createAppraisalTemplate(createDto);
  }

  /**
   * Get all appraisal templates
   * Accessible by: HR roles, Managers, System Admin
   */
  @Get('templates')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllTemplates(@Query('includeInactive') includeInactive?: string) {
    return this.performanceService.getAllTemplates(includeInactive === 'true');
  }

  /**
   * Get template by ID
   * Accessible by: HR roles, Managers, System Admin
   */
  @Get('templates/:id')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getTemplateById(@Param('id') id: string) {
    return this.performanceService.getTemplateById(id);
  }

  /**
   * Update appraisal template
   * Accessible by: HR Manager, System Admin
   */
  @Put('templates/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateAppraisalTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppraisalTemplateDto,
  ) {
    return this.performanceService.updateAppraisalTemplate(id, updateDto);
  }

  // ========== PHASE 1: CYCLE MANAGEMENT ==========

  /**
   * REQ-PP-02: Create appraisal cycle
   * Accessible by: HR Manager, HR Employee
   */
  @Post('cycles')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async createAppraisalCycle(@Body() createDto: CreateAppraisalCycleDto) {
    return this.performanceService.createAppraisalCycle(createDto);
  }

  /**
   * Get all appraisal cycles
   * Accessible by: HR roles, Managers, System Admin
   */
  @Get('cycles')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllCycles() {
    return this.performanceService.getAllCycles();
  }

  /**
   * Get cycle by ID
   * Accessible by: HR roles, Managers, System Admin
   */
  @Get('cycles/:id')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getCycleById(@Param('id') id: string) {
    return this.performanceService.getCycleById(id);
  }

  /**
   * Update appraisal cycle
   * Accessible by: HR Manager, System Admin
   */
  @Put('cycles/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateAppraisalCycle(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppraisalCycleDto,
  ) {
    return this.performanceService.updateAppraisalCycle(id, updateDto);
  }

  /**
   * Activate appraisal cycle
   * Accessible by: HR Manager, System Admin
   */
  @Put('cycles/:id/activate')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async activateCycle(@Param('id') id: string) {
    return this.performanceService.activateCycle(id);
  }

  /**
   * Close appraisal cycle
   * Accessible by: HR Manager, System Admin
   */
  @Put('cycles/:id/close')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async closeCycle(@Param('id') id: string) {
    return this.performanceService.closeCycle(id);
  }

  // ========== PHASE 1: ASSIGNMENT MANAGEMENT ==========

  /**
   * REQ-PP-05: Create bulk assignments
   * Accessible by: HR Employee, HR Manager, System Admin
   */
  @Post('assignments/bulk')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async createBulkAssignments(@Request() req, @Body() createDto: CreateBulkAssignmentDto) {
    const createdBy = req.user?.employeeId || req.user?.sub || 'system';
    return this.performanceService.createBulkAssignments(createdBy, createDto);
  }

  /**
   * Get assignments by cycle
   * Accessible by: HR roles, System Admin
   */
  @Get('cycles/:cycleId/assignments')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getAssignmentsByCycle(@Param('cycleId') cycleId: string) {
    return this.performanceService.getAssignmentsByCycle(cycleId);
  }

  /**
   * Get assignment by id (with authorization)
   * Accessible by: Manager (if assigned), Employee (if own assignment), HR roles, Admin
   */
  @Get('assignments/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAssignmentById(@Request() req, @Param('id') id: string) {
    return this.performanceService.getAssignmentById(req.user, id);
  }

  /**
   * Repair manager references for existing assignments.
   * Accessible by: HR Manager, HR Admin, System Admin
   */
  @Post('assignments/repair-managers')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async repairAssignmentManagers(@Body() body: { cycleId?: string }) {
    return this.performanceService.repairAssignmentManagers(body?.cycleId);
  }

  /**
   * REQ-PP-13: Get my assigned appraisal forms (Manager)
   * Accessible by: Department Managers, Head of Department
   */
  @Get('assignments/my-team')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getAssignmentsForManager(@Request() req) {
    const managerId = req.user.employeeId || req.user.sub;
    return this.performanceService.getAssignmentsForManager(managerId);
  }

  /**
   * Get my assignments (Employee)
   * Accessible by: All authenticated employees
   */
  @Get('assignments/my-assignments')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getMyAssignments(@Request() req) {
    const employeeId = req.user.employeeId || req.user.sub;
    return this.performanceService.getMyAssignments(employeeId);
  }

  // ========== PHASE 2: APPRAISAL RATING (MANAGER) ==========

  /**
   * REQ-AE-03, REQ-AE-04: Create appraisal rating
   * Accessible by: Department Managers, Head of Department
   */
  @Post('ratings')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async createAppraisalRating(
    @Request() req,
    @Body() createDto: CreateAppraisalRatingDto,
  ) {
    return this.performanceService.createAppraisalRating(
      req.user.employeeId,
      createDto,
      Array.isArray(req.user.roles) && req.user.roles.includes(Role.DEPARTMENT_HEAD),
    );
  }

  /**
   * Update appraisal rating
   * Accessible by: Department Managers, Head of Department
   */
  @Put('ratings/:id')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async updateAppraisalRating(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateAppraisalRatingDto,
  ) {
    return this.performanceService.updateAppraisalRating(
      req.user.employeeId,
      id,
      updateDto,
      Array.isArray(req.user.roles) && req.user.roles.includes(Role.DEPARTMENT_HEAD),
    );
  }

  /**
   * Submit appraisal rating
   * Accessible by: Department Managers, Head of Department
   */
  @Post('ratings/:id/submit')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async submitAppraisalRating(@Request() req, @Param('id') id: string) {
    return this.performanceService.submitAppraisalRating(
      req.user.employeeId,
      id,
      Array.isArray(req.user.roles) && req.user.roles.includes(Role.DEPARTMENT_HEAD),
    );
  }

  // ========== PHASE 3: HR MONITORING & PUBLICATION ==========

  /**
   * REQ-AE-10: Get appraisal progress dashboard
   * Accessible by: HR Manager, System Admin
   */
  @Get('dashboard/progress')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async getAppraisalProgressDashboard(@Query('cycleId') cycleId?: string) {
    return this.performanceService.getAppraisalProgressDashboard(cycleId);
  }

  /**
   * Publish appraisal results
   * Accessible by: HR Employee, HR Manager, System Admin
   */
  @Post('ratings/publish')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async publishAppraisalResults(@Request() req, @Body() body: { recordIds: string[] }) {
    return this.performanceService.publishAppraisalResults(
      req.user.employeeId,
      body.recordIds,
    );
  }

  /**
   * Publish appraisals in bulk by department
   * Accessible by: HR Employee, HR Manager, System Admin
   */
  @Post('assignments/publish-bulk')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async publishBulkByDepartment(
    @Request() req,
    @Body() body: { cycleId?: string; departmentId: string },
  ) {
    return this.performanceService.publishBulkByDepartment(
      req.user.employeeId,
      body.departmentId,
      body.cycleId,
    );
  }

  // ========== PHASE 3 & 4: EMPLOYEE FEEDBACK ==========

  /**
   * REQ-OD-01: Get my appraisal results (Employee)
   * Accessible by: All authenticated employees
   */
  @Get('results/my-results')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getMyAppraisalResults(@Request() req) {
    // Resolve the employee profile using the authenticated subject to ensure we have the
    // correct `employee_profiles._id` to query appraisal records.
    const profile = await this.employeeProfileService.getMyProfile(req.user.sub);
    return this.performanceService.getMyAppraisalResults((profile as any)._id.toString());
  }

  /**
   * Get appraisal record by ID
   * Accessible by: All authenticated employees (filtered by service)
   */
  @Get('records/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAppraisalRecordById(@Param('id') id: string) {
    return this.performanceService.getAppraisalRecordById(id);
  }

  /**
   * Acknowledge appraisal (Employee)
   * Accessible by: All authenticated employees
   */
  @Post('records/:id/acknowledge')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async acknowledgeAppraisal(
    @Request() req,
    @Param('id') id: string,
    @Body() acknowledgeDto: AcknowledgeAppraisalDto,
  ) {
    const profile = await this.employeeProfileService.getMyProfile(req.user.sub);
    return this.performanceService.acknowledgeAppraisal(
      (profile as any)._id.toString(),
      id,
      acknowledgeDto,
    );
  }

  // ========== PHASE 4: DISPUTE MANAGEMENT ==========

  /**
   * REQ-AE-07: Create dispute (Employee)
   * Accessible by: All authenticated employees
   */
  @Post('disputes')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async createDispute(@Request() req, @Body() createDto: CreateDisputeDto) {
    const profile = await this.employeeProfileService.getMyProfile(req.user.sub);
    return this.performanceService.createDispute((profile as any)._id.toString(), createDto);
  }

  /**
   * Get all disputes
   * Accessible by: HR Manager, System Admin
   */
  @Get('disputes')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async getAllDisputes() {
    return this.performanceService.getAllDisputes();
  }

  /**
   * Get pending disputes
   * Accessible by: HR Manager, System Admin
   */
  @Get('disputes/pending')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async getPendingDisputes() {
    return this.performanceService.getPendingDisputes();
  }

  /**
   * Get my disputes (Employee)
   * Accessible by: All authenticated employees
   */
  @Get('disputes/my-disputes')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getMyDisputes(@Request() req) {
    const profile = await this.employeeProfileService.getMyProfile(req.user.sub);
    return this.performanceService.getMyDisputes((profile as any)._id.toString());
  }

  /**
   * REQ-OD-07: Resolve dispute
   * Accessible by: HR Manager, System Admin
   */
  @Put('disputes/:id/resolve')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async resolveDispute(
    @Request() req,
    @Param('id') id: string,
    @Body() resolveDto: ResolveDisputeDto,
  ) {
    return this.performanceService.resolveDispute(
      req.user.employeeId,
      id,
      resolveDto,
    );
  }

  // ========== PHASE 5: ARCHIVING & HISTORY ==========

  /**
   * Archive appraisal records for a cycle
   * Accessible by: HR Manager, System Admin
   */
  @Post('cycles/:cycleId/archive')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async archiveAppraisalRecords(@Param('cycleId') cycleId: string) {
    return this.performanceService.archiveAppraisalRecords(cycleId);
  }

  /**
   * Get appraisal history for an employee
   * Accessible by: HR roles, Managers, the employee themselves
   */
  @Get('history/:employeeId')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAppraisalHistory(@Param('employeeId') employeeId: string) {
    return this.performanceService.getAppraisalHistory(employeeId);
  }

  /**
   * Get performance trends (multi-cycle analysis)
   * Accessible by: HR roles, Managers, the employee themselves
   */
  @Get('trends/:employeeId')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getPerformanceTrends(@Param('employeeId') employeeId: string) {
    return this.performanceService.getPerformanceTrends(employeeId);
  }

  // ========== DASHBOARDS ==========

  /**
   * REQ-AE-10: HR Dashboard (Consolidated View)
   * Get consolidated dashboard with appraisal completion tracking across all departments
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get('dashboard/hr-admin')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getHRAdminDashboard(@Query('cycleId') cycleId?: string) {
    return this.performanceService.getHRManagerDashboard(cycleId);
  }

  /**
   * REQ-PP-13, REQ-AE-03: Manager Dashboard (All Manager Types)
   * Supports all manager types with comprehensive performance management features
   * - Department Managers: View team appraisals, complete evaluations (REQ-AE-03, REQ-AE-04)
   * - HR Managers: All of above + template creation (REQ-PP-01), cycle management (REQ-PP-02),
   *   bulk assignments (REQ-PP-05), progress monitoring (REQ-AE-06), dispute resolution (REQ-OD-07)
   * Accessible by: Department Manager, Head of Department, HR Manager
   */
  @Get('dashboard/manager')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getManagerDashboard(@Request() req) {
    // Use employeeId (consistent with other endpoints) to identify the manager
    // Fall back to sub for older tokens that don't include employeeId
    const managerId = req.user.employeeId || req.user.sub;
    return this.performanceService.getManagerDashboard(managerId);
  }

  /**
   * REQ-PP-13: Get Manager's Team Overview
   * Retrieve detailed information about all direct reports
   * Accessible by: Department Manager, Head of Department, HR Manager
   */
  @Get('team')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getManagerTeam(@Request() req) {
    return this.performanceService.getManagerTeam(req.user.sub);
  }

  /**
   * REQ-OD-06, REQ-OD-08: Performance Reports and Analytics
   * Generate comprehensive performance reports and trend analysis
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get('reports/overview')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.DEPARTMENT_HEAD)
  async getPerformanceReports(@Query('cycleId') cycleId?: string, @Query('departmentId') departmentId?: string) {
    return this.performanceService.getPerformanceReports(cycleId, departmentId);
  }

  /**
   * REQ-AE-06: Send reminders to managers for pending appraisals
   * Accessible by: HR Manager, HR Admin, System Admin
   */
  @Post('reminders/send')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async sendAppraisalReminders(
    @Request() req,
    @Body() body: { cycleId?: string; departmentId?: string; assignmentIds?: string[] },
  ) {
    return this.performanceService.sendAppraisalReminders(
      req.user.employeeId,
      body.cycleId,
      body.departmentId,
      body.assignmentIds,
    );
  }

  /**
   * REQ-OD-05: Get archived appraisal records
   * Accessible by: HR roles, Managers, System Admin
   */
  @Get('records/archived')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async getArchivedRecords(
    @Query('cycleId') cycleId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.performanceService.getArchivedRecords(cycleId, employeeId, departmentId);
  }

  /**
   * REQ-AE-03: Get employee attendance summary for appraisal context
   * Accessible by: Department Managers, Head of Department, HR Manager
   */
  @Get('attendance-context/:employeeId')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getAttendanceContext(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.performanceService.getAttendanceContext(
      employeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
