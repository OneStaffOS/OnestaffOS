/**
 * HR Admin - Employee Status Management Page (Route: /hr/employee-status)
 * Activate, suspend, or manage employee account status
 * Phase III: HR/Admin Processing & Master Data
 */

"use client";

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import { EmployeeStatus } from '@/lib/types/employee-profile.types';
import styles from './employee-status.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Employee {
  _id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  workEmail?: string;
  personalEmail?: string;
  primaryPositionId?: {
    _id: string;
    title: string;
  };
  primaryDepartmentId?: {
    _id: string;
    name: string;
  };
  status: EmployeeStatus;
  dateOfHire: string;
  contractEndDate?: string;
}

export default function EmployeeStatusPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newStatus, setNewStatus] = useState<EmployeeStatus>(EmployeeStatus.ACTIVE);
  const [endDate, setEndDate] = useState('');

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

  const handleUpdateStatus = async () => {
    if (!selectedEmployee) return;

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === EmployeeStatus.TERMINATED && endDate) {
        updateData.contractEndDate = endDate;
      }

      await axios.put(`/employee-profile/${selectedEmployee._id}`, updateData);
      setSelectedEmployee(null);
      setNewStatus(EmployeeStatus.ACTIVE);
      setEndDate('');
      fetchEmployees();
      alert('Employee status updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openStatusModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewStatus(employee.status);
    setEndDate(employee.contractEndDate || '');
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.workEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.personalEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || emp.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusClass = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return styles.statusActive;
      case EmployeeStatus.ON_LEAVE:
        return styles.statusOnLeave;
      case EmployeeStatus.SUSPENDED:
        return styles.statusSuspended;
      case EmployeeStatus.TERMINATED:
        return styles.statusTerminated;
      default:
        return '';
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Employee Status Management</h1>
            <p className={styles.subtitle}>Manage employee account status and access</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.controls}>
          <input
            type="text" placeholder="Search employees..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">All Statuses</option>
            <option value={EmployeeStatus.ACTIVE}>Active</option>
            <option value={EmployeeStatus.ON_LEAVE}>On Leave</option>
            <option value={EmployeeStatus.SUSPENDED}>Suspended</option>
            <option value={EmployeeStatus.TERMINATED}>Terminated</option>
          </select>
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
                  <th>Status</th>
                  <th>Hire Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp._id}>
                    <td>{emp.employeeNumber}</td>
                    <td className={styles.empName}>{emp.firstName} {emp.lastName}</td>
                    <td className={styles.email}>{emp.workEmail || emp.personalEmail || 'N/A'}</td>
                    <td>{emp.primaryPositionId?.title || 'N/A'}</td>
                    <td>{emp.primaryDepartmentId?.name || 'N/A'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusClass(emp.status)}`}>
                        {emp.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{formatDate(emp.dateOfHire)}</td>
                    <td>{emp.contractEndDate ? formatDate(emp.contractEndDate) : '-'}</td>
                    <td>
                      <button
                        className={styles.actionButton}
                        onClick={() => openStatusModal(emp)}
                      >
                        Update Status
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
                <h2>Update Status: {selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                <button className={styles.closeButton} onClick={() => setSelectedEmployee(null)}>×</button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Current Status</label>
                  <p className={styles.currentValue}>{selectedEmployee.status.replace('_', ' ')}</p>
                </div>
                <div className={styles.formGroup}>
                  <label>New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as EmployeeStatus)}
                    className={styles.select}
                  >
                    <option value={EmployeeStatus.ACTIVE}>Active</option>
                    <option value={EmployeeStatus.ON_LEAVE}>On Leave</option>
                    <option value={EmployeeStatus.SUSPENDED}>Suspended</option>
                    <option value={EmployeeStatus.TERMINATED}>Terminated</option>
                  </select>
                </div>
                {newStatus === EmployeeStatus.TERMINATED && (
                  <div className={styles.formGroup}>
                    <label>Contract End Date</label>
                    <input
                      type="date" value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                )}
                <div className={styles.warningBox}>
                  <strong>Warning:</strong> Changing employee status will affect their access to the system.
                </div>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelButton} onClick={() => setSelectedEmployee(null)}>
                  Cancel
                </button>
                <button className={styles.submitButton} onClick={handleUpdateStatus}>
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}