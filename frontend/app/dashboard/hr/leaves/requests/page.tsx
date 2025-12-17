/**
 * Leave Requests Management Page
 * View and manage all leave requests
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
import styles from './requests.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
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

interface LeaveRequest {
  _id: string;
  employeeId: Employee | string;
  leaveTypeId: LeaveType | string;
  dates: {
    from: string;
    to: string;
  };
  durationDays: number;
  justification?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvalFlow: {
    role: string;
    status: string;
    decidedBy?: string;
    decidedAt?: string;
  }[];
  irregularPatternFlag?: boolean;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

const statusColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706' },
  approved: { bg: '#dcfce7', color: '#16a34a' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
  cancelled: { bg: '#f1f5f9', color: '#64748b' },
};

export default function LeaveRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [requestsRes, typesRes, employeesRes] = await Promise.all([
        axios.get('/leaves/requests'),
        axios.get('/leaves/types'),
        axios.get('/employee-profile'),
      ]);
      setRequests(requestsRes.data);
      setLeaveTypes(typesRes.data);
      setEmployees(employeesRes.data);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenActionModal = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setComments('');
    setShowActionModal(true);
    setError('');
  };

  const handleCloseActionModal = () => {
    setShowActionModal(false);
    setSelectedRequest(null);
    setComments('');
    setError('');
  };

  const handleAction = async () => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      setError('');

      // Get current user info from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const approverId = user?._id || user?.sub || user?.id || user?.employeeId || '';

      if (!approverId) {
        setError('Unable to identify current user. Please log in again.');
        setSubmitting(false);
        return;
      }

      console.log('[Leave Action] Approver ID:', approverId);
      console.log('[Leave Action] User object:', user);

      if (actionType === 'approve') {
        await axios.post(`/leaves/requests/${selectedRequest._id}/approve`, {
          approverId,
          approverRole: 'HR',
          comments: comments.trim() || undefined,
        });
        setSuccess('Request approved successfully!');
      } else {
        if (!comments.trim()) {
          setError('Rejection reason is required');
          setSubmitting(false);
          return;
        }
        await axios.post(`/leaves/requests/${selectedRequest._id}/reject`, {
          approverId,
          approverRole: 'HR',
          reason: comments.trim(),
        });
        setSuccess('Request rejected successfully!');
      }

      handleCloseActionModal();
      // Wait a moment for the backend to commit changes, then refresh
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to process request:', err);
      setError(err.response?.data?.message || 'Failed to process request');
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
      return leaveType.name;
    }
    const type = leaveTypes.find(t => t._id === leaveType);
    return type?.name || 'Unknown';
  };

  const getLeaveTypeCode = (leaveType: LeaveType | string): string => {
    if (typeof leaveType === 'object' && leaveType !== null) {
      return leaveType.code;
    }
    const type = leaveTypes.find(t => t._id === leaveType);
    return type?.code || '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredRequests = statusFilter === 'all' 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leave Requests" role="HR Admin">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>📝 Leave Requests</h1>
              <p className={styles.subtitle}>
                View and manage employee leave requests
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.statusFilters}>
              <button
                className={`${styles.filterButton} ${statusFilter === 'all' ? styles.filterButtonActive : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All ({requests.length})
              </button>
              <button
                className={`${styles.filterButton} ${statusFilter === 'pending' ? styles.filterButtonActive : ''}`}
                onClick={() => setStatusFilter('pending')}
                style={statusFilter === 'pending' ? { background: statusColors.pending.bg, color: statusColors.pending.color } : undefined}
              >
                ⏳ Pending ({pendingCount})
              </button>
              <button
                className={`${styles.filterButton} ${statusFilter === 'approved' ? styles.filterButtonActive : ''}`}
                onClick={() => setStatusFilter('approved')}
              >
                ✅ Approved
              </button>
              <button
                className={`${styles.filterButton} ${statusFilter === 'rejected' ? styles.filterButtonActive : ''}`}
                onClick={() => setStatusFilter('rejected')}
              >
                ❌ Rejected
              </button>
              <button
                className={`${styles.filterButton} ${statusFilter === 'cancelled' ? styles.filterButtonActive : ''}`}
                onClick={() => setStatusFilter('cancelled')}
              >
                🚫 Cancelled
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className={styles.tableContainer}>
            {loading ? (
              <Spinner message="Loading requests..." />
            ) : filteredRequests.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📝</span>
                <h3>No Requests Found</h3>
                <p>
                  {statusFilter === 'all' 
                    ? 'No leave requests have been submitted yet.'
                    : `No ${statusFilter} requests found.`}
                </p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div className={styles.employeeCell}>
                          <span className={styles.employeeName}>
                            {getEmployeeName(request.employeeId)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.leaveTypeCell}>
                          <span className={styles.leaveTypeCode}>
                            {getLeaveTypeCode(request.leaveTypeId)}
                          </span>
                          <span className={styles.leaveTypeName}>
                            {getLeaveTypeName(request.leaveTypeId)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.datesCell}>
                          <span>{formatDate(request.dates.from)}</span>
                          <span className={styles.dateSeparator}>→</span>
                          <span>{formatDate(request.dates.to)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.daysCount}>{request.durationDays}</span>
                      </td>
                      <td>
                        <span 
                          className={styles.statusBadge}
                          style={{ 
                            background: statusColors[request.status].bg,
                            color: statusColors[request.status].color,
                          }}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td>{formatDate(request.createdAt)}</td>
                      <td>
                        {request.status === 'pending' ? (
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.approveButton}
                              onClick={() => handleOpenActionModal(request, 'approve')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleOpenActionModal(request, 'reject')}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span className={styles.noAction}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Action Modal */}
          {showActionModal && selectedRequest && (
            <div className={styles.modalOverlay} onClick={handleCloseActionModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>{actionType === 'approve' ? '✅ Approve Request' : '❌ Reject Request'}</h2>
                  <button className={styles.closeButton} onClick={handleCloseActionModal}>
                    ✕
                  </button>
                </div>
                <div className={styles.modalContent}>
                  <div className={styles.requestSummary}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Employee:</span>
                      <span>{getEmployeeName(selectedRequest.employeeId)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Leave Type:</span>
                      <span>{getLeaveTypeName(selectedRequest.leaveTypeId)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Dates:</span>
                      <span>{formatDate(selectedRequest.dates.from)} → {formatDate(selectedRequest.dates.to)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Duration:</span>
                      <span>{selectedRequest.durationDays} day(s)</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Reason:</span>
                      <span>{selectedRequest.justification || 'No reason provided'}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="comments">
                      {actionType === 'approve' ? 'Comments (Optional)' : 'Rejection Reason *'}
                    </label>
                    <textarea
                      id="comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder={actionType === 'approve' 
                        ? 'Add any comments for the employee...'
                        : 'Please provide a reason for rejection...'
                      }
                      rows={3}
                      required={actionType === 'reject'}
                    />
                  </div>

                  {error && <div className={styles.formError}>{error}</div>}

                  <div className={styles.modalActions}>
                    <button
                      className={styles.cancelButton}
                      onClick={handleCloseActionModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      className={actionType === 'approve' ? styles.confirmApproveButton : styles.confirmRejectButton}
                      onClick={handleAction}
                      disabled={submitting}
                    >
                      {submitting 
                        ? 'Processing...' 
                        : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
