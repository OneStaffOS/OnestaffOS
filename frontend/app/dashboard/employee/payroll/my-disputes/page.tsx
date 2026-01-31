"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './my-disputes.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Dispute {
  _id: string;
  disputeId: string;
  description: string;
  payslipId: {
    _id: string;
    payrollRunId: {
      runId: string;
      payrollPeriod: string;
    };
    netPay: number;
  };
  status: string;
  rejectionReason?: string;
  resolutionComment?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyDisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadDisputes();
  }, []);

  async function loadDisputes() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/payroll-tracking/disputes/my');
      setDisputes(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return styles.statusApproved;
      case 'rejected':
        return styles.statusRejected;
      case 'under_review':
      case 'pending_manager_approval':
        return styles.statusPending;
      default:
        return styles.statusDefault;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const getFilteredDisputes = () => {
    if (filterStatus === 'all') return disputes;
    return disputes.filter(d => d.status.toLowerCase() === filterStatus.toLowerCase());
  };

  const filteredDisputes = getFilteredDisputes();

  const stats = {
    total: disputes.length,
    pending: disputes.filter(d => 
      d.status === 'UNDER_REVIEW' || d.status === 'PENDING_MANAGER_APPROVAL'
    ).length,
    approved: disputes.filter(d => d.status === 'APPROVED').length,
    rejected: disputes.filter(d => d.status === 'REJECTED').length,
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="My Disputes" role="Employee">
          <Spinner message="Loading disputes..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My Payroll Disputes" role="Employee">
        <div className={styles.container}>
          {/* Navigation */}
          <div className={styles.navigation}>
            <Link href="/dashboard/employee/payroll/my-payslips" className={styles.backLink}>
              ← Back to My Payslips
            </Link>
            <button
              className={styles.btnNewDispute}
              onClick={() => router.push('/dashboard/employee/payroll/dispute')}
            >
               Submit New Dispute
            </button>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Disputes</div>
                <div className={styles.statValue}>{stats.total}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Pending Review</div>
                <div className={styles.statValue}>{stats.pending}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Approved</div>
                <div className={styles.statValue}>{stats.approved}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Rejected</div>
                <div className={styles.statValue}>{stats.rejected}</div>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className={styles.filterSection}>
            <div className={styles.filterLabel}>Filter by status:</div>
            <div className={styles.filterButtons}>
              <button
                className={`${styles.filterBtn} ${filterStatus === 'all' ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All ({disputes.length})
              </button>
              <button
                className={`${styles.filterBtn} ${filterStatus === 'under_review' ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus('under_review')}
              >
                Under Review ({disputes.filter(d => d.status === 'UNDER_REVIEW').length})
              </button>
              <button
                className={`${styles.filterBtn} ${filterStatus === 'pending_manager_approval' ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus('pending_manager_approval')}
              >
                Pending Approval ({disputes.filter(d => d.status === 'PENDING_MANAGER_APPROVAL').length})
              </button>
              <button
                className={`${styles.filterBtn} ${filterStatus === 'approved' ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus('approved')}
              >
                Approved ({stats.approved})
              </button>
              <button
                className={`${styles.filterBtn} ${filterStatus === 'rejected' ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus('rejected')}
              >
                Rejected ({stats.rejected})
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Empty State */}
          {!error && filteredDisputes.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}></div>
              <h3>No Disputes Found</h3>
              <p>
                {filterStatus === 'all'
                  ? "You haven't submitted any payroll disputes yet."
                  : `No disputes with status "${getStatusLabel(filterStatus)}".`}
              </p>
              <button className={styles.btnSubmitFirst} onClick={() => router.push('/dashboard/employee/payroll/dispute')}>
                Submit Your First Dispute
              </button>
            </div>
          )}

          {/* Disputes List */}
          {!error && filteredDisputes.length > 0 && (
            <div className={styles.disputesList}>
              {filteredDisputes.map((dispute) => (
                <div key={dispute._id} className={styles.disputeCard}>
                  <div className={styles.disputeHeader}>
                    <div className={styles.disputeTitle}>
                      <span className={styles.disputeId}>#{dispute.disputeId}</span>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(dispute.status)}`}>
                        {getStatusLabel(dispute.status)}
                      </span>
                    </div>
                    <div className={styles.disputeDate}>
                      Submitted: {formatDate(dispute.createdAt)}
                    </div>
                  </div>

                  <div className={styles.disputeBody}>
                    <div className={styles.payslipInfo}>
                      <strong>Disputed Payslip:</strong>{' '}
                      {formatDate(dispute.payslipId.payrollRunId.payrollPeriod)} - {dispute.payslipId.payrollRunId.runId}
                      {' '}(Net Pay: {formatCurrency(dispute.payslipId.netPay)})
                    </div>
                    <div className={styles.disputeDescription}>
                      <strong>Description:</strong>
                      <p>{dispute.description}</p>
                    </div>

                    {/* Resolution / Rejection */}
                    {dispute.resolutionComment && (
                      <div className={styles.resolutionSection}>
                        <strong>Resolution Comment:</strong>
                        <p className={styles.resolutionText}>{dispute.resolutionComment}</p>
                      </div>
                    )}
                    {dispute.rejectionReason && (
                      <div className={styles.rejectionSection}>
                        <strong>Rejection Reason:</strong>
                        <p className={styles.rejectionText}>{dispute.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  <div className={styles.disputeFooter}>
                    <div className={styles.updateInfo}>
                      Last updated: {formatFullDate(dispute.updatedAt)}
                    </div>
                    <button
                      className={styles.btnViewPayslip}
                      onClick={() => router.push(`/dashboard/employee/payroll/payslip/${dispute.payslipId._id}`)}
                    >
                      View Payslip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}