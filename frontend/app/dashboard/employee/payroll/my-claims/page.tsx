"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './my-claims.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Claim {
  _id: string;
  claimId: string;
  description: string;
  claimType: string;
  amount: number;
  approvedAmount?: number;
  status: string;
  rejectionReason?: string;
  resolutionComment?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadClaims();
  }, []);

  async function loadClaims() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/payroll-tracking/claims/my');
      setClaims(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load claims');
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

  const formatClaimType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  const getFilteredClaims = () => {
    if (filterStatus === 'all') return claims;
    return claims.filter(c => c.status.toLowerCase() === filterStatus.toLowerCase());
  };

  const filteredClaims = getFilteredClaims();

  const stats = {
    total: claims.length,
    pending: claims.filter(c => 
      c.status === 'UNDER_REVIEW' || c.status === 'PENDING_MANAGER_APPROVAL' || 
      c.status === 'under_review' || c.status === 'pending_manager_approval'
    ).length,
    approved: claims.filter(c => c.status === 'APPROVED' || c.status === 'approved').length,
    rejected: claims.filter(c => c.status === 'REJECTED' || c.status === 'rejected').length,
    totalRequested: claims.reduce((sum, c) => sum + c.amount, 0),
    totalApproved: claims.filter(c => c.status === 'APPROVED' || c.status === 'approved').reduce((sum, c) => sum + (c.approvedAmount || 0), 0),
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="My Claims" role="Employee">
          <Spinner message="Loading claims..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My Expense Claims" role="Employee">
        <div className={styles.container}>
          {/* Navigation */}
          <div className={styles.navigation}>
            <Link href="/dashboard/employee/payroll/my-payslips" className={styles.backLink}>
              ← Back to My Payslips
            </Link>
            <button
              className={styles.btnNewClaim}
              onClick={() => router.push('/dashboard/employee/payroll/submit-claim')}
            >
              💼 Submit New Claim
            </button>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📋</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Claims</div>
                <div className={styles.statValue}>{stats.total}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⏳</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Pending Review</div>
                <div className={styles.statValue}>{stats.pending}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Approved</div>
                <div className={styles.statValue}>{stats.approved}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💰</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Approved Amount</div>
                <div className={styles.statValue}>{formatCurrency(stats.totalApproved)}</div>
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
                All ({claims.length})
              </button>
              <button
                className={`${styles.filterBtn} ${filterStatus === 'under_review' ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus('under_review')}
              >
                Under Review ({claims.filter(c => c.status === 'UNDER_REVIEW').length})
              </button>
              <button
                className={`${styles.filterBtn} ${filterStatus === 'pending_manager_approval' ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus('pending_manager_approval')}
              >
                Pending Approval ({claims.filter(c => c.status === 'PENDING_MANAGER_APPROVAL').length})
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
          {!error && filteredClaims.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💼</div>
              <h3>No Claims Found</h3>
              <p>
                {filterStatus === 'all'
                  ? "You haven't submitted any expense claims yet."
                  : `No claims with status "${getStatusLabel(filterStatus)}".`}
              </p>
              <button className={styles.btnSubmitFirst} onClick={() => router.push('/dashboard/employee/payroll/submit-claim')}>
                Submit Your First Claim
              </button>
            </div>
          )}

          {/* Claims List */}
          {!error && filteredClaims.length > 0 && (
            <div className={styles.claimsList}>
              {filteredClaims.map((claim) => (
                <div key={claim._id} className={styles.claimCard}>
                  <div className={styles.claimHeader}>
                    <div className={styles.claimTitle}>
                      <span className={styles.claimId}>#{claim.claimId}</span>
                      <span className={styles.claimType}>{formatClaimType(claim.claimType)}</span>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(claim.status)}`}>
                        {getStatusLabel(claim.status)}
                      </span>
                    </div>
                    <div className={styles.claimDate}>
                      Submitted: {formatDate(claim.createdAt)}
                    </div>
                  </div>

                  <div className={styles.claimBody}>
                    <div className={styles.amountSection}>
                      <div className={styles.amountItem}>
                        <span className={styles.amountLabel}>Requested Amount:</span>
                        <span className={styles.amountValue}>{formatCurrency(claim.amount)}</span>
                      </div>
                      {claim.approvedAmount !== undefined && claim.approvedAmount !== null && 
                       (claim.status === 'APPROVED' || claim.status === 'approved') && (
                        <div className={styles.amountItem}>
                          <span className={styles.amountLabel}>Approved Amount:</span>
                          <span className={`${styles.amountValue} ${styles.approvedValue}`}>
                            {formatCurrency(claim.approvedAmount)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className={styles.claimDescription}>
                      <strong>Description:</strong>
                      <p>{claim.description}</p>
                    </div>

                    {/* Resolution / Rejection */}
                    {claim.resolutionComment && (
                      <div className={styles.resolutionSection}>
                        <strong>Resolution Comment:</strong>
                        <p className={styles.resolutionText}>{claim.resolutionComment}</p>
                      </div>
                    )}
                    {claim.rejectionReason && (
                      <div className={styles.rejectionSection}>
                        <strong>Rejection Reason:</strong>
                        <p className={styles.rejectionText}>{claim.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  <div className={styles.claimFooter}>
                    <div className={styles.updateInfo}>
                      Last updated: {formatFullDate(claim.updatedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Info */}
          {claims.length > 0 && (
            <div className={styles.summarySection}>
              <h3>Summary</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Total Requested</div>
                  <div className={styles.summaryValue}>{formatCurrency(stats.totalRequested)}</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Total Approved</div>
                  <div className={styles.summaryValue}>{formatCurrency(stats.totalApproved)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
