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

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface SigningBonus {
  _id: string;
  positionName: string;
  amount: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  createdAt: string;
}

export default function SigningBonusesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bonuses, setBonuses] = useState<SigningBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadBonuses() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/signing-bonuses', { params });
      setBonuses(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBonuses();
  }, [statusFilter]);

  const canApprove = isPayrollManager || isSystemAdmin;
  const canCreate = isPayrollSpecialist || isSystemAdmin;

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this signing bonus?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/signing-bonuses/${id}/approve`);
      setSuccess('Signing bonus approved successfully');
      await loadBonuses();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this signing bonus?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/signing-bonuses/${id}/reject`);
      setSuccess('Signing bonus rejected');
      await loadBonuses();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this signing bonus? This action cannot be undone.')) return;
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/signing-bonuses/${id}`);
      setSuccess('Signing bonus deleted successfully');
      await loadBonuses();
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

  const pendingBonuses = bonuses.filter(p => p.status === 'draft');

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER, 
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Signing Bonuses" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>✍️ Signing Bonuses</h1>
              <p className={styles.pageSubtitle}>
                Configure onboarding bonuses based on positions for new hires
              </p>
            </div>
            {canCreate && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/signing-bonuses/create')}
                >
                  ➕ Create Signing Bonus
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
              <span className={styles.statValue}>{bonuses.length}</span>
              <span className={styles.statLabel}>Total Signing Bonuses</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{bonuses.filter(b => b.status === 'approved').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingBonuses.length}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{bonuses.filter(b => b.status === 'rejected').length}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Pending Approvals Section */}
          {canApprove && pendingBonuses.length > 0 && (
            <div className={styles.approvalSection}>
              <h3 className={styles.approvalTitle}>⚠️ Pending Approvals ({pendingBonuses.length})</h3>
              <div className={styles.approvalList}>
                {pendingBonuses.map(bonus => (
                  <div key={bonus._id} className={styles.approvalItem}>
                    <div className={styles.approvalInfo}>
                      <h4 className={styles.approvalName}>{bonus.positionName}</h4>
                      <p className={styles.approvalMeta}>
                        Amount: {formatCurrency(bonus.amount)} | 
                        Created by: {bonus.createdBy?.firstName} {bonus.createdBy?.lastName}
                      </p>
                    </div>
                    <div className={styles.approvalActions}>
                      <button 
                        className={styles.btnSuccess}
                        onClick={() => handleApprove(bonus._id)}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className={styles.btnDanger}
                        onClick={() => handleReject(bonus._id)}
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
            <Spinner message="Loading signing bonuses..." />
          ) : bonuses.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✍️</span>
              <h3>No Signing Bonuses Found</h3>
              <p>Create your first signing bonus to get started.</p>
              {canCreate && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/signing-bonuses/create')}
                  style={{ marginTop: '16px' }}
                >
                  ➕ Create Signing Bonus
                </button>
              )}
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {bonuses.map((bonus) => (
                <div key={bonus._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{bonus.positionName}</h3>
                    <span className={`${styles.badge} ${getStatusBadgeClass(bonus.status)}`}>
                      {bonus.status}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Bonus Amount</span>
                      <span className={styles.cardMetaValue}>{formatCurrency(bonus.amount)}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Created</span>
                      <span className={styles.cardMetaValue}>
                        {new Date(bonus.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {bonus.createdBy && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Created By</span>
                        <span className={styles.cardMetaValue}>
                          {bonus.createdBy.firstName} {bonus.createdBy.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    {bonus.status === 'draft' && canCreate && (
                      <>
                        <button 
                          className={`${styles.btnSecondary} ${styles.btnSmall}`}
                          onClick={() => router.push(`/dashboard/payroll/signing-bonuses/${bonus._id}/edit`)}
                        >
                          Edit
                        </button>
                        <button 
                          className={`${styles.btnDanger} ${styles.btnSmall}`}
                          onClick={() => handleDelete(bonus._id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {bonus.status === 'draft' && canApprove && (
                      <>
                        <button 
                          className={`${styles.btnSuccess} ${styles.btnSmall}`}
                          onClick={() => handleApprove(bonus._id)}
                        >
                          Approve
                        </button>
                        <button 
                          className={`${styles.btnWarning} ${styles.btnSmall}`}
                          onClick={() => handleReject(bonus._id)}
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
