/**
 * Review Structure Change Requests Page (Route: /org-structure/change-requests)
 * System Admin can review and approve manager requests
 * System notifies managers when structural change is approved
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { StructureChangeRequest, StructureChangeStatus } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './change-requests.module.css';

export default function ChangeRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<StructureChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<StructureChangeRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/organization-structure/change-requests');
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
    if (!confirm('Are you sure you want to approve this change request? The change will be applied immediately.')) {
      return;
    }

    setProcessing(true);
    try {
      await axios.patch(`/organization-structure/change-requests/${requestId}/approve`, {
        reviewComments: reviewComment
      });

      alert('Change request approved successfully! Requester will be notified.');
      await fetchRequests();
      setSelectedRequest(null);
      setReviewComment('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!reviewComment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!confirm('Are you sure you want to reject this change request?')) {
      return;
    }

    setProcessing(true);
    try {
      await axios.patch(`/organization-structure/change-requests/${requestId}/reject`, {
        reviewComments: reviewComment
      });

      alert('Change request rejected');
      await fetchRequests();
      setSelectedRequest(null);
      setReviewComment('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN]}>
        <div className={styles.container}>
          <Spinner message="Loading change requests..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Structure Change Requests</h1>
            <p className={styles.subtitle}>
              Review and approve organizational structure changes
            </p>
          </div>
          <button
            className={styles.createButton}
            onClick={() => router.push('/org-structure/change-requests/create')}
          >
            + New Request
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Filter Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${filterStatus === 'PENDING' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('PENDING')}
          >
            Pending ({requests.filter(r => r.status === StructureChangeStatus.PENDING).length})
          </button>
          <button
            className={`${styles.tab} ${filterStatus === 'APPROVED' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('APPROVED')}
          >
            Approved ({requests.filter(r => r.status === StructureChangeStatus.APPROVED).length})
          </button>
          <button
            className={`${styles.tab} ${filterStatus === 'REJECTED' ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus('REJECTED')}
          >
            Rejected ({requests.filter(r => r.status === StructureChangeStatus.REJECTED).length})
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
            {filteredRequests.map((request) => (
              <div key={request._id} className={styles.requestCard}>
                <div className={styles.requestHeader}>
                  <div>
                    <h3 className={styles.requestType}>
                      {request.requestType.replace(/_/g, ' ')}
                    </h3>
                    <p className={styles.requestId}>Request ID: {request.requestId}</p>
                  </div>
                  <span className={`${styles.statusBadge} ${styles[request.status.toLowerCase()]}`}>
                    {request.status}
                  </span>
                </div>

                <div className={styles.requestBody}>
                  <div className={styles.requesterInfo}>
                    <strong>Requested by:</strong> {request.requestedBy.name}
                    <br />
                    <span className={styles.position}>{request.requestedBy.position}</span>
                  </div>

                  <div className={styles.description}>
                    <strong>Description:</strong>
                    <p>{request.changeDescription}</p>
                  </div>

                  <div className={styles.justification}>
                    <strong>Justification:</strong>
                    <p>{request.justification}</p>
                  </div>

                  <div className={styles.timestamp}>
                    Submitted: {new Date(request.submittedAt).toLocaleDateString()} at {new Date(request.submittedAt).toLocaleTimeString()}
                  </div>

                  {request.reviewedBy && (
                    <div className={styles.reviewInfo}>
                      <strong>Reviewed by:</strong> {request.reviewedBy.name}
                      <br />
                      <strong>Review Date:</strong> {new Date(request.reviewedAt!).toLocaleDateString()}
                      {request.reviewComments && (
                        <>
                          <br />
                          <strong>Comments:</strong> {request.reviewComments}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {request.status === StructureChangeStatus.PENDING && (
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
                  <p><strong>Type:</strong> {selectedRequest.requestType.replace(/_/g, ' ')}</p>
                  <p><strong>Requested by:</strong> {selectedRequest.requestedBy.name} ({selectedRequest.requestedBy.position})</p>
                  <p><strong>Description:</strong> {selectedRequest.changeDescription}</p>
                  <p><strong>Justification:</strong> {selectedRequest.justification}</p>
                </div>

                <div className={styles.validationNotice}>
                  <strong>Validation Checks</strong>
                  <ul>
                    <li>✓ No circular reporting lines</li>
                    <li>✓ No duplicate positions</li>
                    <li>✓ Department assignments valid</li>
                    <li>This action will be logged in audit history</li>
                  </ul>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Review Comments (Required for rejection)</label>
                  <textarea
                    className={styles.textarea}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    placeholder="Add your review comments..."
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={`${styles.button} ${styles.rejectButton}`}
                  onClick={() => handleReject(selectedRequest._id)}
                  disabled={processing || !reviewComment.trim()}
                >
                  {processing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  className={`${styles.button} ${styles.approveButton}`}
                  onClick={() => handleApprove(selectedRequest._id)}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Approve & Apply Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
