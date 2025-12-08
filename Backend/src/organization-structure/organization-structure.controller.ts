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
import { OrganizationStructureService } from './organization-structure.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ProcessApprovalDto } from './dto/process-approval.dto';
import { CreatePositionAssignmentDto } from './dto/create-position-assignment.dto';
import { AssignDepartmentManagerDto } from './dto/assign-department-manager.dto';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { ApprovalDecision } from './enums/organization-structure.enums';

@Controller('organization-structure')
@UseGuards(AuthGuard, authorizationGaurd)
export class OrganizationStructureController {
  constructor(
    private readonly organizationStructureService: OrganizationStructureService,
  ) {}

  // ========== DEPARTMENT ROUTES ==========

  /**
   * REQ-OSM-01: Create a new department
   * Accessible by: System Admin
   */
  @Post('departments')
  @Roles(Role.SYSTEM_ADMIN)
  async createDepartment(@Request() req, @Body() createDto: CreateDepartmentDto) {
    return this.organizationStructureService.createDepartment(
      createDto,
      req.user.employeeId,
    );
  }

  /**
   * Get all departments
   * Accessible by: All authenticated users
   */
  @Get('departments')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllDepartments(@Query('includeInactive') includeInactive?: string) {
    return this.organizationStructureService.getAllDepartments(
      includeInactive === 'true',
    );
  }

  /**
   * Get department by ID
   * Accessible by: All authenticated users
   */
  @Get('departments/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getDepartmentById(@Param('id') id: string) {
    return this.organizationStructureService.getDepartmentById(id);
  }

  /**
   * REQ-OSM-02: Update an existing department
   * Accessible by: System Admin
   */
  @Put('departments/:id')
  @Roles(Role.SYSTEM_ADMIN)
  async updateDepartment(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateDepartmentDto,
  ) {
    return this.organizationStructureService.updateDepartment(
      id,
      updateDto,
      req.user.employeeId,
    );
  }

  /**
   * REQ-OSM-05: Deactivate a department
   * Accessible by: System Admin
   */
  @Put('departments/:id/deactivate')
  @Roles(Role.SYSTEM_ADMIN)
  async deactivateDepartment(@Request() req, @Param('id') id: string) {
    return this.organizationStructureService.deactivateDepartment(
      id,
      req.user.employeeId,
    );
  }

  @Put('departments/:id/reactivate')
  @Roles(Role.SYSTEM_ADMIN)
  async reactivateDepartment(@Request() req, @Param('id') id: string) {
    return this.organizationStructureService.reactivateDepartment(
      id,
      req.user.employeeId,
    );
  }

  /**
   * Assign a manager to a department
   * Accessible by: System Admin
   */
  @Patch('departments/:id/assign-manager')
  @Roles(Role.SYSTEM_ADMIN)
  async assignDepartmentManager(
    @Request() req,
    @Param('id') id: string,
    @Body() assignDto: AssignDepartmentManagerDto,
  ) {
    return this.organizationStructureService.assignDepartmentManager(
      id,
      assignDto,
      req.user.employeeId,
    );
  }

  // ========== POSITION ROUTES ==========

  /**
   * REQ-OSM-01: Create a new position
   * Accessible by: System Admin
   */
  @Post('positions')
  @Roles(Role.SYSTEM_ADMIN)
  async createPosition(@Request() req, @Body() createDto: CreatePositionDto) {
    return this.organizationStructureService.createPosition(
      createDto,
      req.user.employeeId,
    );
  }

  /**
   * Get all positions
   * Accessible by: All authenticated users
   */
  @Get('positions')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.PAYROLL_SPECIALIST,
    Role.PAYROLL_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async getAllPositions(@Query('includeInactive') includeInactive?: string) {
    return this.organizationStructureService.getAllPositions(
      includeInactive === 'true',
    );
  }

  /**
   * Get position by ID
   * Accessible by: All authenticated users
   */
  @Get('positions/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getPositionById(@Param('id') id: string) {
    return this.organizationStructureService.getPositionById(id);
  }

  /**
   * Get positions by department
   * Accessible by: All authenticated users
   */
  @Get('departments/:departmentId/positions')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getPositionsByDepartment(@Param('departmentId') departmentId: string) {
    return this.organizationStructureService.getPositionsByDepartment(departmentId);
  }

  /**
   * REQ-OSM-03: Update an existing position
   * Accessible by: System Admin
   */
  @Put('positions/:id')
  @Roles(Role.SYSTEM_ADMIN)
  async updatePosition(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdatePositionDto,
  ) {
    return this.organizationStructureService.updatePosition(
      id,
      updateDto,
      req.user.employeeId,
    );
  }

  /**
   * REQ-OSM-06: Deactivate a position
   * Accessible by: System Admin
   */
  @Put('positions/:id/deactivate')
  @Roles(Role.SYSTEM_ADMIN)
  async deactivatePosition(@Request() req, @Param('id') id: string) {
    return this.organizationStructureService.deactivatePosition(
      id,
      req.user.employeeId,
    );
  }

  // ========== HIERARCHY & VISIBILITY ROUTES ==========

  /**
   * REQ-SANV-01: View organizational hierarchy
   * Accessible by: All authenticated employees
   * BR 41: Employees see only their department structure
   */
  @Get('hierarchy')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getOrganizationalHierarchy(@Request() req) {
    // BR 41: If user is employee-only, filter to their department
    // Debug logs removed
    
    const isEmployeeOnly = req.user.roles.includes(Role.DEPARTMENT_EMPLOYEE) && 
      !req.user.roles.some((r: string) => [
        Role.DEPARTMENT_HEAD, 
        Role.DEPARTMENT_HEAD, 
        Role.HR_ADMIN, 
        Role.HR_MANAGER, 
        Role.SYSTEM_ADMIN
      ].includes(r as Role));
    
    // Debug log removed
    
    // Use employeeProfileId (from req.user.sub) for employees
    if (isEmployeeOnly && req.user.sub) {
      // Debug log removed
      return this.organizationStructureService.getEmployeeHierarchy(req.user.sub);
    }
    
    // Debug log removed
    return this.organizationStructureService.getOrganizationalHierarchy();
  }

  /**
   * REQ-SANV-02: View team structure (my-team)
   * Accessible by: Managers and HR roles
   */
  @Get('hierarchy/my-team')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async getMyTeamHierarchy(@Request() req) {
    return this.organizationStructureService.getTeamStructure(req.user.positionId);
  }

  // ========== POSITION ASSIGNMENT ROUTES ==========

  /**
   * Get all position assignments
   * Accessible by: HR Admin, System Admin
   */
  @Get('assignments')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getAllAssignments() {
    return this.organizationStructureService.getAllAssignments();
  }

  /**
   * Assign employee to position
   * Accessible by: HR Admin, System Admin
   */
  @Post('assignments')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async assignEmployeeToPosition(@Body() createDto: CreatePositionAssignmentDto) {
    return this.organizationStructureService.assignEmployeeToPosition(createDto);
  }

  /**
   * Remove employee from position (end assignment)
   * Accessible by: HR Admin, System Admin
   */
  @Delete('assignments/:assignmentId')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async removeEmployeeFromPosition(@Param('assignmentId') assignmentId: string) {
    return this.organizationStructureService.removeEmployeeFromPosition(assignmentId);
  }

  /**
   * Get employee assignments
   * Accessible by: HR roles and the employee themselves
   */
  @Get('employees/:employeeId/assignments')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getEmployeeAssignments(@Param('employeeId') employeeId: string) {
    return this.organizationStructureService.getEmployeeAssignments(employeeId);
  }

  /**
   * Get current assignment for an employee
   * Accessible by: HR roles and managers, and employees (for their own profile)
   */
  @Get('employees/:employeeId/current-assignment')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getCurrentAssignment(@Param('employeeId') employeeId: string) {
    return this.organizationStructureService.getCurrentAssignment(employeeId);
  }

  // ========== CHANGE REQUEST ROUTES ==========

  /**
   * REQ-OSM-03: Submit change request
   * Accessible by: Managers, HR roles, System Admin
   */
  @Post('change-requests')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async createChangeRequest(
    @Request() req,
    @Body() createDto: CreateChangeRequestDto,
  ) {
    return this.organizationStructureService.createChangeRequest(
      createDto,
      req.user.employeeId,
    );
  }

  /**
   * Submit change request for approval
   * Accessible by: Request creator or HR/Admin
   */
  @Put('change-requests/:id/submit')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async submitChangeRequest(@Request() req, @Param('id') id: string) {
    return this.organizationStructureService.submitChangeRequest(
      id,
      req.user.employeeId,
    );
  }

  /**
   * Get all change requests
   * Accessible by: HR Admin, System Admin
   */
  @Get('change-requests')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getAllChangeRequests() {
    return this.organizationStructureService.getAllChangeRequests();
  }

  /**
   * Get pending change requests
   * Accessible by: HR Admin, System Admin
   */
  @Get('change-requests/pending')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getPendingChangeRequests() {
    return this.organizationStructureService.getPendingChangeRequests();
  }

  /**
   * Get my change requests
   * Accessible by: All authenticated users
   */
  @Get('change-requests/my-requests')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.SYSTEM_ADMIN,
  )
  async getMyChangeRequests(@Request() req) {
    return this.organizationStructureService.getMyChangeRequests(
      req.user.employeeId,
    );
  }

  /**
   * REQ-OSM-04: Approve change request (PATCH)
   * Accessible by: System Admin, HR Admin
   */
  @Patch('change-requests/:id/approve')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async approveChangeRequest(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reviewComments?: string },
  ) {
    const processDto: ProcessApprovalDto = {
      decision: ApprovalDecision.APPROVED,
      comments: body.reviewComments || '',
    };
    return this.organizationStructureService.createApproval(
      id,
      req.user.employeeId,
      processDto,
    );
  }

  /**
   * REQ-OSM-04: Reject change request (PATCH)
   * Accessible by: System Admin, HR Admin
   */
  @Patch('change-requests/:id/reject')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async rejectChangeRequest(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reviewComments?: string },
  ) {
    const processDto: ProcessApprovalDto = {
      decision: ApprovalDecision.REJECTED,
      comments: body.reviewComments || '',
    };
    return this.organizationStructureService.createApproval(
      id,
      req.user.employeeId,
      processDto,
    );
  }

  /**
   * REQ-OSM-04: Process change request approval (deprecated - use PATCH endpoints)
   * Accessible by: System Admin
   */
  @Post('change-requests/:id/approve')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async createApproval(
    @Request() req,
    @Param('id') id: string,
    @Body() processDto: ProcessApprovalDto,
  ) {
    return this.organizationStructureService.createApproval(
      id,
      req.user.employeeId,
      processDto,
    );
  }

  /**
   * Get approvals for a change request
   * Accessible by: HR roles and System Admin
   */
  @Get('change-requests/:id/approvals')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getChangeRequestApprovals(@Param('id') id: string) {
    return this.organizationStructureService.getChangeRequestApprovals(id);
  }

  /**
   * Implement approved change request
   * Accessible by: System Admin
   */
  @Post('change-requests/:id/implement')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_ADMIN)
  async implementChangeRequest(@Request() req, @Param('id') id: string) {
    return this.organizationStructureService.implementChangeRequest(
      id,
      req.user.employeeId,
    );
  }

  // ========== CHANGE LOG ROUTES ==========

  /**
   * Get change logs
   * Accessible by: HR Admin, System Admin
   */
  @Get('change-logs')
  @Roles(Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async getChangeLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.organizationStructureService.getChangeLogs(entityType, entityId);
  }
}
