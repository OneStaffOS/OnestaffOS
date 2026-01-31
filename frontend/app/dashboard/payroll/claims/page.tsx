"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './claims.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Claim {
  _id: string;
  claimId: string;
  description: string;
  claimType: string;
  amount: number;
  approvedAmount?: number;
  status: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  payrollSpecialistId?: {
    firstName: string;
    lastName: string;
  };
  payrollManagerId?: {
    firstName: string;
    lastName: string;
  };
  financeStaffId?: {
    firstName: string;
    lastName: string;
  };
  resolutionComment?: string;
  rejectionReason?: string;
  createdAt: Date;
}

export default function ClaimsManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [managerClaims, setManagerClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [modalMode, setModalMode] = useState<'specialist' | 'manager'>('specialist');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);

  useEffect(() => {
    loadClaims();
    if (isPayrollManager) {
      loadManagerClaims();
    }
  }, [filterStatus]);

  async function loadClaims() {
    setLoading(true);
    try {
      const url = filterStatus === 'all' 
        ? '/payroll-tracking/claims'
        : `/payroll-tracking/claims?status=${encodeURIComponent(filterStatus)}`;
      const response = await axios.get(url);
      setClaims(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load expense claims');
    } finally {
      setLoading(false);
    }
  }

  async function loadManagerClaims() {
    try {
      const response = await axios.get('/payroll-tracking/claims/pending-manager-approval');
      setManagerClaims(response.data);
    } catch (e: any) {
      console.error('Failed to load manager claims:', e);
    }
  }

  function openModal(claim: Claim, mode: 'specialist' | 'manager', action: 'approve' | 'reject') {
    setSelectedClaim(claim);
    setModalMode(mode);
    setActionType(action);
    setComment('');
    setApprovedAmount(claim.approvedAmount || claim.amount);
    setError(null);
  }

  function closeModal() {
    setSelectedClaim(null);
    setComment('');
    setApprovedAmount(0);
    setError(null);
  }

  async function handleSubmit() {
    if (!selectedClaim) return;
    
    if (actionType === 'reject' && !comment.trim()) {
      setError('Rejection reason is required');
      return;
    }

    if (actionType === 'approve' && modalMode === 'specialist') {
      if (!approvedAmount || approvedAmount <= 0) {
        setError('Approved amount must be greater than 0');
        return;
      }
      if (approvedAmount > selectedClaim.amount) {
        setError('Approved amount cannot exceed claimed amount');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      let endpoint = '';
      let payload: any = {};

      if (modalMode === 'specialist') {
        if (actionType === 'approve') {
          endpoint = `/payroll-tracking/claims/${selectedClaim._id}/approve`;
          payload = { claimId: selectedClaim._id, approvedAmount, resolutionComment: comment };
        } else {
          endpoint = `/payroll-tracking/claims/${selectedClaim._id}/reject`;
          payload = { claimId: selectedClaim._id, rejectionReason: comment };
        }
      } else { // manager mode
        if (actionType === 'approve') {
          endpoint = `/payroll-tracking/claims/${selectedClaim._id}/manager-approve`;
          payload = { claimId: selectedClaim._id, approvedAmount: selectedClaim.approvedAmount, resolutionComment: comment };
        } else {
          endpoint = `/payroll-tracking/claims/${selectedClaim._id}/manager-reject`;
          payload = { claimId: selectedClaim._id, rejectionReason: comment };
        }
      }

      await axios.post(endpoint, payload);
      
      closeModal();
      await loadClaims();
      if (isPayrollManager) {
        await loadManagerClaims();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to process expense claim');
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    const statusStyles: { [key: string]: string } = {
      'under review': styles.statusUnderReview,
      'pending payroll Manager approval': styles.statusPendingManager,
      'approved': styles.statusApproved,
      'rejected': styles.statusRejected,
    };

    return (
      <span className={`${styles.statusBadge} ${statusStyles[status.toLowerCase()] || ''}`}>
        {status}
      </span>
    );
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  }

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER,
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Expense Claims Management" role="Payroll">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}> Expense Claims Management</h1>
              <p className={styles.subtitle}>Review and approve employee expense claims</p>
            </div>
            <button
              onClick={() => router.back()}
              className={styles.backButton}
            >
              ← Back
            </button>
          </div>

          {/* Manager Section - Pending Approvals */}
          {isPayrollManager && managerClaims.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                 Pending Manager Approval ({managerClaims.length})
              </h2>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Claim ID</th>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Claimed Amount</th>
                      <th>Approved Amount</th>
                      <th>Description</th>
                      <th>Specialist</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerClaims.map((claim) => (
                      <tr key={claim._id}>
                        <td><strong>{claim.claimId}</strong></td>
                        <td>
                          {claim.employeeId.firstName} {claim.employeeId.lastName}
                          <br />
                          <small>({claim.employeeId.employeeNumber})</small>
                        </td>
                        <td>
                          <span className={styles.claimTypeBadge}>{claim.claimType}</span>
                        </td>
                        <td>{formatCurrency(claim.amount)}</td>
                        <td className={styles.approvedAmount}>
                          {claim.approvedAmount ? formatCurrency(claim.approvedAmount) : 'N/A'}
                        </td>
                        <td>{claim.description}</td>
                        <td>
                          {claim.payrollSpecialistId 
                            ? `${claim.payrollSpecialistId.firstName} ${claim.payrollSpecialistId.lastName}`
                            : 'N/A'
                          }
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => openModal(claim, 'manager', 'approve')}
                              className={`${styles.button} ${styles.approveButton}`}
                            >
                               Approve
                            </button>
                            <button
                              onClick={() => openModal(claim, 'manager', 'reject')}
                              className={`${styles.button} ${styles.rejectButton}`}
                            >
                               Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filter Section */}
          <div className={styles.filterSection}>
            <label htmlFor="statusFilter" className={styles.filterLabel}>
              Filter by Status:
            </label>
            <select
              id="statusFilter" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Claims</option>
              <option value="under review">Under Review</option>
              <option value="pending payroll Manager approval">Pending Manager Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* All Claims Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>All Expense Claims</h2>
            
            {loading ? (
              <div className={styles.loadingContainer}>
                <Spinner />
                <p>Loading expense claims...</p>
              </div>
            ) : claims.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No expense claims found.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Claim ID</th>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Claimed Amount</th>
                      <th>Approved Amount</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim._id}>
                        <td><strong>{claim.claimId}</strong></td>
                        <td>
                          {claim.employeeId.firstName} {claim.employeeId.lastName}
                          <br />
                          <small>({claim.employeeId.employeeNumber})</small>
                        </td>
                        <td>
                          <span className={styles.claimTypeBadge}>{claim.claimType}</span>
                        </td>
                        <td>{formatCurrency(claim.amount)}</td>
                        <td className={styles.approvedAmount}>
                          {claim.approvedAmount ? formatCurrency(claim.approvedAmount) : 'N/A'}
                        </td>
                        <td>{getStatusBadge(claim.status)}</td>
                        <td>{claim.description}</td>
                        <td>{new Date(claim.createdAt).toLocaleDateString()}</td>
                        <td>
                          {claim.status === 'under review' && isPayrollSpecialist && (
                            <div className={styles.actionButtons}>
                              <button
                                onClick={() => openModal(claim, 'specialist', 'approve')}
                                className={`${styles.button} ${styles.approveButton}`}
                              >
                                 Approve
                              </button>
                              <button
                                onClick={() => openModal(claim, 'specialist', 'reject')}
                                className={`${styles.button} ${styles.rejectButton}`}
                              >
                                 Reject
                              </button>
                            </div>
                          )}
                          {claim.status !== 'under review' && (
                            <span className={styles.processedText}>
                              {claim.status === 'approved' ? 'Processed' : 'Closed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal */}
          {selectedClaim && (
            <div className={styles.modalOverlay} onClick={closeModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>
                    {actionType === 'approve' ? 'Approve' : 'Reject'} Expense Claim
                  </h2>
                  <button onClick={closeModal} className={styles.closeButton}></button>
                </div>

                <div className={styles.modalBody}>
                  <div className={styles.claimDetails}>
                    <p><strong>Claim ID:</strong> {selectedClaim.claimId}</p>
                    <p><strong>Employee:</strong> {selectedClaim.employeeId.firstName} {selectedClaim.employeeId.lastName} ({selectedClaim.employeeId.employeeNumber})</p>
                    <p><strong>Type:</strong> {selectedClaim.claimType}</p>
                    <p><strong>Claimed Amount:</strong> {formatCurrency(selectedClaim.amount)}</p>
                    {modalMode === 'manager' && selectedClaim.approvedAmount && (
                      <p><strong>Specialist Approved Amount:</strong> {formatCurrency(selectedClaim.approvedAmount)}</p>
                    )}
                    <p><strong>Description:</strong> {selectedClaim.description}</p>
                    {selectedClaim.resolutionComment && (
                      <p><strong>Specialist Comment:</strong> {selectedClaim.resolutionComment}</p>
                    )}
                  </div>

                  {actionType === 'approve' && modalMode === 'specialist' && (
                    <div className={styles.formGroup}>
                      <label htmlFor="approvedAmount" className={styles.label}>
                        Approved Amount: <span className={styles.required}>*</span>
                      </label>
                      <input
                        id="approvedAmount" type="number" min="0" max={selectedClaim.amount}
                        step="0.01" value={approvedAmount}
                        onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)}
                        className={styles.input}
                        required
                      />
                      <small className={styles.hint}>
                        Maximum: {formatCurrency(selectedClaim.amount)}
                      </small>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label htmlFor="comment" className={styles.label}>
                      {actionType === 'approve' ? 'Comment (Optional):' : 'Rejection Reason:'} 
                      {actionType === 'reject' && <span className={styles.required}>*</span>}
                    </label>
                    <textarea
                      id="comment" value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className={styles.textarea}
                      rows={4}
                      placeholder={actionType === 'approve' ? 'Add any comments...' : 'Explain why this claim is rejected...'}
                      required={actionType === 'reject'}
                    />
                  </div>

                  {error && <div className={styles.error}>{error}</div>}

                  {actionType === 'approve' && modalMode === 'specialist' && (
                    <div className={styles.infoBox}>
                      <strong> Note:</strong> Approving this claim will escalate it to the Payroll Manager for final approval.
                    </div>
                  )}

                  {actionType === 'approve' && modalMode === 'manager' && (
                    <div className={styles.infoBox}>
                      <strong> Note:</strong> Approving this claim will notify Finance Staff for payment processing.
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  <button
                    onClick={closeModal}
                    className={styles.cancelButton}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className={actionType === 'approve' ? styles.submitApprove : styles.submitReject}
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
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