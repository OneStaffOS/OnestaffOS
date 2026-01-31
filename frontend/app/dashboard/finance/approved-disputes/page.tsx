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

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
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
    email: string;
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
  disputeId: {
    disputeId: string;
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

export default function ApprovedDisputesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [generatingRefund, setGeneratingRefund] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadApprovedDisputes();
    loadRefunds();
  }, []);

  async function loadApprovedDisputes() {
    setLoading(true);
    try {
      const response = await axios.get('/payroll-tracking/finance/approved-disputes');
      setDisputes(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load approved disputes');
    } finally {
      setLoading(false);
    }
  }

  async function loadRefunds() {
    try {
      const response = await axios.get('/payroll-tracking/finance/refunds');
      // Filter only dispute refunds
      const disputeRefunds = response.data.filter((r: Refund) => r.disputeId);
      setRefunds(disputeRefunds);
    } catch (e: any) {
      console.error('Failed to load refunds:', e);
    }
  }

  function openDisputeModal(dispute: Dispute) {
    setSelectedDispute(dispute);
    setError(null);
    setSuccessMessage(null);
  }

  function closeModal() {
    setSelectedDispute(null);
    setError(null);
    setSuccessMessage(null);
  }

  async function handleAcknowledge() {
    if (!selectedDispute) return;

    setAcknowledging(true);
    setError(null);

    try {
      await axios.post(`/payroll-tracking/finance/approved-disputes/${selectedDispute._id}/acknowledge`);
      closeModal();
      await loadApprovedDisputes();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to acknowledge dispute');
    } finally {
      setAcknowledging(false);
    }
  }

  async function handleGenerateRefund() {
    if (!selectedDispute) return;

    setGeneratingRefund(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.post(`/payroll-tracking/finance/approved-disputes/${selectedDispute._id}/generate-refund`);
      setSuccessMessage('Refund generated successfully! It will be included in the next payroll cycle.');
      await loadRefunds();
      setTimeout(() => {
        closeModal();
        loadApprovedDisputes();
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to generate refund');
    } finally {
      setGeneratingRefund(false);
    }
  }

  function hasRefund(disputeId: string): boolean {
    return refunds.some(r => r.disputeId?.disputeId && disputes.find(d => d._id === disputeId && d.disputeId === r.disputeId.disputeId));
  }

  const acknowledgedDisputes = disputes.filter(d => d.financeStaffId && d.financeStaffId._id === user?.sub);
  const pendingDisputes = disputes.filter(d => !d.financeStaffId || d.financeStaffId._id !== user?.sub);

  return (
    <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Approved Disputes" role="Finance">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Approved Disputes for Adjustment</h1>
              <p className={styles.pageSubtitle}>
                Review payroll disputes approved by Payroll Manager and process necessary financial adjustments
              </p>
            </div>
            <button 
              className={styles.btnSecondary}
              onClick={() => router.push('/dashboard/finance')}
            >
              ← Back to Finance Dashboard
            </button>
          </div>

          {error && !selectedDispute && <div className={styles.errorMessage}> {error}</div>}

          {/* Summary Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{disputes.length}</span>
              <span className={styles.statLabel}>Total Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: '#f59e0b' }}>{pendingDisputes.length}</span>
              <span className={styles.statLabel}>Pending Action</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: '#10b981' }}>{acknowledgedDisputes.length}</span>
              <span className={styles.statLabel}>Acknowledged by Me</span>
            </div>
          </div>

          {loading && <Spinner message="Loading approved disputes..." />}

          {/* Pending Disputes */}
          {!loading && pendingDisputes.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}> Pending Your Action ({pendingDisputes.length})</h2>
                <span className={styles.priorityBadge}>FINANCE ACTION REQUIRED</span>
              </div>
              <div className={styles.disputesList}>
                {pendingDisputes.map(dispute => (
                  <div key={dispute._id} className={styles.disputeCard + ' ' + styles.priorityCard}>
                    <div className={styles.disputeHeader}>
                      <div>
                        <span className={styles.disputeId}>{dispute.disputeId}</span>
                        <span className={styles.statusApproved}>APPROVED</span>
                      </div>
                      <span className={styles.disputeDate}>
                        Approved: {new Date(dispute.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.disputeBody}>
                      <div className={styles.disputeInfo}>
                        <strong>Employee:</strong> {dispute.employeeId.firstName} {dispute.employeeId.lastName} ({dispute.employeeId.employeeCode})
                      </div>
                      <div className={styles.disputeInfo}>
                        <strong>Email:</strong> {dispute.employeeId.email}
                      </div>
                      <div className={styles.disputeDescription}>
                        <strong>Description:</strong> {dispute.description}
                      </div>
                      {dispute.resolutionComment && (
                        <div className={styles.resolutionComment}>
                          <strong>Resolution Details:</strong> {dispute.resolutionComment}
                        </div>
                      )}
                      <div className={styles.approvalChain}>
                        <div className={styles.approvalStep}>
                          <span className={styles.approvalLabel}>Reviewed by Specialist:</span>
                          <span className={styles.approvalName}>
                            {dispute.payrollSpecialistId ? 
                              `${dispute.payrollSpecialistId.firstName} ${dispute.payrollSpecialistId.lastName}` : 
                              'N/A'}
                          </span>
                        </div>
                        <div className={styles.approvalStep}>
                          <span className={styles.approvalLabel}>Approved by Manager:</span>
                          <span className={styles.approvalName}>
                            {dispute.payrollManagerId ? 
                              `${dispute.payrollManagerId.firstName} ${dispute.payrollManagerId.lastName}` : 
                              'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.disputeActions}>
                      <button 
                        className={styles.btnView}
                        onClick={() => openDisputeModal(dispute)}
                      >
                        {hasRefund(dispute._id) ? 'View Details' : 'View & Generate Refund'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acknowledged Disputes */}
          {!loading && acknowledgedDisputes.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}> Acknowledged by Me ({acknowledgedDisputes.length})</h2>
              <div className={styles.disputesList}>
                {acknowledgedDisputes.map(dispute => (
                  <div key={dispute._id} className={styles.disputeCard}>
                    <div className={styles.disputeHeader}>
                      <div>
                        <span className={styles.disputeId}>{dispute.disputeId}</span>
                        <span className={styles.statusApproved}>ACKNOWLEDGED</span>
                      </div>
                      <span className={styles.disputeDate}>
                        {new Date(dispute.updatedAt).toLocaleDateString()}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && disputes.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}></div>
              <p>No approved disputes found</p>
              <p className={styles.emptySubtext}>Disputes approved by Payroll Manager will appear here</p>
            </div>
          )}

          {/* Detail Modal */}
          {selectedDispute && (
            <div className={styles.modalOverlay} onClick={closeModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                     Dispute Details - {selectedDispute.disputeId}
                  </h3>
                  <button className={styles.closeBtn} onClick={closeModal}>×</button>
                </div>

                <div className={styles.modalBody}>
                  {error && <div className={styles.errorMessage}> {error}</div>}
                  {successMessage && <div className={styles.successMessage}> {successMessage}</div>}

                  <div className={styles.modalSection}>
                    <h4 className={styles.modalSectionTitle}>Employee Information</h4>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Name:</span>
                        <span className={styles.infoValue}>
                          {selectedDispute.employeeId.firstName} {selectedDispute.employeeId.lastName}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Employee Code:</span>
                        <span className={styles.infoValue}>{selectedDispute.employeeId.employeeCode}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Email:</span>
                        <span className={styles.infoValue}>{selectedDispute.employeeId.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.modalSection}>
                    <h4 className={styles.modalSectionTitle}>Dispute Details</h4>
                    <p className={styles.modalDescription}>{selectedDispute.description}</p>
                  </div>

                  {selectedDispute.resolutionComment && (
                    <div className={styles.modalSection}>
                      <h4 className={styles.modalSectionTitle}>Resolution Comments</h4>
                      <div className={styles.resolutionBox}>
                        {selectedDispute.resolutionComment}
                      </div>
                    </div>
                  )}

                  <div className={styles.modalSection}>
                    <h4 className={styles.modalSectionTitle}>Approval Chain</h4>
                    <div className={styles.approvalTimeline}>
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineIcon}>1⃣</div>
                        <div className={styles.timelineContent}>
                          <strong>Payroll Specialist Review</strong>
                          <p>{selectedDispute.payrollSpecialistId ? 
                            `${selectedDispute.payrollSpecialistId.firstName} ${selectedDispute.payrollSpecialistId.lastName}` : 
                            'N/A'}</p>
                        </div>
                      </div>
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineIcon}>2⃣</div>
                        <div className={styles.timelineContent}>
                          <strong>Payroll Manager Approval</strong>
                          <p>{selectedDispute.payrollManagerId ? 
                            `${selectedDispute.payrollManagerId.firstName} ${selectedDispute.payrollManagerId.lastName}` : 
                            'N/A'}</p>
                        </div>
                      </div>
                      <div className={styles.timelineItem + ' ' + styles.timelinePending}>
                        <div className={styles.timelineIcon}>3⃣</div>
                        <div className={styles.timelineContent}>
                          <strong>Finance Staff Action</strong>
                          <p>Waiting for your acknowledgment</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!hasRefund(selectedDispute._id) && !successMessage && (
                    <div className={styles.infoBox}>
                      <strong> Next Steps:</strong>
                      <p>Generate a refund to process this dispute in the next payroll cycle.</p>
                    </div>
                  )}

                  {hasRefund(selectedDispute._id) && (
                    <div className={styles.completedInfo}>
                      <strong> Refund Already Generated:</strong>
                      <p>This dispute has been processed and will be included in the next payroll cycle.</p>
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  <button 
                    className={styles.btnCancel}
                    onClick={closeModal}
                    disabled={acknowledging || generatingRefund}
                  >
                    Close
                  </button>
                  {!selectedDispute.financeStaffId && (
                    <button 
                      className={styles.btnAcknowledge}
                      onClick={handleAcknowledge}
                      disabled={acknowledging || generatingRefund}
                    >
                      {acknowledging ? 'Processing...' : 'Acknowledge'}
                    </button>
                  )}
                  {!hasRefund(selectedDispute._id) && !successMessage && (
                    <button 
                      className={styles.btnGenerateRefund}
                      onClick={handleGenerateRefund}
                      disabled={acknowledging || generatingRefund}
                    >
                      {generatingRefund ? 'Generating...' : 'Generate Refund'}
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