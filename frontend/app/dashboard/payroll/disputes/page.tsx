"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './disputes.module.css';

interface Dispute {
  _id: string;
  disputeId: string;
  description: string;
  status: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  payslipId: any;
  payrollSpecialistId?: {
    firstName: string;
    lastName: string;
  };
  payrollManagerId?: {
    firstName: string;
    lastName: string;
  };
  resolutionComment?: string;
  rejectionReason?: string;
  createdAt: Date;
}

export default function DisputesManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [managerDisputes, setManagerDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [modalMode, setModalMode] = useState<'specialist' | 'manager'>('specialist');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);

  useEffect(() => {
    loadDisputes();
    if (isPayrollManager) {
      loadManagerDisputes();
    }
  }, [filterStatus]);

  async function loadDisputes() {
    setLoading(true);
    try {
      const url = filterStatus === 'all' 
        ? '/payroll-tracking/disputes'
        : `/payroll-tracking/disputes?status=${encodeURIComponent(filterStatus)}`;
      const response = await axios.get(url);
      setDisputes(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }

  async function loadManagerDisputes() {
    try {
      const response = await axios.get('/payroll-tracking/disputes/pending-manager-approval');
      setManagerDisputes(response.data);
    } catch (e: any) {
      console.error('Failed to load manager disputes:', e);
    }
  }

  function openModal(dispute: Dispute, mode: 'specialist' | 'manager', action: 'approve' | 'reject') {
    setSelectedDispute(dispute);
    setModalMode(mode);
    setActionType(action);
    setComment('');
    setError(null);
  }

  function closeModal() {
    setSelectedDispute(null);
    setComment('');
    setError(null);
  }

  async function handleSubmit() {
    if (!selectedDispute) return;
    
    if (actionType === 'reject' && !comment.trim()) {
      setError('Rejection reason is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let endpoint = '';
      let payload: any = {};

      if (modalMode === 'specialist') {
        if (actionType === 'approve') {
          endpoint = `/payroll-tracking/disputes/${selectedDispute._id}/approve`;
          payload = { disputeId: selectedDispute._id, resolutionComment: comment };
        } else {
          endpoint = `/payroll-tracking/disputes/${selectedDispute._id}/reject`;
          payload = { disputeId: selectedDispute._id, rejectionReason: comment };
        }
      } else { // manager mode
        if (actionType === 'approve') {
          endpoint = `/payroll-tracking/disputes/${selectedDispute._id}/manager-approve`;
          payload = { disputeId: selectedDispute._id, resolutionComment: comment };
        } else {
          endpoint = `/payroll-tracking/disputes/${selectedDispute._id}/manager-reject`;
          payload = { disputeId: selectedDispute._id, rejectionReason: comment };
        }
      }

      await axios.post(endpoint, payload);
      
      closeModal();
      await loadDisputes();
      if (isPayrollManager) {
        await loadManagerDisputes();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to process dispute');
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    const statusStyles: { [key: string]: string } = {
      'under review': styles.statusUnderReview,
      'pending payroll Manager approval': styles.statusPendingManager,
      'approved': styles.statusApproved,
      'rejected': styles.statusRejected
    };
    return statusStyles[status] || styles.statusUnderReview;
  }

  const underReviewCount = disputes.filter(d => d.status === 'under review').length;
  const pendingManagerCount = managerDisputes.length;
  const approvedCount = disputes.filter(d => d.status === 'approved').length;
  const rejectedCount = disputes.filter(d => d.status === 'rejected').length;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Disputes Management" role="Payroll">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>⚖️ Payroll Disputes Management</h1>
              <p className={styles.pageSubtitle}>
                {isPayrollManager 
                  ? 'Review and approve/reject disputes escalated by Payroll Specialists'
                  : 'Review employee payroll disputes and escalate approvals to Payroll Manager'}
              </p>
            </div>
            <button 
              className={styles.btnSecondary}
              onClick={() => router.push('/dashboard/payroll')}
            >
              ← Back to Payroll
            </button>
          </div>

          {error && !selectedDispute && <div className={styles.errorMessage}>⚠️ {error}</div>}

          {/* Summary Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{disputes.length}</span>
              <span className={styles.statLabel}>Total Disputes</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: '#f59e0b' }}>{underReviewCount}</span>
              <span className={styles.statLabel}>Under Review</span>
            </div>
            {isPayrollManager && (
              <div className={styles.statCard}>
                <span className={styles.statValue} style={{ color: '#3b82f6' }}>{pendingManagerCount}</span>
                <span className={styles.statLabel}>Pending Your Approval</span>
              </div>
            )}
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: '#10b981' }}>{approvedCount}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: '#ef4444' }}>{rejectedCount}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Filter */}
          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Filter by Status:</label>
            <select 
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Disputes</option>
              <option value="under review">Under Review</option>
              <option value="pending payroll Manager approval">Pending Manager Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {loading && <Spinner message="Loading disputes..." />}

          {/* Manager Priority Section */}
          {isPayrollManager && managerDisputes.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>🔔 Pending Your Approval ({managerDisputes.length})</h2>
                <span className={styles.priorityBadge}>MANAGER ACTION REQUIRED</span>
              </div>
              <div className={styles.disputesList}>
                {managerDisputes.map(dispute => (
                  <div key={dispute._id} className={styles.disputeCard + ' ' + styles.priorityCard}>
                    <div className={styles.disputeHeader}>
                      <div>
                        <span className={styles.disputeId}>{dispute.disputeId}</span>
                        <span className={getStatusBadge(dispute.status)}>{dispute.status}</span>
                      </div>
                      <span className={styles.disputeDate}>
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.disputeBody}>
                      <div className={styles.disputeInfo}>
                        <strong>Employee:</strong> {dispute.employeeId.firstName} {dispute.employeeId.lastName} ({dispute.employeeId.employeeCode})
                      </div>
                      <div className={styles.disputeDescription}>
                        <strong>Description:</strong> {dispute.description}
                      </div>
                      {dispute.resolutionComment && (
                        <div className={styles.specialistComment}>
                          <strong>Specialist Comment:</strong> {dispute.resolutionComment}
                        </div>
                      )}
                      {dispute.payrollSpecialistId && (
                        <div className={styles.handlerInfo}>
                          <strong>Reviewed by Specialist:</strong> {dispute.payrollSpecialistId.firstName} {dispute.payrollSpecialistId.lastName}
                        </div>
                      )}
                    </div>
                    <div className={styles.disputeActions}>
                      <button 
                        className={styles.btnApprove}
                        onClick={() => openModal(dispute, 'manager', 'approve')}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className={styles.btnReject}
                        onClick={() => openModal(dispute, 'manager', 'reject')}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Disputes */}
          {!loading && disputes.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>All Disputes</h2>
              <div className={styles.disputesList}>
                {disputes.map(dispute => (
                  <div key={dispute._id} className={styles.disputeCard}>
                    <div className={styles.disputeHeader}>
                      <div>
                        <span className={styles.disputeId}>{dispute.disputeId}</span>
                        <span className={getStatusBadge(dispute.status)}>{dispute.status}</span>
                      </div>
                      <span className={styles.disputeDate}>
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.disputeBody}>
                      <div className={styles.disputeInfo}>
                        <strong>Employee:</strong> {dispute.employeeId.firstName} {dispute.employeeId.lastName} ({dispute.employeeId.employeeCode})
                      </div>
                      <div className={styles.disputeDescription}>
                        <strong>Description:</strong> {dispute.description}
                      </div>
                      {dispute.resolutionComment && (
                        <div className={styles.resolutionComment}>
                          <strong>Resolution:</strong> {dispute.resolutionComment}
                        </div>
                      )}
                      {dispute.rejectionReason && (
                        <div className={styles.rejectionReason}>
                          <strong>Rejection Reason:</strong> {dispute.rejectionReason}
                        </div>
                      )}
                    </div>
                    {dispute.status === 'under review' && isPayrollSpecialist && (
                      <div className={styles.disputeActions}>
                        <button 
                          className={styles.btnApprove}
                          onClick={() => openModal(dispute, 'specialist', 'approve')}
                        >
                          ✅ Approve (Escalate to Manager)
                        </button>
                        <button 
                          className={styles.btnReject}
                          onClick={() => openModal(dispute, 'specialist', 'reject')}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                    {dispute.status === 'pending payroll Manager approval' && isPayrollManager && (
                      <div className={styles.disputeActions}>
                        <button 
                          className={styles.btnApprove}
                          onClick={() => openModal(dispute, 'manager', 'approve')}
                        >
                          ✅ Approve
                        </button>
                        <button 
                          className={styles.btnReject}
                          onClick={() => openModal(dispute, 'manager', 'reject')}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && disputes.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <p>No disputes found</p>
            </div>
          )}

          {/* Action Modal */}
          {selectedDispute && (
            <div className={styles.modalOverlay} onClick={closeModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                    {actionType === 'approve' ? '✅ Approve' : '❌ Reject'} Dispute {selectedDispute.disputeId}
                  </h3>
                  <button className={styles.closeBtn} onClick={closeModal}>×</button>
                </div>

                <div className={styles.modalBody}>
                  {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

                  <div className={styles.modalInfo}>
                    <p><strong>Employee:</strong> {selectedDispute.employeeId.firstName} {selectedDispute.employeeId.lastName}</p>
                    <p><strong>Description:</strong> {selectedDispute.description}</p>
                  </div>

                  {actionType === 'approve' && modalMode === 'specialist' && (
                    <div className={styles.infoBox}>
                      <strong>Note:</strong> Approving this dispute will escalate it to the Payroll Manager for final approval.
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      {actionType === 'approve' ? 'Resolution Comment (Optional)' : 'Rejection Reason *'}
                    </label>
                    <textarea 
                      className={styles.textarea}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      placeholder={actionType === 'approve' 
                        ? 'Add any comments about the resolution...'
                        : 'Explain why this dispute is being rejected...'}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button 
                    className={styles.btnCancel}
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    className={actionType === 'approve' ? styles.btnConfirmApprove : styles.btnConfirmReject}
                    onClick={handleSubmit}
                    disabled={submitting || (actionType === 'reject' && !comment.trim())}
                  >
                    {submitting ? 'Processing...' : `Confirm ${actionType === 'approve' ? 'Approval' : 'Rejection'}`}
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
