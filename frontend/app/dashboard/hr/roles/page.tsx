/**
 * HR Admin - Role Management Page (Route: /hr/roles)
 * Manage user roles and permissions
 * Phase III: HR/Admin Processing & Master Data
 */

'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './roles.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface EmployeeWithRole {
  _id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  personalEmail?: string;
  workEmail?: string;
  primaryPositionId?: {
    title: string;
  };
  primaryDepartmentId?: {
    name: string;
  };
  accessProfileId?: {
    _id: string;
    roles: string[];
  };
}

export default function RolesPage() {
  const [employees, setEmployees] = useState<EmployeeWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithRole | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const availableRoles = [
    Role.CLIENT,
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_ADMIN,
    Role.HR_MANAGER,
    Role.HR_EMPLOYEE,
    Role.PAYROLL_SPECIALIST,
    Role.PAYROLL_MANAGER,
    Role.SYSTEM_ADMIN,
    Role.LEGAL_POLICY_ADMIN,
    Role.RECRUITER,
    Role.FINANCE_STAFF,
    Role.JOB_CANDIDATE,
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/employee-profile');
      setEmployees(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRoles = async () => {
    if (!selectedEmployee) return;

    try {
      await axios.post(`/employee-profile/${selectedEmployee._id}/roles`, {
        roles: selectedRoles
      });
      setSelectedEmployee(null);
      setSelectedRoles([]);
      fetchEmployees();
      alert('Roles updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update roles');
    }
  };

  const openRoleModal = (employee: EmployeeWithRole) => {
    setSelectedEmployee(employee);
    setSelectedRoles(employee.accessProfileId?.roles || []);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const filteredEmployees = employees.filter(emp =>
    emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.personalEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.workEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Role Management</h1>
            <p className={styles.subtitle}>Assign roles and manage access permissions</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <Spinner message="Loading employees..." />
        ) : filteredEmployees.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No employees found</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Current Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp._id}>
                    <td>{emp.employeeNumber}</td>
                    <td className={styles.empName}>{emp.firstName} {emp.lastName}</td>
                    <td className={styles.email}>{emp.workEmail || emp.personalEmail || '-'}</td>
                    <td>{emp.primaryPositionId?.title || '-'}</td>
                    <td>{emp.primaryDepartmentId?.name || '-'}</td>
                    <td>
                      <div className={styles.rolesList}>
                        {emp.accessProfileId?.roles && emp.accessProfileId.roles.length > 0 ? (
                          emp.accessProfileId.roles.map(role => (
                            <span key={role} className={styles.roleBadge}>
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className={styles.noRoles}>No roles assigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        className={styles.actionButton}
                        onClick={() => openRoleModal(emp)}
                      >
                        Manage Roles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedEmployee && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Manage Roles: {selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                <button className={styles.closeButton} onClick={() => setSelectedEmployee(null)}>×</button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalSubtitle}>Select roles to assign to this employee:</p>
                <div className={styles.rolesGrid}>
                  {availableRoles.map(role => (
                    <label key={role} className={styles.roleCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelButton} onClick={() => setSelectedEmployee(null)}>
                  Cancel
                </button>
                <button className={styles.submitButton} onClick={handleAssignRoles}>
                  Update Roles
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
