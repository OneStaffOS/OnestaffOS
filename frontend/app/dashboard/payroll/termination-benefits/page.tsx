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

interface TerminationBenefit {
  _id: string;
  name: string;
  amount: number;
  terms?: string;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  createdAt: string;
}

export default function TerminationBenefitsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [benefits, setBenefits] = useState<TerminationBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadBenefits() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/termination-benefits', { params });
      setBenefits(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBenefits();
  }, [statusFilter]);

  const canApprove = isPayrollManager || isSystemAdmin;
  const canCreate = isPayrollSpecialist || isSystemAdmin;

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this termination benefit?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/termination-benefits/${id}/approve`);
      setSuccess('Termination benefit approved successfully');
      await loadBenefits();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this termination benefit?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/termination-benefits/${id}/reject`);
      setSuccess('Termination benefit rejected');
      await loadBenefits();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this termination benefit? This action cannot be undone.')) return;
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/termination-benefits/${id}`);
      setSuccess('Termination benefit deleted successfully');
      await loadBenefits();
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

  const pendingBenefits = benefits.filter(p => p.status === 'draft');

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER, 
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Termination Benefits" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📤 Termination Benefits</h1>
              <p className={styles.pageSubtitle}>
                Define end-of-service gratuity and resignation benefits
              </p>
            </div>
            {canCreate && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/termination-benefits/create')}
                >
                  ➕ Create Termination Benefit
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
              <span className={styles.statValue}>{benefits.length}</span>
              <span className={styles.statLabel}>Total Benefits</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{benefits.filter(b => b.status === 'approved').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingBenefits.length}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{benefits.filter(b => b.status === 'rejected').length}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Pending Approvals Section */}
          {canApprove && pendingBenefits.length > 0 && (
            <div className={styles.approvalSection}>
              <h3 className={styles.approvalTitle}>⚠️ Pending Approvals ({pendingBenefits.length})</h3>
              <div className={styles.approvalList}>
                {pendingBenefits.map(benefit => (
                  <div key={benefit._id} className={styles.approvalItem}>
                    <div className={styles.approvalInfo}>
                      <h4 className={styles.approvalName}>{benefit.name}</h4>
                      <p className={styles.approvalMeta}>
                        Amount: {formatCurrency(benefit.amount)} | 
                        Created by: {benefit.createdBy?.firstName} {benefit.createdBy?.lastName}
                      </p>
                    </div>
                    <div className={styles.approvalActions}>
                      <button 
                        className={styles.btnSuccess}
                        onClick={() => handleApprove(benefit._id)}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className={styles.btnDanger}
                        onClick={() => handleReject(benefit._id)}
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
            <Spinner message="Loading termination benefits..." />
          ) : benefits.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📤</span>
              <h3>No Termination Benefits Found</h3>
              <p>Create your first termination benefit to get started.</p>
              {canCreate && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/termination-benefits/create')}
                  style={{ marginTop: '16px' }}
                >
                  ➕ Create Termination Benefit
                </button>
              )}
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {benefits.map((benefit) => (
                <div key={benefit._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{benefit.name}</h3>
                    <span className={`${styles.badge} ${getStatusBadgeClass(benefit.status)}`}>
                      {benefit.status}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Amount</span>
                      <span className={styles.cardMetaValue}>{formatCurrency(benefit.amount)}</span>
                    </div>
                    {benefit.terms && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Terms</span>
                        <span className={styles.cardMetaValue}>{benefit.terms.substring(0, 50)}...</span>
                      </div>
                    )}
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Created</span>
                      <span className={styles.cardMetaValue}>
                        {new Date(benefit.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {benefit.createdBy && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Created By</span>
                        <span className={styles.cardMetaValue}>
                          {benefit.createdBy.firstName} {benefit.createdBy.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    {benefit.status === 'draft' && canCreate && (
                      <>
                        <button 
                          className={`${styles.btnSecondary} ${styles.btnSmall}`}
                          onClick={() => router.push(`/dashboard/payroll/termination-benefits/${benefit._id}/edit`)}
                        >
                          Edit
                        </button>
                        <button 
                          className={`${styles.btnDanger} ${styles.btnSmall}`}
                          onClick={() => handleDelete(benefit._id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {benefit.status === 'draft' && canApprove && (
                      <>
                        <button 
                          className={`${styles.btnSuccess} ${styles.btnSmall}`}
                          onClick={() => handleApprove(benefit._id)}
                        >
                          Approve
                        </button>
                        <button 
                          className={`${styles.btnWarning} ${styles.btnSmall}`}
                          onClick={() => handleReject(benefit._id)}
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
