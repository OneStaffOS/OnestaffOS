/**
 * User Roles
 * Must match backend roles exactly
 */

export enum SystemRole {
  DEPARTMENT_EMPLOYEE = 'department employee',
  DEPARTMENT_HEAD = 'department head',
  HR_MANAGER = 'HR Manager',
  HR_EMPLOYEE = 'HR Employee',
  PAYROLL_SPECIALIST = 'Payroll Specialist',
  PAYROLL_MANAGER = 'Payroll Manager',
  SYSTEM_ADMIN = 'System Admin',
  LEGAL_POLICY_ADMIN = 'Legal & Policy Admin',
  RECRUITER = 'Recruiter',
  FINANCE_STAFF = 'Finance Staff',
  CLIENT = 'Client',
  JOB_CANDIDATE = 'Job Candidate',
  HR_ADMIN = 'HR Admin',
  NEW_HIRE = 'New Hire',
}

/**
 * Role to Dashboard Route Mapping
 */
export const ROLE_DASHBOARD_MAP: Record<string, string> = {
  [SystemRole.JOB_CANDIDATE]: '/job-offers',
  [SystemRole.SYSTEM_ADMIN]: '/dashboard/admin',
  [SystemRole.HR_ADMIN]: '/dashboard/hr',
  [SystemRole.HR_MANAGER]: '/dashboard/hr',
  [SystemRole.HR_EMPLOYEE]: '/dashboard/hr',
  [SystemRole.PAYROLL_SPECIALIST]: '/dashboard/payroll',
  [SystemRole.PAYROLL_MANAGER]: '/dashboard/payroll',
  [SystemRole.DEPARTMENT_EMPLOYEE]: '/dashboard/employee',
  [SystemRole.DEPARTMENT_HEAD]: '/dashboard/manager',
  [SystemRole.RECRUITER]: '/dashboard/recruitment',
  [SystemRole.FINANCE_STAFF]: '/dashboard/finance',
  [SystemRole.CLIENT]: '/dashboard/client',
  [SystemRole.LEGAL_POLICY_ADMIN]: '/dashboard/payroll',
  [SystemRole.NEW_HIRE]: '/dashboard/new-hire',
};

/**
 * Role Display Names
 */
export const ROLE_LABELS: Record<string, string> = {
  [SystemRole.NEW_HIRE]: 'New Hire',
  [SystemRole.JOB_CANDIDATE]: 'Job Candidate',
  [SystemRole.SYSTEM_ADMIN]: 'System Admin',
  [SystemRole.HR_ADMIN]: 'HR Admin',
  [SystemRole.HR_MANAGER]: 'HR Manager',
  [SystemRole.HR_EMPLOYEE]: 'HR Employee',
  [SystemRole.PAYROLL_SPECIALIST]: 'Payroll Specialist',
  [SystemRole.PAYROLL_MANAGER]: 'Payroll Manager',
  [SystemRole.DEPARTMENT_EMPLOYEE]: 'Department Employee',
  [SystemRole.DEPARTMENT_HEAD]: 'Department Head',
  [SystemRole.RECRUITER]: 'Recruiter',
  [SystemRole.FINANCE_STAFF]: 'Finance Staff',
  [SystemRole.CLIENT]: 'Client',
  [SystemRole.LEGAL_POLICY_ADMIN]: 'Legal & Policy Admin',
};

/**
 * Get dashboard route for a user's role
 * If user has multiple roles, returns null (needs selection)
 */
export function getDashboardRoute(roles: string[]): string | null {
  if (!roles || roles.length === 0) {
    return '/job-offers'; // No roles = job seeker
  }

  if (roles.length === 1) {
    return ROLE_DASHBOARD_MAP[roles[0]] || '/dashboard';
  }

  // Multiple roles - needs selection
  return null;
}

/**
 * Get available dashboards for user's roles
 */
export function getAvailableDashboards(roles: string[]): Array<{ role: string; label: string; route: string }> {
  return roles
    .filter(role => ROLE_DASHBOARD_MAP[role])
    .map(role => ({
      role,
      label: ROLE_LABELS[role] || role,
      route: ROLE_DASHBOARD_MAP[role],
    }));
}
