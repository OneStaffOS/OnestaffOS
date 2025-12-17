/**
 * HR Change Requests Review Page (Route: /hr/change-requests)
 * US-E2-03: Review and approve employee-submitted profile changes
 * BR 36: All changes must be made via workflow approval
 * BR 22: Trace all editing, changes, and cancellations
 * Phase III: Review and Process Change Request
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { ProfileChangeRequest, ChangeRequestStatus } from '@/lib/types/employee-profile.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './change-requests.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function HRChangeRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<ProfileChangeRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/employee-profile/change-requests');
      setRequests(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => 
    filterStatus === 'ALL' || req.status === filterStatus
  );

  const handleApprove = async (requestId: string) => {
    if (!requestId) {
      alert('Invalid request ID');
      return;
    }
    
    if (!confirm('Are you sure you want to approve this change request?')) {
      return;
    }

    setProcessing(true);
    try {
      await axios.patch(`/employee-profile/change-requests/${requestId}/approve`);

      // Refresh the list
      await fetchRequests();
      setSelectedRequest(null);
      setReviewComment('');
      alert('Change request approved successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!requestId) {
      alert('Invalid request ID');
      return;
    }
    
    if (!confirm('Are you sure you want to reject this change request?')) {
      return;
    }

    setProcessing(true);
    try {
      await axios.patch(`/employee-profile/change-requests/${requestId}/reject`);

      // Refresh the list
      await fetchRequests();
      setSelectedRequest(null);
      setReviewComment('');
      alert('Change request rejected');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusClass = (status: ChangeRequestStatus) => {
    switch (status) {
      case ChangeRequestStatus.PENDING:
        return styles.statusPending;
      case ChangeRequestStatus.APPROVED:
        return styles.statusApproved;
      case ChangeRequestStatus.REJECTED:
        return styles.statusRejected;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
        <Spinner fullScreen message="Loading change requests..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Profile Change Requests</h1>
            <p className={styles.subtitle}>
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Filter Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${filterStatus === 'PENDING' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('PENDING')}
          >
            Pending ({requests.filter(r => r.status === ChangeRequestStatus.PENDING).length})
          </button>
          <button
            className={`${styles.tab} ${filterStatus === 'APPROVED' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('APPROVED')}
          >
            Approved ({requests.filter(r => r.status === ChangeRequestStatus.APPROVED).length})
          </button>
          <button
            className={`${styles.tab} ${filterStatus === 'REJECTED' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('REJECTED')}
          >
            Rejected ({requests.filter(r => r.status === ChangeRequestStatus.REJECTED).length})
          </button>
          <button
            className={`${styles.tab} ${filterStatus === 'ALL' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            All ({requests.length})
          </button>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No change requests found</p>
          </div>
        ) : (
          <div className={styles.requestsGrid}>
            {filteredRequests.map((request, index) => (
              <div key={(request as any).id || `request-${index}`} className={styles.requestCard}>
                <div className={styles.requestHeader}>
                  <div>
                    <h3 className={styles.requestTitle}>
                      {request.requestType.replace('_', ' ')}
                    </h3>
                    <p className={styles.requestEmployee}>
                      Employee ID: {request.employeeId}
                    </p>
                  </div>
                  <span className={`${styles.statusBadge} ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <div className={styles.requestDetails}>
                  <div className={styles.detailRow}>
                    <strong>Field:</strong> {request.fieldName}
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Current Value:</strong>
                    <pre className={styles.valueBox}>{formatValue(request.currentValue)}</pre>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Requested Value:</strong>
                    <pre className={styles.valueBox}>{formatValue(request.requestedValue)}</pre>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Reason:</strong>
                    <p className={styles.reason}>{request.reason}</p>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Requested:</strong> {formatDate(request.createdAt)}
                  </div>

                  {request.reviewedAt && (
                    <>
                      <div className={styles.detailRow}>
                        <strong>Reviewed:</strong> {formatDate(request.reviewedAt)}
                      </div>
                      {request.reviewComments && (
                        <div className={styles.detailRow}>
                          <strong>Review Comments:</strong>
                          <p className={styles.reviewComments}>{request.reviewComments}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {request.status === ChangeRequestStatus.PENDING && (
                  <div className={styles.requestActions}>
                    <button
                      className={styles.reviewButton}
                      onClick={() => {
                        setSelectedRequest(request);
                        setReviewComment('');
                      }}
                    >
                      Review Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Review Modal */}
        {selectedRequest && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Review Change Request</h2>
                <button
                  className={styles.closeButton}
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewComment('');
                  }}
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.reviewInfo}>
                  <p><strong>Field:</strong> {selectedRequest.fieldName}</p>
                  <p><strong>Current Value:</strong> {formatValue(selectedRequest.currentValue)}</p>
                  <p><strong>Requested Value:</strong> {formatValue(selectedRequest.requestedValue)}</p>
                  <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Review Comments (Required for rejection)</label>
                  <textarea
                    className={styles.textarea}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    placeholder="Add your comments here..."
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={`${styles.button} ${styles.rejectButton}`}
                  onClick={() => handleReject((selectedRequest as any).id)}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  className={`${styles.button} ${styles.approveButton}`}
                  onClick={() => handleApprove((selectedRequest as any).id)}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
