/**
 * HR Change Requests Review Page (Route: /hr/change-requests)
 * US-E2-03: Review and approve employee-submitted profile changes
 * BR 36: All changes must be made via workflow approval
 * BR 22: Trace all editing, changes, and cancellations
 * Phase III: Review and Process Change Request
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './change-requests.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';

// Interface matching what the API actually returns
interface ChangeRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  requestType: string;
  field: string;
  currentValue: string;
  requestedValue: string;
  submittedDate: string;
  status: string;
}

export default function HRChangeRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return styles.statusPending;
      case 'APPROVED':
        return styles.statusApproved;
      case 'REJECTED':
        return styles.statusRejected;
      default:
        return '';
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
            Pending ({requests.filter(r => r.status === 'PENDING').length})
          </button>
          <button
            className={`${styles.tab} ${filterStatus === 'APPROVED' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('APPROVED')}
          >
            Approved ({requests.filter(r => r.status === 'APPROVED').length})
          </button>
          <button
            className={`${styles.tab} ${filterStatus === 'REJECTED' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('REJECTED')}
          >
            Rejected ({requests.filter(r => r.status === 'REJECTED').length})
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
              <div key={request.id || `request-${index}`} className={styles.requestCard}>
                <div className={styles.requestHeader}>
                  <div>
                    <h3 className={styles.requestTitle}>
                      {request.employeeName}
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
                    <strong>Field:</strong> {request.field}
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Request Details:</strong>
                    <pre className={styles.valueBox}>{formatValue(request.requestedValue)}</pre>
                  </div>
                  <div className={styles.detailRow}>
                    <strong>Submitted:</strong> {formatDate(request.submittedDate)}
                  </div>
                </div>

                {request.status === 'PENDING' && (
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
                  
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.reviewInfo}>
                  <p><strong>Employee:</strong> {selectedRequest.employeeName}</p>
                  <p><strong>Field:</strong> {selectedRequest.field}</p>
                  <p><strong>Request Details:</strong></p>
                  <pre className={styles.valueBox}>{formatValue(selectedRequest.requestedValue)}</pre>
                  <p><strong>Submitted:</strong> {formatDate(selectedRequest.submittedDate)}</p>
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
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  className={`${styles.button} ${styles.approveButton}`}
                  onClick={() => handleApprove(selectedRequest.id)}
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