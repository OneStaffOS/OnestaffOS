/**
 * My Change Requests Page (Route: /org-structure/my-change-requests)
 * Managers can view their submitted organizational structure change requests
 * REQ-OSM-03: Track status of submitted change requests
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './my-requests.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface ChangeRequest {
  _id: string;
  requestType: string;
  status: string;
  targetDepartmentId?: { _id: string; name: string };
  targetPositionId?: { _id: string; title: string };
  details?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
  approvals?: Array<{
    decision: string;
    comments: string;
    reviewedBy: { firstName: string; lastName: string };
    reviewedAt: string;
  }>;
}

export default function MyChangeRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/organization-structure/change-requests/my-requests');
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

  const handleSubmitRequest = async (requestId: string) => {
    if (!confirm('Submit this request for approval? Once submitted, it cannot be edited.')) {
      return;
    }

    setSubmitting(requestId);
    try {
      await axios.put(`/organization-structure/change-requests/${requestId}/submit`);
      alert('Request submitted successfully! It will be reviewed by System Admin.');
      await fetchMyRequests(); // Refresh the list
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      DRAFT: { label: 'Draft', className: styles.statusDraft },
      SUBMITTED: { label: 'Pending Review', className: styles.statusSubmitted },
      UNDER_REVIEW: { label: 'Under Review', className: styles.statusUnderReview },
      APPROVED: { label: 'Approved', className: styles.statusApproved },
      REJECTED: { label: 'Rejected', className: styles.statusRejected },
      CANCELED: { label: 'Canceled', className: styles.statusCanceled },
      IMPLEMENTED: { label: 'Implemented', className: styles.statusImplemented },
    };

    const statusInfo = statusMap[status] || { label: status, className: styles.statusDefault };
    return (
      <span className={`${styles.statusBadge} ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getRequestTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      NEW_DEPARTMENT: 'New Department',
      UPDATE_DEPARTMENT: 'Update Department',
      NEW_POSITION: 'New Position',
      UPDATE_POSITION: 'Update Position',
      CLOSE_POSITION: 'Close Position',
    };
    return typeMap[type] || type;
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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[
        Role.DEPARTMENT_HEAD,
        Role.HR_MANAGER,
        Role.SYSTEM_ADMIN
      ]}>
        <div className={styles.container}>
          <Spinner message="Loading your change requests..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[
      Role.DEPARTMENT_HEAD,
      Role.HR_MANAGER,
      Role.SYSTEM_ADMIN
    ]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.push('/dashboard/manager')}
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 className={styles.title}>My Change Requests</h1>
            <p className={styles.subtitle}>
              Track your organizational structure change requests
            </p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.controls}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Filter by Status:</label>
            <select
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Requests</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Pending Review</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="IMPLEMENTED">Implemented</option>
            </select>
          </div>

          <button
            className={styles.newRequestButton}
            onClick={() => router.push('/org-structure/change-requests/create')}
          >
            + Submit New Request
          </button>
        </div>

        {filteredRequests.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No change requests found.</p>
            <button
              className={styles.primaryButton}
              onClick={() => router.push('/org-structure/change-requests/create')}
            >
              Submit Your First Request
            </button>
          </div>
        ) : (
          <div className={styles.requestsList}>
            {filteredRequests.map((request) => (
              <div key={request._id} className={styles.requestCard}>
                <div className={styles.requestHeader}>
                  <div>
                    <h3 className={styles.requestType}>
                      {getRequestTypeLabel(request.requestType)}
                    </h3>
                    {request.targetDepartmentId && (
                      <p className={styles.requestTarget}>
                        Department: {request.targetDepartmentId.name}
                      </p>
                    )}
                    {request.targetPositionId && (
                      <p className={styles.requestTarget}>
                        Position: {request.targetPositionId.title}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                {request.details && (
                  <div className={styles.requestDetails}>
                    <strong>Details:</strong> {request.details}
                  </div>
                )}

                {request.reason && (
                  <div className={styles.requestReason}>
                    <strong>Reason:</strong> {request.reason}
                  </div>
                )}

                <div className={styles.requestDates}>
                  <div>
                    <span className={styles.dateLabel}>Submitted:</span>
                    <span className={styles.dateValue}>{formatDate(request.createdAt)}</span>
                  </div>
                  <div>
                    <span className={styles.dateLabel}>Last Updated:</span>
                    <span className={styles.dateValue}>{formatDate(request.updatedAt)}</span>
                  </div>
                </div>

                {request.approvals && request.approvals.length > 0 && (
                  <div className={styles.approvalSection}>
                    <h4 className={styles.approvalTitle}>Review History:</h4>
                    {request.approvals.map((approval, idx) => (
                      <div key={idx} className={styles.approvalItem}>
                        <div className={styles.approvalHeader}>
                          <span className={styles.approvalDecision}>
                            {approval.decision === 'APPROVED' && '✅ Approved'}
                            {approval.decision === 'REJECTED' && '❌ Rejected'}
                            {approval.decision === 'PENDING' && '⏳ Pending'}
                          </span>
                          <span className={styles.approvalReviewer}>
                            by {approval.reviewedBy.firstName} {approval.reviewedBy.lastName}
                          </span>
                        </div>
                        {approval.comments && (
                          <p className={styles.approvalComments}>
                            <strong>Comments:</strong> {approval.comments}
                          </p>
                        )}
                        <p className={styles.approvalDate}>
                          {formatDate(approval.reviewedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {request.status === 'DRAFT' && (
                  <div className={styles.requestActions}>
                    <button
                      className={styles.submitButton}
                      onClick={() => handleSubmitRequest(request._id)}
                      disabled={submitting === request._id}
                    >
                      {submitting === request._id ? 'Submitting...' : '📤 Submit for Approval'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
