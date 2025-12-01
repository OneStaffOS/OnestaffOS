import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EmployeeProfileService } from './employee-profile.service';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { UpdateSelfServiceDto } from './dto/update-self-service.dto';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ProcessChangeRequestDto } from './dto/process-change-request.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';

@Controller('employee-profile')
@UseGuards(AuthGuard, authorizationGaurd)
export class EmployeeProfileController {
  constructor(private readonly employeeProfileService: EmployeeProfileService) {}

  // ========== EMPLOYEE SELF-SERVICE ROUTES ==========

  /**
   * US-E2-04: View my full employee profile
   * Accessible by: All authenticated employees
   */
  @Get('my-profile')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getMyProfile(@Request() req) {
    return this.employeeProfileService.getMyProfile(req.user.sub);
  }

  /**
   * US-E2-05, US-E2-12: Update my contact information, biography, and profile picture
   * Accessible by: All authenticated employees (Self-service)
   */
  @Put('my-profile/self-service')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async updateSelfService(@Request() req, @Body() updateDto: UpdateSelfServiceDto) {
    return this.employeeProfileService.updateSelfService(req.user.sub, updateDto);
  }

  /**
   * Update my profile (contact, biography, emergency contact)
   * Accessible by: All authenticated employees (Self-service)
   */
  @Patch('my-profile')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async updateMyProfile(@Request() req, @Body() updateDto: any) {
    return this.employeeProfileService.updateSelfService(req.user.sub, updateDto);
  }

  /**
   * Upload profile photo
   * Accessible by: All authenticated employees (Self-service)
   */
  @Patch('my-profile/photo')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async uploadProfilePhoto(@Request() req, @Body() body: any) {
    // For now, just accept the photo data
    // In production, you would handle file upload with multer
    return this.employeeProfileService.updateSelfService(req.user.sub, { profilePictureUrl: body.profilePicture || body.profilePictureUrl });
  }

  /**
   * US-E6-02: Request corrections of data (e.g., job title, department)
   * Accessible by: All authenticated employees
   */
  @Post('my-profile/change-request')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async createChangeRequest(@Request() req, @Body() createDto: CreateChangeRequestDto) {
    return this.employeeProfileService.createChangeRequest(req.user.sub, createDto);
  }

  /**
   * View my change requests
   * Accessible by: All authenticated employees
   */
  @Get('my-profile/change-requests')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getMyChangeRequests(@Request() req) {
    return this.employeeProfileService.getMyChangeRequests(req.user.sub);
  }

  /**
   * Add my qualification
   * Accessible by: All authenticated employees
   */
  @Post('my-profile/qualifications')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async addMyQualification(@Request() req, @Body() createDto: CreateQualificationDto) {
    return this.employeeProfileService.addQualification(req.user.sub, createDto);
  }

  /**
   * Get my qualifications
   * Accessible by: All authenticated employees
   */
  @Get('my-profile/qualifications')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getMyQualifications(@Request() req) {
    return this.employeeProfileService.getMyQualifications(req.user.sub);
  }

  // ========== DEPARTMENT MANAGER ROUTES ==========

  /**
   * US-E4-01, US-E4-02: View team members' profiles (excluding sensitive info)
   * Accessible by: Department Managers, Head of Department
   */
  @Get('team/profiles')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getTeamProfiles(@Request() req) {
    return this.employeeProfileService.getTeamProfiles(req.user.positionId);
  }

  /**
   * Get department members who currently have active assignments
   * Accessible by: Department Managers, Head of Department
   */
  @Get('team/assigned')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getTeamAssigned(@Request() req) {
    const res = await this.employeeProfileService.getDepartmentMembersWithAssignments(req.user.positionId, req.user.sub);

    return res;
  }

  /**
   * Add a department-head comment for an appraisal (stored as an appraisal_dispute with reason 'dept_head_comment')
   */
  @Post('team/assigned/:appraisalId/comment')
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async addDeptHeadComment(@Request() req, @Param('appraisalId') appraisalId: string, @Body('comment') comment: string) {
    return this.employeeProfileService.addDeptHeadComment(appraisalId, req.user.sub, comment);
  }

  /**
   * Get team summary
   * Accessible by: Department Managers, Head of Department
   */
  @Get('team/summary')
  @Roles(Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getTeamSummary(@Request() req) {
    return this.employeeProfileService.getTeamSummary(req.user.positionId);
  }

  // ========== HR ADMIN / SYSTEM ADMIN ROUTES ==========

  /**
   * US-EP-04: Create employee profile
   * Accessible by: HR Admin, System Admin
   */
  @Post()
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async createEmployeeProfile(@Body() createDto: CreateEmployeeProfileDto) {
    return this.employeeProfileService.createEmployeeProfile(createDto);
  }

  /**
   * US-E6-03: Search for employees data
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get('search')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async searchEmployees(@Query('query') query: string) {
    return this.employeeProfileService.searchEmployees(query);
  }

  /**
   * Get employee by primary position id
   * Accessible by: All authenticated users
   */
  @Get('by-position/:positionId')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getEmployeeByPosition(@Param('positionId') positionId: string) {
    return this.employeeProfileService.getEmployeeByPrimaryPosition(positionId);
  }

  /**
   * Get all employee profiles
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get()
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getAllEmployeeProfiles() {
    return this.employeeProfileService.getAllEmployeeProfiles();
  }

  // ========== ADMIN DASHBOARD ROUTES ==========
  // IMPORTANT: These must come before :id routes to avoid route conflicts

  /**
   * Get pending change requests
   * Accessible by: HR Admin, HR Manager, HR Employee, System Admin
   */
  @Get('change-requests')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getChangeRequests(@Query('status') status?: string) {
    return this.employeeProfileService.getPendingChangeRequests(status as any);
  }

  /**
   * Approve change request
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Patch('change-requests/:requestId/approve')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async approveChangeRequest(@Param('requestId') requestId: string, @Request() req) {
    return this.employeeProfileService.approveChangeRequest(requestId, req.user.sub);
  }

  /**
   * Reject change request
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Patch('change-requests/:requestId/reject')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async rejectChangeRequest(@Param('requestId') requestId: string, @Request() req) {
    return this.employeeProfileService.rejectChangeRequest(requestId, req.user.sub);
  }

  /**
   * Get admin dashboard statistics
   * Accessible by: HR Admin, System Admin
   */
  @Get('admin/stats')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async getAdminStats() {
    return this.employeeProfileService.getAdminStats();
  }

  /**
   * Get recent activity for admin dashboard
   * Accessible by: HR Admin, System Admin
   */
  @Get('admin/recent-activity')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async getRecentActivity(@Query('limit') limit?: string) {
    const activityLimit = limit ? parseInt(limit) : 10;
    return this.employeeProfileService.getRecentActivity(activityLimit);
  }

  /**
   * Get employee profile by ID
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getEmployeeProfileById(@Param('id') id: string) {
    return this.employeeProfileService.getEmployeeProfileById(id);
  }

  /**
   * US-EP-04: Update employee profile
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Put(':id')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async updateEmployeeProfile(@Param('id') id: string, @Body() updateDto: UpdateEmployeeProfileDto) {
    return this.employeeProfileService.updateEmployeeProfile(id, updateDto);
  }

  /**
   * US-EP-05: Deactivate employee profile
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Put(':id/deactivate')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async deactivateEmployeeProfile(@Param('id') id: string) {
    return this.employeeProfileService.deactivateEmployeeProfile(id);
  }

  /**
   * US-E2-03: Get all change requests
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get('change-requests/all')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getAllChangeRequests() {
    return this.employeeProfileService.getAllChangeRequests();
  }

  /**
   * Get pending change requests
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get('change-requests/pending')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getPendingChangeRequests() {
    return this.employeeProfileService.getPendingChangeRequests();
  }

  /**
   * US-E2-03: Process change request (approve/reject)
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Put('change-requests/:requestId/process')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async processChangeRequest(
    @Param('requestId') requestId: string,
    @Body() processDto: ProcessChangeRequestDto,
  ) {
    return this.employeeProfileService.processChangeRequest(requestId, processDto);
  }

  /**
   * US-E7-05: Assign roles and access permissions to employee
   * Accessible by: HR Admin, System Admin
   */
  @Post(':id/roles')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async assignRoles(@Param('id') id: string, @Body() assignDto: AssignRolesDto) {
    return this.employeeProfileService.assignRoles(id, assignDto);
  }

  /**
   * Get employee system roles
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get(':id/roles')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getEmployeeRoles(@Param('id') id: string) {
    return this.employeeProfileService.getEmployeeRoles(id);
  }

  /**
   * Get employee qualifications
   * Accessible by: HR Admin, HR Manager, System Admin
   */
  @Get(':id/qualifications')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getEmployeeQualifications(@Param('id') id: string) {
    return this.employeeProfileService.getEmployeeQualifications(id);
  }

  /**
   * Delete qualification
   * Accessible by: HR Admin, System Admin
   */
  @Delete('qualifications/:qualificationId')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async deleteQualification(@Param('qualificationId') qualificationId: string) {
    return this.employeeProfileService.deleteQualification(qualificationId);
  }

  /**
   * Update employee status (Activate, Suspend, Terminate)
   * Accessible by: HR Admin, System Admin
   */
  @Put(':id/status')
  @Roles(Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateEmployeeStatus(
    @Param('id') employeeId: string,
    @Body('status') status: string,
  ) {
    return this.employeeProfileService.updateEmployeeStatus(employeeId, status as any);
  }
}

