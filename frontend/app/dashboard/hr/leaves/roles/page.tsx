/**
 * Leave Roles & Permissions Page
 * Control who can request, approve, or view leave
 * Accessible by: HR Admin, System Admin
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import styles from './roles.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Permission {
  role: string;
  displayName: string;
  permissions: {
    requestLeave: boolean;
    viewOwnBalance: boolean;
    viewTeamRequests: boolean;
    approveRequests: boolean;
    viewAllRequests: boolean;
    manageCategories: boolean;
    manageTypes: boolean;
    managePolicies: boolean;
    manageEntitlements: boolean;
    adjustBalances: boolean;
    viewReports: boolean;
  };
}

const defaultPermissions: Permission[] = [
  {
    role: 'EMPLOYEE',
    displayName: 'Employee',
    permissions: {
      requestLeave: true,
      viewOwnBalance: true,
      viewTeamRequests: false,
      approveRequests: false,
      viewAllRequests: false,
      manageCategories: false,
      manageTypes: false,
      managePolicies: false,
      manageEntitlements: false,
      adjustBalances: false,
      viewReports: false,
    },
  },
  {
    role: 'MANAGER',
    displayName: 'Manager',
    permissions: {
      requestLeave: true,
      viewOwnBalance: true,
      viewTeamRequests: true,
      approveRequests: true,
      viewAllRequests: false,
      manageCategories: false,
      manageTypes: false,
      managePolicies: false,
      manageEntitlements: false,
      adjustBalances: false,
      viewReports: true,
    },
  },
  {
    role: 'HR_MANAGER',
    displayName: 'HR Manager',
    permissions: {
      requestLeave: true,
      viewOwnBalance: true,
      viewTeamRequests: true,
      approveRequests: true,
      viewAllRequests: true,
      manageCategories: false,
      manageTypes: false,
      managePolicies: false,
      manageEntitlements: true,
      adjustBalances: true,
      viewReports: true,
    },
  },
  {
    role: 'HR_ADMIN',
    displayName: 'HR Admin',
    permissions: {
      requestLeave: true,
      viewOwnBalance: true,
      viewTeamRequests: true,
      approveRequests: true,
      viewAllRequests: true,
      manageCategories: true,
      manageTypes: true,
      managePolicies: true,
      manageEntitlements: true,
      adjustBalances: true,
      viewReports: true,
    },
  },
  {
    role: 'SYSTEM_ADMIN',
    displayName: 'System Admin',
    permissions: {
      requestLeave: true,
      viewOwnBalance: true,
      viewTeamRequests: true,
      approveRequests: true,
      viewAllRequests: true,
      manageCategories: true,
      manageTypes: true,
      managePolicies: true,
      manageEntitlements: true,
      adjustBalances: true,
      viewReports: true,
    },
  },
];

const permissionLabels: Record<string, string> = {
  requestLeave: 'Request Leave',
  viewOwnBalance: 'View Own Balance',
  viewTeamRequests: 'View Team Requests',
  approveRequests: 'Approve/Reject Requests',
  viewAllRequests: 'View All Requests',
  manageCategories: 'Manage Categories',
  manageTypes: 'Manage Leave Types',
  managePolicies: 'Configure Policies',
  manageEntitlements: 'Manage Entitlements',
  adjustBalances: 'Adjust Balances',
  viewReports: 'View Reports',
};

export default function RolesPermissionsPage() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const handlePermissionChange = (roleIndex: number, permission: string, value: boolean) => {
    const updated = [...permissions];
    (updated[roleIndex].permissions as any)[permission] = value;
    setPermissions(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // In a real implementation, this would save to the backend
      await new Promise(resolve => setTimeout(resolve, 500));

      setSuccess('Permissions saved successfully');
      setHasChanges(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPermissions(defaultPermissions);
    setHasChanges(true);
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Roles & Permissions" role="HR Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Roles & Permissions</h1>
              <p className={styles.subtitle}>
                Configure what each role can do in the leave management system
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                Back to Leave Management
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {/* Permissions Matrix */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Permission Matrix</h2>
              <button 
                className={styles.resetButton}
                onClick={resetToDefaults}
              >
                Reset to Defaults
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.permissionCol}>Permission</th>
                    {permissions.map((p) => (
                      <th key={p.role} className={styles.roleCol}>
                        {p.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(permissionLabels).map((permKey) => (
                    <tr key={permKey}>
                      <td className={styles.permissionName}>
                        {permissionLabels[permKey]}
                      </td>
                      {permissions.map((p, index) => (
                        <td key={p.role} className={styles.checkboxCell}>
                          <input
                            type="checkbox"
                            checked={(p.permissions as any)[permKey]}
                            onChange={(e) => handlePermissionChange(index, permKey, e.target.checked)}
                            className={styles.checkbox}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Descriptions */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Role Descriptions</h2>
            <div className={styles.rolesGrid}>
              <div className={styles.roleCard}>
                <h3>Employee</h3>
                <p>Regular employees can request leave and view their own balance. They cannot approve requests or access admin features.</p>
              </div>
              <div className={styles.roleCard}>
                <h3>Manager</h3>
                <p>Team managers can approve/reject leave requests from their direct reports and view team-level reports.</p>
              </div>
              <div className={styles.roleCard}>
                <h3>HR Manager</h3>
                <p>HR managers can view all requests, manage entitlements, and make balance adjustments. Limited policy configuration access.</p>
              </div>
              <div className={styles.roleCard}>
                <h3>HR Admin</h3>
                <p>Full access to all leave management features including policy configuration, category management, and system settings.</p>
              </div>
              <div className={styles.roleCard}>
                <h3>System Admin</h3>
                <p>Complete system access including all HR Admin permissions plus system-level configurations.</p>
              </div>
            </div>
          </div>

          {/* Approval Workflow Info */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Approval Workflow</h2>
            <div className={styles.workflowDiagram}>
              <div className={styles.workflowStep}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h4>Employee Submits Request</h4>
                  <p>Leave request is created with pending status</p>
                </div>
              </div>
              <div className={styles.workflowArrow}>→</div>
              <div className={styles.workflowStep}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h4>Manager Review</h4>
                  <p>Direct manager approves or rejects</p>
                </div>
              </div>
              <div className={styles.workflowArrow}>→</div>
              <div className={styles.workflowStep}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h4>HR Review (Optional)</h4>
                  <p>For extended leave or special types</p>
                </div>
              </div>
              <div className={styles.workflowArrow}>→</div>
              <div className={styles.workflowStep}>
                <div className={styles.stepNumber}>4</div>
                <div className={styles.stepContent}>
                  <h4>Balance Updated</h4>
                  <p>Employee balance adjusted automatically</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className={styles.actions}>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
