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
    email: string;
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
    _id: string;
    firstName: string;
    lastName: string;
  };
  resolutionComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Refund {
  _id: string;
  claimId: {
    claimId: string;
    claimType: string;
  };
  employeeId: {
    firstName: string;
    lastName: string;
  };
  refundDetails: {
    amount: number;
    description: string;
  };
  status: string;
  createdAt: Date;
}

export default function ApprovedClaimsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [generating, setGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadApprovedClaims();
    loadRefunds();
  }, []);

  async function loadApprovedClaims() {
    setLoading(true);
    try {
      const response = await axios.get('/payroll-tracking/finance/approved-claims');
      setClaims(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load approved claims');
    } finally {
      setLoading(false);
    }
  }

  async function loadRefunds() {
    try {
      const response = await axios.get('/payroll-tracking/finance/refunds');
      // Filter only claim refunds
      const claimRefunds = response.data.filter((r: Refund) => r.claimId);
      setRefunds(claimRefunds);
    } catch (e: any) {
      console.error('Failed to load refunds:', e);
    }
  }

  function openClaimModal(claim: Claim) {
    setSelectedClaim(claim);
    setError(null);
    setSuccessMessage(null);
  }

  function closeModal() {
    setSelectedClaim(null);
    setError(null);
    setSuccessMessage(null);
  }

  async function handleGenerateRefund() {
    if (!selectedClaim) return;

    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.post(`/payroll-tracking/finance/approved-claims/${selectedClaim._id}/generate-refund`);
      setSuccessMessage('Refund generated successfully! It will be included in the next payroll cycle.');
      await loadRefunds();
      setTimeout(() => {
        closeModal();
        loadApprovedClaims();
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to generate refund');
    } finally {
      setGenerating(false);
    }
  }

  function hasRefund(claimId: string): boolean {
    return refunds.some(r => r.claimId?.claimId && claims.find(c => c._id === claimId && c.claimId === r.claimId.claimId));
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Approved Expense Claims" role="Finance Staff">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}> Approved Expense Claims</h1>
              <p className={styles.subtitle}>
                Review approved claims and generate refunds for next payroll cycle
              </p>
            </div>
            <button onClick={() => router.back()} className={styles.backButton}>
              ← Back
            </button>
          </div>

          {/* Info Banner */}
          <div className={styles.infoBanner}>
            <div className={styles.infoBannerIcon}></div>
            <div>
              <h3 className={styles.infoBannerTitle}>Finance Staff Action Required</h3>
              <p className={styles.infoBannerText}>
                These expense claims have been approved by Payroll Manager. Generate refunds to include payments in the next payroll cycle.
              </p>
            </div>
          </div>

          {error && <div className={styles.errorMessage}> {error}</div>}

          {loading ? (
            <div className={styles.loadingContainer}>
              <Spinner />
              <p>Loading approved claims...</p>
            </div>
          ) : claims.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}></div>
              <h3>No Approved Claims</h3>
              <p>All approved claims have been processed. New claims will appear here when approved by Payroll Manager.</p>
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
                    <th>Description</th>
                    <th>Approved By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => {
                    const refundGenerated = hasRefund(claim._id);
                    return (
                      <tr key={claim._id}>
                        <td><strong>{claim.claimId}</strong></td>
                        <td>
                          {claim.employeeId.firstName} {claim.employeeId.lastName}
                          <br />
                          <small className={styles.employeeNumber}>
                            {claim.employeeId.employeeNumber}
                          </small>
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
                          <div className={styles.approverInfo}>
                            {claim.payrollManagerId && (
                              <div>
                                <strong>Manager:</strong> {claim.payrollManagerId.firstName} {claim.payrollManagerId.lastName}
                              </div>
                            )}
                            {claim.payrollSpecialistId && (
                              <div className={styles.specialistInfo}>
                                <small>Specialist: {claim.payrollSpecialistId.firstName} {claim.payrollSpecialistId.lastName}</small>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{formatDate(claim.updatedAt)}</td>
                        <td>
                          {refundGenerated ? (
                            <span className={styles.statusRefundGenerated}>
                               Refund Generated
                            </span>
                          ) : (
                            <span className={styles.statusPending}>
                               Pending Refund
                            </span>
                          )}
                        </td>
                        <td>
                          {!refundGenerated ? (
                            <button
                              onClick={() => openClaimModal(claim)}
                              className={styles.generateButton}
                            >
                               Generate Refund
                            </button>
                          ) : (
                            <button
                              onClick={() => openClaimModal(claim)}
                              className={styles.viewButton}
                            >
                               View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal */}
          {selectedClaim && (
            <div className={styles.modalOverlay} onClick={closeModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2> Expense Claim Details</h2>
                  <button onClick={closeModal} className={styles.closeButton}></button>
                </div>

                <div className={styles.modalBody}>
                  <div className={styles.claimDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Claim ID:</span>
                      <span className={styles.detailValue}>{selectedClaim.claimId}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Employee:</span>
                      <span className={styles.detailValue}>
                        {selectedClaim.employeeId.firstName} {selectedClaim.employeeId.lastName}
                        ({selectedClaim.employeeId.employeeNumber})
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Type:</span>
                      <span className={styles.claimTypeBadge}>{selectedClaim.claimType}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Claimed Amount:</span>
                      <span className={styles.detailValue}>{formatCurrency(selectedClaim.amount)}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Approved Amount:</span>
                      <span className={styles.approvedAmountLarge}>
                        {selectedClaim.approvedAmount ? formatCurrency(selectedClaim.approvedAmount) : 'N/A'}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Description:</span>
                      <span className={styles.detailValue}>{selectedClaim.description}</span>
                    </div>
                    {selectedClaim.resolutionComment && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Comments:</span>
                        <span className={styles.detailValue}>{selectedClaim.resolutionComment}</span>
                      </div>
                    )}
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Approved By:</span>
                      <span className={styles.detailValue}>
                        {selectedClaim.payrollManagerId 
                          ? `${selectedClaim.payrollManagerId.firstName} ${selectedClaim.payrollManagerId.lastName} (Manager)`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Approval Date:</span>
                      <span className={styles.detailValue}>{formatDate(selectedClaim.updatedAt)}</span>
                    </div>
                  </div>

                  {successMessage && (
                    <div className={styles.successMessage}> {successMessage}</div>
                  )}

                  {error && <div className={styles.error}>{error}</div>}

                  {!hasRefund(selectedClaim._id) && !successMessage && (
                    <div className={styles.actionInfo}>
                      <strong> Action Required:</strong> Generate a refund to include this payment in the next payroll cycle.
                      The refund amount will be <strong>{formatCurrency(selectedClaim.approvedAmount || selectedClaim.amount)}</strong>.
                    </div>
                  )}

                  {hasRefund(selectedClaim._id) && (
                    <div className={styles.completedInfo}>
                      <strong> Refund Already Generated:</strong> This claim has been processed and will be included in the next payroll cycle.
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  <button
                    onClick={closeModal}
                    className={styles.cancelButton}
                    disabled={generating}
                  >
                    Close
                  </button>
                  {!hasRefund(selectedClaim._id) && !successMessage && (
                    <button
                      onClick={handleGenerateRefund}
                      className={styles.generateRefundButton}
                      disabled={generating}
                    >
                      {generating ? 'Generating...' : 'Generate Refund'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}