/**
 * BR-TM-01: Role validation for time management operations
 * 
 * Defines which roles can perform specific time management operations
 * System Admin can define roles, HR and Line Managers can approve/reject
 */

import { ForbiddenException } from '@nestjs/common';
import { Role } from '../../auth/decorators/roles.decorator';

export enum TimeManagementOperation {
  DEFINE_ROLES = 'DEFINE_ROLES',
  CREATE_SHIFT_TYPE = 'CREATE_SHIFT_TYPE',
  ASSIGN_SHIFT = 'ASSIGN_SHIFT',
  APPROVE_SHIFT_ASSIGNMENT = 'APPROVE_SHIFT_ASSIGNMENT',
  REJECT_SHIFT_ASSIGNMENT = 'REJECT_SHIFT_ASSIGNMENT',
  APPROVE_CORRECTION_REQUEST = 'APPROVE_CORRECTION_REQUEST',
  REJECT_CORRECTION_REQUEST = 'REJECT_CORRECTION_REQUEST',
  APPROVE_TIME_EXCEPTION = 'APPROVE_TIME_EXCEPTION',
  REJECT_TIME_EXCEPTION = 'REJECT_TIME_EXCEPTION',
  APPROVE_OVERTIME = 'APPROVE_OVERTIME',
  REJECT_OVERTIME = 'REJECT_OVERTIME',
  VIEW_ATTENDANCE_REPORTS = 'VIEW_ATTENDANCE_REPORTS',
  MANUAL_ATTENDANCE_CORRECTION = 'MANUAL_ATTENDANCE_CORRECTION',
  CONFIGURE_OVERTIME_RULES = 'CONFIGURE_OVERTIME_RULES',
  CONFIGURE_LATENESS_RULES = 'CONFIGURE_LATENESS_RULES',
  MANAGE_HOLIDAYS = 'MANAGE_HOLIDAYS',
}

export class TimeManagementRoleValidator {
  private static operationRoleMap: Map<TimeManagementOperation, Role[]> = new Map([
    // BR-TM-01: System Admin defines roles and configurations
    [TimeManagementOperation.DEFINE_ROLES, [Role.SYSTEM_ADMIN]],
    [TimeManagementOperation.CREATE_SHIFT_TYPE, [Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]],
    [TimeManagementOperation.CONFIGURE_OVERTIME_RULES, [Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]],
    [TimeManagementOperation.CONFIGURE_LATENESS_RULES, [Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]],
    [TimeManagementOperation.MANAGE_HOLIDAYS, [Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]],
    
    // BR-TM-01: HR can assign shifts and manage configurations
    [TimeManagementOperation.ASSIGN_SHIFT, [Role.HR_ADMIN, Role.HR_MANAGER, Role.DEPARTMENT_HEAD]],
    
    // BR-TM-01: Line Managers and HR approve/reject time management permissions
    [TimeManagementOperation.APPROVE_SHIFT_ASSIGNMENT, [Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN]],
    [TimeManagementOperation.REJECT_SHIFT_ASSIGNMENT, [Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN]],
    [TimeManagementOperation.APPROVE_CORRECTION_REQUEST, [Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN]],
    [TimeManagementOperation.REJECT_CORRECTION_REQUEST, [Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN]],
    [TimeManagementOperation.APPROVE_TIME_EXCEPTION, [Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN]],
    [TimeManagementOperation.REJECT_TIME_EXCEPTION, [Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN]],
    [TimeManagementOperation.APPROVE_OVERTIME, [Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN]],
    [TimeManagementOperation.REJECT_OVERTIME, [Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN]],
    
    // BR-TM-21: HR and Line Managers access to reports
    [TimeManagementOperation.VIEW_ATTENDANCE_REPORTS, [
      Role.DEPARTMENT_HEAD, 
      Role.HR_MANAGER, 
      Role.HR_ADMIN, 
      Role.HR_EMPLOYEE,
      Role.PAYROLL_MANAGER,
      Role.PAYROLL_SPECIALIST,
    ]],
    
    // Manual corrections by HR only
    [TimeManagementOperation.MANUAL_ATTENDANCE_CORRECTION, [Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]],
  ]);

  /**
   * Validate if a user role is authorized for a specific time management operation
   * @param userRole - The role of the user attempting the operation
   * @param operation - The time management operation being performed
   * @throws ForbiddenException if user is not authorized
   */
  static validateRole(userRole: Role | Role[], operation: TimeManagementOperation): void {
    const allowedRoles = this.operationRoleMap.get(operation);
    
    if (!allowedRoles) {
      throw new ForbiddenException(`Operation ${operation} is not defined in role validation`);
    }

    const userRoles = Array.isArray(userRole) ? userRole : [userRole];
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role(s): ${userRoles.join(', ')}`
      );
    }
  }

  /**
   * Check if user has permission for an operation without throwing
   * @param userRole - The role of the user
   * @param operation - The time management operation
   * @returns boolean indicating if user has permission
   */
  static hasPermission(userRole: Role | Role[], operation: TimeManagementOperation): boolean {
    const allowedRoles = this.operationRoleMap.get(operation);
    if (!allowedRoles) return false;

    const userRoles = Array.isArray(userRole) ? userRole : [userRole];
    return userRoles.some(role => allowedRoles.includes(role));
  }

  /**
   * Get all allowed roles for a specific operation
   * @param operation - The time management operation
   * @returns Array of allowed roles
   */
  static getAllowedRoles(operation: TimeManagementOperation): Role[] {
    return this.operationRoleMap.get(operation) || [];
  }
}
