
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) =>SetMetadata(ROLES_KEY, roles);


export enum Role {
    Admin = 'SYSTEM_ADMIN',
    Manager = 'MANAGER',
    Employee = 'EMPLOYEE',
    HR_Admin = 'HR_ADMIN',
    HR_Manager = 'HR_MANAGER',
    HR_Employee = 'HR_EMPLOYEE',
    HR_Officer = 'HR_OFFICER',
    Payroll_Officer= 'PAYROLL_OFFICER',
    Candidate = 'CANDIDATE',
    New_Hire = 'NEW_HIRE',
    System= 'SYSTEM',
    Department_Manager = 'DEPARTMENT_MANAGER',
    Head_of_Department = 'HEAD_OF_DEPARTMENT',
  }
  