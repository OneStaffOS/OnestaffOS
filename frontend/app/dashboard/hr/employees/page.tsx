/**
 * HR Admin - Employee Directory Page (Route: /hr/employees)
 * US-E6-03: Search for employees data
 * US-EP-04: Edit any part of an employee's profile
 * US-EP-05: Deactivate employee's profile
 * BR 20a: Only authorized roles can create/modify data
 * Phase III: HR/Admin Processing & Master Data
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { EmployeeProfile, EmployeeStatus } from '@/lib/types/employee-profile.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './employees.module.css';

export default function HREmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('lastName');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [deactivationType, setDeactivationType] = useState<EmployeeStatus>(EmployeeStatus.INACTIVE);

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

  const getUniqueDepartments = () => {
    const departments = employees.map(emp => {
      const dept = emp.primaryDepartmentId;
      // Handle both populated (object) and unpopulated (string) department IDs
      if (typeof dept === 'string') return null;
      return dept?.name || null;
    }).filter(Boolean);
    return Array.from(new Set(departments)).sort();
  };

  const filteredAndSortedEmployees = () => {
    let filtered = employees.filter(emp => {
      const matchesSearch = 
        emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.workEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.primaryPositionId?.title?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'ALL' || emp.status === filterStatus;
      const matchesDepartment = filterDepartment === 'ALL' || emp.primaryDepartmentId?.name === filterDepartment;

      return matchesSearch && matchesStatus && matchesDepartment;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'firstName':
          return (a.firstName || '').localeCompare(b.firstName || '');
        case 'lastName':
          return (a.lastName || '').localeCompare(b.lastName || '');
        case 'employeeNumber':
          return (a.employeeNumber || '').localeCompare(b.employeeNumber || '');
        case 'department':
          return (a.primaryDepartmentId?.name || '').localeCompare(b.primaryDepartmentId?.name || '');
        case 'dateOfHire':
          return new Date(a.dateOfHire).getTime() - new Date(b.dateOfHire).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleEditEmployee = (employeeId: string) => {
    router.push(`/dashboard/hr/employees/${employeeId}/edit`);
  };

  const handleViewProfile = (employeeId: string) => {
    router.push(`/dashboard/hr/employees/${employeeId}`);
  };

  const handleDeactivateEmployee = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowDeactivateModal(true);
  };

  const confirmDeactivate = async () => {
    try {
      await axios.patch(`/employee-profile/${selectedEmployeeId}`, {
        status: deactivationType
      });
      
      setShowDeactivateModal(false);
      setSelectedEmployeeId('');
      setDeactivationType(EmployeeStatus.INACTIVE);
      
      // Refresh the list
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate employee');
    }
  };

  const handleReactivateEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to reactivate this employee?')) {
      return;
    }

    try {
      await axios.patch(`/employee-profile/${employeeId}`, {
        status: EmployeeStatus.ACTIVE
      });
      
      // Refresh the list
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reactivate employee');
    }
  };

  const getStatusClass = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return styles.statusActive;
      case EmployeeStatus.INACTIVE:
        return styles.statusInactive;
      case EmployeeStatus.PROBATION:
        return styles.statusProbation;
      case EmployeeStatus.ON_LEAVE:
        return styles.statusOnLeave;
      case EmployeeStatus.SUSPENDED:
        return styles.statusSuspended;
      case EmployeeStatus.RETIRED:
        return styles.statusRetired;
      case EmployeeStatus.TERMINATED:
        return styles.statusTerminated;
      default:
        return styles.statusInactive;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredList = filteredAndSortedEmployees();

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
        <Spinner fullScreen message="Loading employees..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Employee Directory</h1>
            <p className={styles.subtitle}>
              {filteredList.length} of {employees.length} employees
            </p>
          </div>
          <button 
            className={styles.addButton}
            onClick={() => router.push('/dashboard/hr/employees/new')}
          >
            + Add Employee
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Search and Filters */}
        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search by name, ID, email, or position..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.filters}>
            <select
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value={EmployeeStatus.ACTIVE}>Active</option>
              <option value={EmployeeStatus.INACTIVE}>Inactive</option>
              <option value={EmployeeStatus.PROBATION}>Probation</option>
              <option value={EmployeeStatus.ON_LEAVE}>On Leave</option>
              <option value={EmployeeStatus.SUSPENDED}>Suspended</option>
              <option value={EmployeeStatus.RETIRED}>Retired</option>
              <option value={EmployeeStatus.TERMINATED}>Terminated</option>
            </select>

            <select
              className={styles.filterSelect}
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {getUniqueDepartments().map((dept, index) => (
                <option key={`dept-${dept}-${index}`} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              className={styles.filterSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="lastName">Sort by Last Name</option>
              <option value="firstName">Sort by First Name</option>
              <option value="employeeId">Sort by ID</option>
              <option value="department">Sort by Department</option>
              <option value="dateOfHire">Sort by Hire Date</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{employees.length}</div>
            <div className={styles.statLabel}>Total Employees</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {employees.filter(e => e.status === EmployeeStatus.ACTIVE).length}
            </div>
            <div className={styles.statLabel}>Active</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {employees.filter(e => e.status === EmployeeStatus.ON_LEAVE).length}
            </div>
            <div className={styles.statLabel}>On Leave</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {getUniqueDepartments().length}
            </div>
            <div className={styles.statLabel}>Departments</div>
          </div>
        </div>

        {/* Employee Table */}
        {filteredList.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No employees found matching your criteria</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Hire Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((employee) => (
                  <tr key={employee._id}>
                    <td className={styles.employeeId}>{employee.employeeNumber || ''}</td>
                    <td className={styles.employeeName}>
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td>{employee.primaryPositionId?.title || ''}</td>
                    <td>{employee.primaryDepartmentId?.name || ''}</td>
                    <td className={styles.email}>{employee.workEmail || employee.personalEmail || ''}</td>
                    <td>{formatDate(employee.dateOfHire)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusClass(employee.status)}`}>
                        {employee.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleViewProfile(employee._id)}
                          title="View Profile"
                        >
                          View Info
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleEditEmployee(employee._id)}
                          title="Edit Profile"
                        >
                          Edit Info
                        </button>
                        {employee.status === EmployeeStatus.ACTIVE ? (
                          <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={() => handleDeactivateEmployee(employee._id)}
                            title="Deactivate"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className={`${styles.actionButton} ${styles.successButton}`}
                            onClick={() => handleReactivateEmployee(employee._id)}
                            title="Reactivate"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Deactivate Modal */}
        {showDeactivateModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2 className={styles.modalTitle}>Deactivate Employee</h2>
              <p className={styles.modalText}>
                Please select the deactivation type:
              </p>
              
              <div className={styles.modalForm}>
                <label className={styles.modalLabel}>Status Type</label>
                <select
                  className={styles.modalSelect}
                  value={deactivationType}
                  onChange={(e) => setDeactivationType(e.target.value as EmployeeStatus)}
                >
                  <option value={EmployeeStatus.INACTIVE}>Inactive</option>
                  <option value={EmployeeStatus.PROBATION}>Probation</option>
                  <option value={EmployeeStatus.ON_LEAVE}>On Leave</option>
                  <option value={EmployeeStatus.SUSPENDED}>Suspended</option>
                  <option value={EmployeeStatus.RETIRED}>Retired</option>
                  <option value={EmployeeStatus.TERMINATED}>Terminated</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.modalCancelButton}
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setSelectedEmployeeId('');
                    setDeactivationType(EmployeeStatus.INACTIVE);
                  }}
                >
                  Cancel
                </button>
                <button
                  className={styles.modalConfirmButton}
                  onClick={confirmDeactivate}
                >
                  Confirm Deactivation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
