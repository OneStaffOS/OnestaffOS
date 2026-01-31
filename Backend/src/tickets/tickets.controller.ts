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
  Req,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AddCommentDto,
  CloseTicketDto,
  AssignTicketDto,
  QueryTicketsDto,
} from './dto/ticket.dto';
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';

const EMPLOYEE_ROLES: Role[] = [
  Role.DEPARTMENT_EMPLOYEE,
  Role.DEPARTMENT_HEAD,
  Role.HR_MANAGER,
  Role.HR_EMPLOYEE,
  Role.PAYROLL_SPECIALIST,
  Role.PAYROLL_MANAGER,
  Role.SYSTEM_ADMIN,
  Role.LEGAL_POLICY_ADMIN,
  Role.RECRUITER,
  Role.FINANCE_STAFF,
  Role.JOB_CANDIDATE,
  Role.HR_ADMIN,
  Role.NEW_HIRE,
  Role.CLIENT
];

const ADMIN_ROLES: Role[] = [Role.SYSTEM_ADMIN];

@Controller('tickets')
@UseGuards(AuthGuard, authorizationGaurd)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Create a new ticket
   * Accessible by: All authenticated users
   */
  @Post()
  @Roles(...EMPLOYEE_ROLES)
  async createTicket(@Req() req: any, @Body() createTicketDto: CreateTicketDto) {
    const employeeId = req.user.sub;
    return this.ticketsService.createTicket(employeeId, createTicketDto);
  }

  /**
   * Get all tickets with filters
   * Accessible by: System Admin
   */
  @Get()
  @Roles(...ADMIN_ROLES)
  async getTickets(@Query() queryDto: QueryTicketsDto) {
    return this.ticketsService.getTickets(queryDto);
  }

  /**
   * Get current user's tickets
   * Accessible by: All authenticated users
   */
  @Get('my-tickets')
  @Roles(...EMPLOYEE_ROLES)
  async getMyTickets(@Req() req: any) {
    const employeeId = req.user.sub;
    
    if (!employeeId) {
      throw new Error('Employee ID not found in request');
    }
    
    return this.ticketsService.getEmployeeTickets(employeeId);
  }

  /**
   * Get tickets assigned to current user (for agents)
   * Accessible by: System Admin
   */
  @Get('assigned-to-me')
  @Roles(...ADMIN_ROLES)
  async getAssignedTickets(@Req() req: any) {
    const employeeId = req.user.sub;
    return this.ticketsService.getAssignedTickets(employeeId);
  }

  /**
   * Get ticket statistics
   * Accessible by: System Admin
   */
  @Get('stats')
  @Roles(...ADMIN_ROLES)
  async getTicketStats(@Query('employeeId') employeeId?: string) {
    return this.ticketsService.getTicketStats(employeeId);
  }

  /**
   * Get available agents (System Admin users)
   * Accessible by: System Admin
   */
  @Get('agents')
  @Roles(...ADMIN_ROLES)
  async getAgents() {
    return this.ticketsService.getAgents();
  }

  /**
   * Get single ticket by ID
   * Accessible by: Ticket owner or agents
   */
  @Get(':id')
  @Roles(...EMPLOYEE_ROLES)
  async getTicketById(@Param('id') id: string, @Req() req: any) {
    const ticket = await this.ticketsService.getTicketById(id);
    
    // Check if user is owner or has admin/agent role
    const employeeId = req.user.sub;
    const roles = req.user.roles || [];
    
    // Handle populated employeeId (could be ObjectId or populated object)
    const ticketOwnerId = ticket.employeeId._id 
      ? ticket.employeeId._id.toString() 
      : ticket.employeeId.toString();
    
    const isOwner = ticketOwnerId === employeeId;
    const isAgent =
      roles.includes(Role.SYSTEM_ADMIN) ||
      roles.includes(Role.HR_ADMIN) ||
      roles.includes(Role.HR_MANAGER) ||
      (ticket.assignedTo && ticket.assignedTo.toString() === employeeId);

    if (!isOwner && !isAgent) {
      throw new Error('Unauthorized to view this ticket');
    }

    return ticket;
  }

  /**
   * Update ticket
   * Accessible by: Ticket owner (limited fields) or agents (all fields)
   */
  @Put(':id')
  @Roles(...EMPLOYEE_ROLES)
  async updateTicket(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    const roles = req.user.roles || [];
    const ticket = await this.ticketsService.getTicketById(id);

    // Handle populated employeeId
    const ticketOwnerId = ticket.employeeId._id 
      ? ticket.employeeId._id.toString() 
      : ticket.employeeId.toString();
    
    const isOwner = ticketOwnerId === userId;
    const isAgent =
      roles.includes(Role.SYSTEM_ADMIN) ||
      roles.includes(Role.HR_ADMIN) ||
      roles.includes(Role.HR_MANAGER) ||
      (ticket.assignedTo && ticket.assignedTo.toString() === userId);

    // Owners can only update title and description
    if (isOwner && !isAgent) {
      const allowedFields: Partial<UpdateTicketDto> = {};
      if (updateTicketDto.title) allowedFields.title = updateTicketDto.title;
      if (updateTicketDto.description)
        allowedFields.description = updateTicketDto.description;
      return this.ticketsService.updateTicket(id, allowedFields, userId);
    }

    // Agents can update all fields
    if (isAgent) {
      return this.ticketsService.updateTicket(id, updateTicketDto, userId);
    }

    throw new Error('Unauthorized to update this ticket');
  }

  /**
   * Add comment to ticket
   * Accessible by: Ticket owner or agents
   */
  @Post(':id/comments')
  @Roles(...EMPLOYEE_ROLES)
  async addComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    const userName = req.user.email || 'User';
    const ticket = await this.ticketsService.getTicketById(id);

    // Handle populated employeeId
    const ticketOwnerId = ticket.employeeId._id 
      ? ticket.employeeId._id.toString() 
      : ticket.employeeId.toString();
    
    const isOwner = ticketOwnerId === userId;
    const roles = req.user.roles || [];
    const isAgent =
      roles.includes(Role.SYSTEM_ADMIN) ||
      roles.includes(Role.HR_ADMIN) ||
      roles.includes(Role.HR_MANAGER) ||
      (ticket.assignedTo && ticket.assignedTo.toString() === userId);

    if (!isOwner && !isAgent) {
      throw new Error('Unauthorized to comment on this ticket');
    }

    return this.ticketsService.addComment(id, userId, userName, addCommentDto);
  }

  /**
   * Assign ticket to agent
   * Accessible by: System Admin
   */
  @Post(':id/assign')
  @Roles(...ADMIN_ROLES)
  async assignTicket(
    @Param('id') id: string,
    @Body() assignTicketDto: AssignTicketDto,
    @Req() req: any,
  ) {
    const assignerId = req.user.sub;
    return this.ticketsService.assignTicket(id, assignTicketDto, assignerId);
  }

  /**
   * Close ticket with resolution
   * Accessible by: Assigned agent or admins
   */
  @Post(':id/close')
  @Roles(...ADMIN_ROLES)
  async closeTicket(
    @Param('id') id: string,
    @Body() closeTicketDto: CloseTicketDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    const roles = req.user.roles || [];
    const ticket = await this.ticketsService.getTicketById(id);

    const isAssigned =
      ticket.assignedTo && ticket.assignedTo.toString() === userId;
    const isAdmin =
      roles.includes(Role.SYSTEM_ADMIN) ||
      roles.includes(Role.HR_ADMIN) ||
      roles.includes(Role.HR_MANAGER);

    if (!isAssigned && !isAdmin) {
      throw new Error('Unauthorized to close this ticket');
    }

    return this.ticketsService.closeTicket(id, closeTicketDto, userId);
  }

  /**
   * Update workflow step
   * Accessible by: Assigned agent or admins
   */
  @Put(':id/workflow/:stepOrder')
  @Roles(...ADMIN_ROLES)
  async updateWorkflowStep(
    @Param('id') id: string,
    @Param('stepOrder') stepOrder: number,
    @Body('completed') completed: boolean,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    const roles = req.user.roles || [];
    const ticket = await this.ticketsService.getTicketById(id);

    const isAssigned =
      ticket.assignedTo && ticket.assignedTo.toString() === userId;
    const isAdmin =
      roles.includes(Role.SYSTEM_ADMIN) ||
      roles.includes(Role.HR_ADMIN) ||
      roles.includes(Role.HR_MANAGER);

    if (!isAssigned && !isAdmin) {
      throw new Error('Unauthorized to update workflow');
    }

    return this.ticketsService.updateWorkflowStep(id, stepOrder, completed);
  }

  /**
   * Delete ticket
   * Accessible by: System Admin only
   */
  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  async deleteTicket(@Param('id') id: string) {
    await this.ticketsService.deleteTicket(id);
    return { message: 'Ticket deleted successfully' };
  }
}
