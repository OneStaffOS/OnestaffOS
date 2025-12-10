import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';

@Controller('notifications')
@UseGuards(AuthGuard, authorizationGaurd)
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  // Create or schedule a notification (leaders)
  @Post()
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async create(@Req() req: any, @Body() dto: CreateNotificationDto) {
    const createdBy = req?.user?.employeeId || req?.user?.sub || 'unknown';
    return await this.svc.createNotification(createdBy, dto);
  }

  // Employee inbox
  @Get('my')
  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN, Role.NEW_HIRE, Role.JOB_CANDIDATE, Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.LEGAL_POLICY_ADMIN, Role.RECRUITER)
  async my(@Req() req: any) {
    const emp = req?.user?.employeeId || req?.user?.sub;
    const positionId = req?.user?.positionId;
    const departmentId = req?.user?.departmentId || req?.user?.primaryDepartmentId;
    return await this.svc.getMyNotifications(emp, departmentId, positionId);
  }

  // Manager inbox (see NotificationService.getManagerNotifications)
  @Get('manager/inbox')
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async managerInbox(@Req() req: any) {
    const emp = req?.user?.employeeId || req?.user?.sub;
    const positionId = req?.user?.positionId;
    const departmentId = req?.user?.departmentId || req?.user?.primaryDepartmentId;
    return await this.svc.getManagerNotifications(emp, departmentId, positionId);
  }

  @Put(':id/read')
  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN, Role.NEW_HIRE, Role.JOB_CANDIDATE, Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.LEGAL_POLICY_ADMIN, Role.RECRUITER)
  async markRead(@Param('id') id: string, @Req() req: any) {
    const emp = req?.user?.employeeId || req?.user?.sub;
    return await this.svc.markRead(id, emp);
  }

  @Put(':id/archive')
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN, Role.NEW_HIRE, Role.JOB_CANDIDATE, Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.LEGAL_POLICY_ADMIN, Role.RECRUITER)
  async archive(@Param('id') id: string, @Req() req: any) {
    const emp = req?.user?.employeeId || req?.user?.sub;
    return await this.svc.archiveForUser(id, emp);
  }

  // List pending (leaders)
  @Get('pending/list')
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async pending() {
    return await this.svc.listPending();
  }
}
