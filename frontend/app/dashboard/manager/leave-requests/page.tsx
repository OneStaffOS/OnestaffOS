/**
 * Manager Leave Requests Page
 * REQ-020, REQ-021, REQ-022: Review, approve, and reject leave requests
 * Filters by manager's department by default
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from '@/lib/axios-config';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '../../../components/Spinner';
import styles from './leave-requests.module.css';
import { SystemRole } from '@/lib/roles';

interface LeaveRequest {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    primaryDepartmentId?: { _id: string; name: string };
  };
  leaveTypeId: {
    _id: string;
    name: string;
    code: string;
    paid: boolean;
  };
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
  createdAt: string;
}

interface ManagerProfile {
  _id: string;
  firstName: string;
  lastName: string;
  primaryDepartmentId?: { _id: string; name: string } | string;
}

export default function ManagerLeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const fetchManagerProfile = useCallback(async () => {
    try {
      const res = await axios.get('/employee-profile/my-profile');
      setManagerProfile(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch manager profile:', err);
      return null;
    }
  }, []);

  const fetchLeaveRequests = useCallback(async (profile: ManagerProfile | null) => {
    if (!profile) return;
    
    setLoading(true);
    setError('');
    
    try {
      const deptId = typeof profile.primaryDepartmentId === 'object' 
        ? profile.primaryDepartmentId._id 
        : profile.primaryDepartmentId;
      
      if (!deptId) {
        setError('Your department is not configured. Please contact HR.');
        setRequests([]);
        return;
      }

      const res = await axios.get(`/leaves/requests/department/${deptId}`, {
        params: { status: statusFilter || undefined }
      });
      setRequests(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch leave requests:', err);
      setError(err.response?.data?.message || 'Failed to load leave requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const init = async () => {
      const profile = await fetchManagerProfile();
      await fetchLeaveRequests(profile);
    };
    init();
  }, [fetchManagerProfile, fetchLeaveRequests]);

  useEffect(() => {
    if (managerProfile) {
      fetchLeaveRequests(managerProfile);
    }
  }, [statusFilter, managerProfile, fetchLeaveRequests]);

  const handleApprove = async (requestId: string) => {
    if (!managerProfile) return;
    
    setProcessing(requestId);
    setError('');
    setSuccess('');

    try {
      await axios.post(`/leaves/requests/${requestId}/approve`, {
        approverId: managerProfile._id,
        approverRole: 'Manager',
        comments: 'Approved by department manager',
      });
      
      setSuccess('Leave request approved successfully');
      await fetchLeaveRequests(managerProfile);
    } catch (err: any) {
      console.error('Failed to approve:', err);
      setError(err.response?.data?.message || 'Failed to approve leave request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!managerProfile || !rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    setProcessing(requestId);
    setError('');
    setSuccess('');

    try {
      await axios.post(`/leaves/requests/${requestId}/reject`, {
        approverId: managerProfile._id,
        approverRole: 'Manager',
        reason: rejectReason,
        comments: rejectReason,
      });
      
      setSuccess('Leave request rejected');
      setShowRejectModal(null);
      setRejectReason('');
      await fetchLeaveRequests(managerProfile);
    } catch (err: any) {
      console.error('Failed to reject:', err);
      setError(err.response?.data?.message || 'Failed to reject leave request');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'approved': return styles.statusApproved;
      case 'rejected': return styles.statusRejected;
      case 'cancelled': return styles.statusCancelled;
      default: return '';
    }
  };

  const getDepartmentName = () => {
    if (!managerProfile?.primaryDepartmentId) return 'Your Department';
    return typeof managerProfile.primaryDepartmentId === 'object' 
      ? managerProfile.primaryDepartmentId.name 
      : 'Your Department';
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN]}>
      <DashboardLayout title="Leave Requests" role="Manager">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>📋 Leave Requests</h1>
              <p className={styles.subtitle}>
                Review and manage leave requests from {getDepartmentName()}
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.select}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="">All</option>
              </select>
            </div>
            <div className={styles.statsBar}>
              <span className={styles.stat}>
                <strong>{requests.length}</strong> request(s) found
              </span>
            </div>
          </div>

          {/* Requests List */}
          {loading ? (
            <Spinner message="Loading leave requests..." />
          ) : requests.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <h3>No Leave Requests</h3>
              <p>There are no {statusFilter || ''} leave requests from your department at this time.</p>
            </div>
          ) : (
            <div className={styles.requestsList}>
              {requests.map((request) => (
                <div key={request._id} className={styles.requestCard}>
                  <div className={styles.requestHeader}>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>
                        {request.employeeId?.firstName} {request.employeeId?.lastName}
                      </span>
                      <span className={styles.employeeNumber}>
                        #{typeof request.employeeId?.employeeNumber === 'string' ? request.employeeId?.employeeNumber : request.employeeId?._id}
                      </span>
                    </div>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(request.status)}`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>

                  <div className={styles.requestDetails}>
                    <div className={styles.leaveType}>
                      <span className={styles.leaveTypeCode}>{request.leaveTypeId?.code}</span>
                      <span className={styles.leaveTypeName}>{request.leaveTypeId?.name}</span>
                      {request.leaveTypeId?.paid && (
                        <span className={styles.paidBadge}>Paid</span>
                      )}
                    </div>

                    <div className={styles.dateRange}>
                      <span className={styles.dateIcon}>📅</span>
                      <span>{formatDate(request.dates.from)}</span>
                      <span className={styles.dateSeparator}>→</span>
                      <span>{formatDate(request.dates.to)}</span>
                      <span className={styles.duration}>({request.durationDays} day{request.durationDays > 1 ? 's' : ''})</span>
                    </div>

                    {request.justification && (
                      <div className={styles.justification}>
                        <strong>Reason:</strong> {request.justification}
                      </div>
                    )}

                    <div className={styles.submittedDate}>
                      Submitted: {formatDate(request.createdAt)}
                    </div>

                    {/* Show manager step status */}
                    {request.approvalFlow && request.approvalFlow[0] && (
                      <div className={styles.managerStepStatus}>
                        <strong>Manager Approval:</strong>{' '}
                        <span className={`${styles.stepStatus} ${getStatusBadgeClass(request.approvalFlow[0].status)}`}>
                          {request.approvalFlow[0].status}
                        </span>
                        {request.approvalFlow[0].decidedAt && (
                          <span className={styles.stepDate}>
                            {' '}on {formatDate(request.approvalFlow[0].decidedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Only show buttons if manager step (first step) is still pending */}
                  {request.approvalFlow && request.approvalFlow[0]?.status === 'pending' && (
                    <div className={styles.actions}>
                      <button
                        className={styles.approveButton}
                        onClick={() => handleApprove(request._id)}
                        disabled={processing === request._id}
                      >
                        {processing === request._id ? 'Processing...' : '✓ Approve'}
                      </button>
                      <button
                        className={styles.rejectButton}
                        onClick={() => setShowRejectModal(request._id)}
                        disabled={processing === request._id}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {/* Show message if manager already processed */}
                  {request.approvalFlow && request.approvalFlow[0]?.status !== 'pending' && (
                    <div className={styles.approvalHistory}>
                      <strong>Status:</strong> You have already {request.approvalFlow[0]?.status} this request.
                      {request.approvalFlow.length > 1 && request.approvalFlow[0]?.status === 'approved' && (
                        <div style={{ marginTop: '0.5rem', color: '#6b7280' }}>
                          Awaiting HR approval (Step 2)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reject Modal */}
          {showRejectModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>Reject Leave Request</h3>
                <p>Please provide a reason for rejecting this request:</p>
                <textarea
                  className={styles.rejectTextarea}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={4}
                />
                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowRejectModal(null);
                      setRejectReason('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.confirmRejectButton}
                    onClick={() => handleReject(showRejectModal)}
                    disabled={!rejectReason.trim() || processing === showRejectModal}
                  >
                    {processing === showRejectModal ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
