"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../payroll.module.css';

interface Allowance {
  _id: string;
  name: string;
  amount: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  createdAt: string;
}

export default function AllowancesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadAllowances() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/allowances', { params });
      setAllowances(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllowances();
  }, [statusFilter]);

  const canApprove = isPayrollManager || isSystemAdmin;
  const canCreate = isPayrollSpecialist || isSystemAdmin;

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this allowance?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/allowances/${id}/approve`);
      setSuccess('Allowance approved successfully');
      await loadAllowances();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this allowance?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/allowances/${id}/reject`);
      setSuccess('Allowance rejected');
      await loadAllowances();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this allowance? This action cannot be undone.')) return;
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/allowances/${id}`);
      setSuccess('Allowance deleted successfully');
      await loadAllowances();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved': return styles.badgeApproved;
      case 'rejected': return styles.badgeRejected;
      default: return styles.badgeDraft;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  const pendingAllowances = allowances.filter(p => p.status === 'draft');
  const totalApprovedAmount = allowances
    .filter(a => a.status === 'approved')
    .reduce((sum, a) => sum + a.amount, 0);

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER, 
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Allowances" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>🎁 Allowances</h1>
              <p className={styles.pageSubtitle}>
                Manage employee allowances like Housing, Transport, and other benefits
              </p>
            </div>
            {canCreate && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/allowances/create')}
                >
                 Create Allowance
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>✅ {success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{allowances.length}</span>
              <span className={styles.statLabel}>Total Allowances</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{allowances.filter(a => a.status === 'approved').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingAllowances.length}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{formatCurrency(totalApprovedAmount)}</span>
              <span className={styles.statLabel}>Total Approved Value</span>
            </div>
          </div>

          {/* Pending Approvals Section */}
          {canApprove && pendingAllowances.length > 0 && (
            <div className={styles.approvalSection}>
              <h3 className={styles.approvalTitle}>⚠️ Pending Approvals ({pendingAllowances.length})</h3>
              <div className={styles.approvalList}>
                {pendingAllowances.map(allowance => (
                  <div key={allowance._id} className={styles.approvalItem}>
                    <div className={styles.approvalInfo}>
                      <h4 className={styles.approvalName}>{allowance.name}</h4>
                      <p className={styles.approvalMeta}>
                        Amount: {formatCurrency(allowance.amount)} | 
                        Created by: {allowance.createdBy?.firstName} {allowance.createdBy?.lastName}
                      </p>
                    </div>
                    <div className={styles.approvalActions}>
                      <button 
                        className={styles.btnSuccess}
                        onClick={() => handleApprove(allowance._id)}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className={styles.btnDanger}
                        onClick={() => handleReject(allowance._id)}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Status:</span>
              <select 
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <Spinner message="Loading allowances..." />
          ) : allowances.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🎁</span>
              <h3>No Allowances Found</h3>
              <p>Create your first allowance to get started.</p>
              {canCreate && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/allowances/create')}
                  style={{ marginTop: '16px' }}
                >
                  ➕ Create Allowance
                </button>
              )}
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {allowances.map((allowance) => (
                <div key={allowance._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{allowance.name}</h3>
                    <span className={`${styles.badge} ${getStatusBadgeClass(allowance.status)}`}>
                      {allowance.status}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Amount</span>
                      <span className={styles.cardMetaValue}>{formatCurrency(allowance.amount)}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Created</span>
                      <span className={styles.cardMetaValue}>
                        {new Date(allowance.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {allowance.createdBy && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Created By</span>
                        <span className={styles.cardMetaValue}>
                          {allowance.createdBy.firstName} {allowance.createdBy.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    {allowance.status === 'draft' && canCreate && (
                      <>
                        <button 
                          className={`${styles.btnSecondary} ${styles.btnSmall}`}
                          onClick={() => router.push(`/dashboard/payroll/allowances/${allowance._id}/edit`)}
                        >
                          Edit
                        </button>
                        <button 
                          className={`${styles.btnDanger} ${styles.btnSmall}`}
                          onClick={() => handleDelete(allowance._id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {allowance.status === 'draft' && canApprove && (
                      <>
                        <button 
                          className={`${styles.btnSuccess} ${styles.btnSmall}`}
                          onClick={() => handleApprove(allowance._id)}
                        >
                          Approve
                        </button>
                        <button 
                          className={`${styles.btnWarning} ${styles.btnSmall}`}
                          onClick={() => handleReject(allowance._id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
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
