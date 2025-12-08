/**
 * Dispute Resolution Page (Route: /hr/performance/disputes)
 * REQ-OD-07: Resolve disputes between employees and managers
 * REQ-AE-07: Flag or raise concerns about ratings
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './disputes.module.css';

interface Dispute {
  _id: string;
  appraisalId: {
    _id: string;
    employeeId: {
      firstName: string;
      lastName: string;
      employeeNumber: string;
    };
    managerId: {
      firstName: string;
      lastName: string;
    };
    overallRating: number;
  };
  reason: string;
  employeeComments: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'ADJUSTED' | 'REJECTED';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  finalRating?: number;
}

export default function DisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [newRating, setNewRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/performance/disputes');
      // Map backend shape into UI-friendly shape
      const mapped = (response.data || []).map((d: any) => {
        const appraisal = d.appraisalId || {};
        const employee = appraisal.employeeProfileId || appraisal.employeeId || null;
        const manager = appraisal.managerProfileId || appraisal.managerId || null;

        const ratings = Array.isArray(appraisal.ratings) ? appraisal.ratings : [];
        const avgRating = ratings.length > 0
          ? Math.round((ratings.reduce((s: number, r: any) => s + (r.ratingValue || 0), 0) / ratings.length) * 10) / 10
          : (appraisal.totalScore ?? null);

        const normalizeStatus = (s: string) => {
          if (!s) return 'PENDING';
          if (s === 'OPEN') return 'PENDING';
          return s;
        };

        return {
          _id: d._id,
          appraisalId: {
            _id: appraisal._id,
            employeeId: employee ? {
              firstName: employee.firstName || '',
              lastName: employee.lastName || '',
              employeeNumber: employee.employeeNumber || '',
            } : undefined,
            managerId: manager ? {
              firstName: manager.firstName || '',
              lastName: manager.lastName || '',
            } : undefined,
            overallRating: avgRating,
          },
          reason: d.reason || d.title || '',
          employeeComments: d.details || d.employeeComments || '',
          status: normalizeStatus(d.status),
          submittedAt: d.submittedAt,
          resolution: d.resolutionSummary,
          finalRating: d.finalRating,
          reviewedBy: d.resolvedByEmployeeId,
          reviewedAt: d.resolvedAt,
        } as Dispute;
      });

      setDisputes(mapped);
    } catch (error: any) {
      console.error('Failed to fetch disputes:', error);
      alert('Failed to load disputes: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async (disputeId: string, approve: boolean) => {
    if (!resolution.trim()) {
      alert('Please provide a resolution comment');
      return;
    }

    // If approving (ADJUSTED) require a new rating value
    if (approve && (newRating === null || newRating === undefined)) {
      alert('Please provide a new rating when approving an adjustment');
      return;
    }

    if (!confirm(`Are you sure you want to ${approve ? 'approve and change' : 'reject'} this dispute?`)) return;

    try {
      setSubmitting(true);
      // API expects AppraisalDisputeStatus values: OPEN, UNDER_REVIEW, ADJUSTED, REJECTED
      const payload: any = {
        status: approve ? 'ADJUSTED' : 'REJECTED',
        resolutionSummary: resolution,
      };

      if (approve && typeof newRating === 'number') {
        // Send adjustedTotalScore (backend will apply it to the appraisal record)
        payload.adjustedTotalScore = newRating;
      }

      await axios.put(`/performance/disputes/${disputeId}/resolve`, payload);

      alert(`Dispute ${approve ? 'resolved with new rating' : 'rejected'} successfully!`);
      setSelectedDispute(null);
      setResolution('');
      setNewRating(null);
      fetchDisputes();
    } catch (error: any) {
      console.error('Failed to resolve dispute:', error);
      alert('Failed to resolve dispute: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDisputes = disputes.filter(d => {
    if (filter === 'pending') return d.status === 'PENDING' || d.status === 'UNDER_REVIEW';
    if (filter === 'resolved') return d.status === 'ADJUSTED' || d.status === 'REJECTED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: styles.pending },
      UNDER_REVIEW: { label: 'Under Review', className: styles.underReview },
      ADJUSTED: { label: 'Adjusted', className: styles.resolved },
      REJECTED: { label: 'Rejected', className: styles.rejected },
    };
    const badge = badges[status] || { label: status, className: '' };
    return <span className={`${styles.statusBadge} ${badge.className}`}>{badge.label}</span>;
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Dispute Resolution" role="HR Manager">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1>Appraisal Disputes</h1>
              <p className={styles.subtitle}>
                Review and resolve employee objections to performance ratings (REQ-OD-07)
              </p>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.filterButtons}>
                <button
                  className={filter === 'pending' ? styles.filterActive : styles.filterButton}
                  onClick={() => setFilter('pending')}
                >
                  Pending ({disputes.filter(d => d.status === 'PENDING' || d.status === 'UNDER_REVIEW').length})
                </button>
                <button
                  className={filter === 'resolved' ? styles.filterActive : styles.filterButton}
                  onClick={() => setFilter('resolved')}
                >
                  Adjusted/Rejected ({disputes.filter(d => d.status === 'ADJUSTED' || d.status === 'REJECTED').length})
                </button>
                <button
                  className={filter === 'all' ? styles.filterActive : styles.filterButton}
                  onClick={() => setFilter('all')}
                >
                  All ({disputes.length})
                </button>
              </div>
            </div>
          </div>

          {/* Disputes List */}
          {loading ? (
            <Spinner message="Loading disputes..." />
          ) : filteredDisputes.length === 0 ? (
            <div className={styles.empty}>
              <p>No {filter !== 'all' ? filter : ''} disputes found</p>
              {filter === 'pending' && <small style={{ color: '#666' }}>Great! All disputes have been resolved.</small>}
            </div>
          ) : (
            <div className={styles.disputesList}>
              {filteredDisputes.map((dispute) => (
                <div key={dispute._id} className={styles.disputeCard}>
                  <div className={styles.disputeHeader}>
                    <div>
                      <h3>
                        {dispute.appraisalId?.employeeId?.firstName} {dispute.appraisalId?.employeeId?.lastName}
                      </h3>
                      <span className={styles.employeeNumber}>
                        #{dispute.appraisalId?.employeeId?.employeeNumber}
                      </span>
                    </div>
                    {getStatusBadge(dispute.status)}
                  </div>

                  <div className={styles.disputeDetails}>
                    <div className={styles.detailRow}>
                      <strong>Manager:</strong> {dispute.appraisalId?.managerId?.firstName} {dispute.appraisalId?.managerId?.lastName}
                    </div>
                    <div className={styles.detailRow}>
                      <strong>Current Rating:</strong> {dispute.appraisalId?.overallRating}/5
                    </div>
                    <div className={styles.detailRow}>
                      <strong>Submitted:</strong> {new Date(dispute.submittedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className={styles.reasonSection}>
                    <strong>Dispute Reason:</strong>
                    <p>{dispute.reason}</p>
                  </div>

                  <div className={styles.commentsSection}>
                    <strong>Employee Comments:</strong>
                    <p>{dispute.employeeComments}</p>
                  </div>

                  {dispute.resolution && (
                    <div className={styles.resolutionSection}>
                      <strong>Resolution:</strong>
                      <p>{dispute.resolution}</p>
                      {dispute.finalRating && (
                        <div className={styles.finalRating}>
                          Final Rating: <strong>{dispute.finalRating}/5</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {(dispute.status === 'PENDING' || dispute.status === 'UNDER_REVIEW') && (
                    <div className={styles.disputeActions}>
                      <button
                        className={styles.reviewButton}
                        onClick={() => setSelectedDispute(dispute)}
                      >
                        Review & Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Resolution Modal */}
          {selectedDispute && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h2>Resolve Dispute</h2>
                  <button
                    className={styles.closeButton}
                    onClick={() => {
                      setSelectedDispute(null);
                      setResolution('');
                      setNewRating(null);
                    }}
                  >
                    ×
                  </button>
                </div>

                <div className={styles.modalBody}>
                  <div className={styles.disputeSummary}>
                    <h3>
                      {selectedDispute.appraisalId?.employeeId?.firstName} {selectedDispute.appraisalId?.employeeId?.lastName}
                    </h3>
                    <p><strong>Current Rating:</strong> {selectedDispute.appraisalId?.overallRating}/5</p>
                    <p><strong>Reason:</strong> {selectedDispute.reason}</p>
                    <p><strong>Comments:</strong> {selectedDispute.employeeComments}</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Resolution Comments *</label>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Explain your decision and reasoning..."
                      rows={4}
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>New Rating (if approving change)</label>
                    <input
                      type="number"
                      value={newRating || ''}
                      onChange={(e) => setNewRating(e.target.value ? Number(e.target.value) : null)}
                      min={1}
                      max={5}
                      step={0.1}
                      placeholder="Leave empty if rejecting"
                      className={styles.input}
                    />
                    <small style={{ color: '#666' }}>Only required if approving the dispute</small>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    className={styles.rejectButton}
                    onClick={() => handleResolveDispute(selectedDispute._id, false)}
                    disabled={submitting}
                  >
                    Reject Dispute
                  </button>
                  <button
                    className={styles.approveButton}
                    onClick={() => handleResolveDispute(selectedDispute._id, true)}
                    disabled={submitting}
                  >
                    Approve & Change Rating
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
