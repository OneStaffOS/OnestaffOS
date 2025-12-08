/**
 * Leave Balance Adjustments Page
 * REQ-013: Manual balance adjustment with audit trail
 * Accessible by: HR Admin, HR Manager, System Admin
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './adjustments.module.css';

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface LeaveType {
  _id: string;
  code: string;
  name: string;
}

interface Adjustment {
  _id: string;
  employeeId: Employee | string;
  leaveTypeId: LeaveType | string;
  adjustmentType: 'add' | 'deduct' | 'encashment';
  amount: number;
  reason: string;
  hrUserId: Employee | string;
  createdAt: string;
}

interface FormData {
  employeeId: string;
  leaveTypeId: string;
  adjustmentType: string;
  amount: string;
  reason: string;
}

const initialFormData: FormData = {
  employeeId: '',
  leaveTypeId: '',
  adjustmentType: 'add',
  amount: '',
  reason: '',
};

const adjustmentTypes = [
  { value: 'add', label: 'Add Days', icon: '➕', color: '#059669' },
  { value: 'deduct', label: 'Deduct Days', icon: '➖', color: '#dc2626' },
  { value: 'encashment', label: 'Encashment', icon: '💵', color: '#f59e0b' },
];

export default function LeaveAdjustmentsPage() {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [employeesRes, typesRes] = await Promise.all([
        axios.get('/employee-profile'),
        axios.get('/leaves/types'),
      ]);
      setEmployees(employeesRes.data);
      setLeaveTypes(typesRes.data);

      // Get current user
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdjustments = useCallback(async (employeeId: string) => {
    if (!employeeId) {
      setAdjustments([]);
      return;
    }
    try {
      const response = await axios.get(`/leaves/adjustments/employee/${employeeId}`);
      setAdjustments(response.data);
    } catch (err: any) {
      console.error('Failed to fetch adjustments:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchAdjustments(selectedEmployee);
    }
  }, [selectedEmployee, fetchAdjustments]);

  const handleOpenModal = () => {
    setFormData({
      ...initialFormData,
      employeeId: selectedEmployee,
    });
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.leaveTypeId || !formData.amount || !formData.reason) {
      setError('All fields are required');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        employeeId: formData.employeeId,
        leaveTypeId: formData.leaveTypeId,
        adjustmentType: formData.adjustmentType,
        amount: amount,
        reason: formData.reason.trim(),
        hrUserId: currentUser?.employeeId || currentUser?.sub || currentUser?._id,
      };

      await axios.post('/leaves/adjustments', payload);
      setSuccess('Adjustment created successfully!');

      handleCloseModal();
      if (selectedEmployee) {
        fetchAdjustments(selectedEmployee);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to create adjustment:', err);
      setError(err.response?.data?.message || 'Failed to create adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const getEmployeeName = (employee: Employee | string): string => {
    if (typeof employee === 'object' && employee !== null) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    const emp = employees.find(e => e._id === employee);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
  };

  const getLeaveTypeName = (leaveType: LeaveType | string): string => {
    if (typeof leaveType === 'object' && leaveType !== null) {
      return `${leaveType.code} - ${leaveType.name}`;
    }
    const type = leaveTypes.find(t => t._id === leaveType);
    return type ? `${type.code} - ${type.name}` : 'Unknown';
  };

  const getAdjustmentInfo = (type: string) => {
    return adjustmentTypes.find(t => t.value === type) || adjustmentTypes[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leave Adjustments" role="HR Admin">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>⚖️ Leave Balance Adjustments</h1>
              <p className={styles.subtitle}>
                Manual adjustments to employee leave balances with full audit trail
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                ← Back
              </button>
              <button 
                className={styles.addButton}
                onClick={handleOpenModal}
              >
                + New Adjustment
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Employee Selector */}
          <div className={styles.employeeSelector}>
            <label>Select Employee to View Adjustments:</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className={styles.employeeSelect}
            >
              <option value="">-- Select an employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          {/* Adjustments Table */}
          <div className={styles.tableContainer}>
            {loading ? (
              <Spinner message="Loading..." />
            ) : !selectedEmployee ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>👤</span>
                <h3>Select an Employee</h3>
                <p>Choose an employee from the dropdown to view their adjustment history.</p>
              </div>
            ) : adjustments.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>⚖️</span>
                <h3>No Adjustments Found</h3>
                <p>No balance adjustments have been made for this employee.</p>
                <button 
                  className={styles.addButton}
                  onClick={handleOpenModal}
                >
                  + Create First Adjustment
                </button>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Leave Type</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Adjusted By</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adjustment) => {
                    const typeInfo = getAdjustmentInfo(adjustment.adjustmentType);
                    return (
                      <tr key={adjustment._id}>
                        <td>{formatDate(adjustment.createdAt)}</td>
                        <td>
                          <span 
                            className={styles.typeBadge}
                            style={{ 
                              background: `${typeInfo.color}15`,
                              color: typeInfo.color,
                            }}
                          >
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                        </td>
                        <td>{getLeaveTypeName(adjustment.leaveTypeId)}</td>
                        <td>
                          <span 
                            className={styles.amountBadge}
                            style={{ 
                              color: adjustment.adjustmentType === 'add' ? '#059669' : '#dc2626'
                            }}
                          >
                            {adjustment.adjustmentType === 'add' ? '+' : '-'}{adjustment.amount} days
                          </span>
                        </td>
                        <td className={styles.reasonCell}>{adjustment.reason}</td>
                        <td>{getEmployeeName(adjustment.hrUserId)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal */}
          {showModal && (
            <div className={styles.modalOverlay} onClick={handleCloseModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>Create Adjustment</h2>
                  <button className={styles.closeButton} onClick={handleCloseModal}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label htmlFor="employeeId">Employee *</label>
                    <select
                      id="employeeId"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      required
                    >
                      <option value="">Select an employee</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="leaveTypeId">Leave Type *</label>
                    <select
                      id="leaveTypeId"
                      value={formData.leaveTypeId}
                      onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                      required
                    >
                      <option value="">Select a leave type</option>
                      {leaveTypes.map(type => (
                        <option key={type._id} value={type._id}>
                          {type.code} - {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Adjustment Type *</label>
                    <div className={styles.adjustmentTypes}>
                      {adjustmentTypes.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          className={`${styles.typeButton} ${formData.adjustmentType === type.value ? styles.typeButtonActive : ''}`}
                          onClick={() => setFormData({ ...formData, adjustmentType: type.value })}
                          style={{ 
                            borderColor: formData.adjustmentType === type.value ? type.color : '#e2e8f0',
                            background: formData.adjustmentType === type.value ? `${type.color}10` : 'white',
                          }}
                        >
                          <span className={styles.typeIcon}>{type.icon}</span>
                          <span>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="amount">Amount (days) *</label>
                    <input
                      type="number"
                      id="amount"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="e.g., 5"
                      step="0.5"
                      min="0.5"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="reason">Reason *</label>
                    <textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Enter the reason for this adjustment..."
                      rows={3}
                      required
                    />
                  </div>

                  {error && <div className={styles.formError}>{error}</div>}
                  
                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={handleCloseModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Adjustment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
