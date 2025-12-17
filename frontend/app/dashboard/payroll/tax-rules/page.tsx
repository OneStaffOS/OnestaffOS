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
interface TaxRule {
  _id: string;
  name: string;
  description?: string;
  rate: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  createdAt: string;
}

export default function TaxRulesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);
  const isLegalPolicyAdmin = user?.roles.includes(SystemRole.LEGAL_POLICY_ADMIN);

  async function loadTaxRules() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/tax-rules', { params });
      const data = response.data;
      setTaxRules(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
      setTaxRules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTaxRules();
  }, [statusFilter]);

  const canApprove = isPayrollManager || isSystemAdmin;
  const canCreate = isLegalPolicyAdmin; // Only Legal & Policy Admin can create tax rules
  const canDelete = isPayrollManager || isSystemAdmin || isLegalPolicyAdmin;

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this tax rule?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/tax-rules/${id}/approve`);
      setSuccess('Tax rule approved successfully');
      await loadTaxRules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this tax rule?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/tax-rules/${id}/reject`);
      setSuccess('Tax rule rejected');
      await loadTaxRules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this tax rule? This action cannot be undone.')) return;
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/tax-rules/${id}`);
      setSuccess('Tax rule deleted successfully');
      await loadTaxRules();
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

  const pendingRules = taxRules.filter(p => p.status === 'draft');

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.LEGAL_POLICY_ADMIN,
      SystemRole.PAYROLL_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Tax Rules" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>🏛️ Tax Rules</h1>
              <p className={styles.pageSubtitle}>
                Configure tax rates and rules for payroll deductions
              </p>
            </div>
            {canCreate && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/tax-rules/create')}
                >
                  ➕ Create Tax Rule
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
              <span className={styles.statValue}>{taxRules.length}</span>
              <span className={styles.statLabel}>Total Tax Rules</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{taxRules.filter(r => r.status === 'approved').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingRules.length}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{taxRules.filter(r => r.status === 'rejected').length}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Pending Approvals Section */}
          {canApprove && pendingRules.length > 0 && (
            <div className={styles.approvalSection}>
              <h3 className={styles.approvalTitle}>⚠️ Pending Approvals ({pendingRules.length})</h3>
              <div className={styles.approvalList}>
                {pendingRules.map(rule => (
                  <div key={rule._id} className={styles.approvalItem}>
                    <div className={styles.approvalInfo}>
                      <h4 className={styles.approvalName}>{rule.name}</h4>
                      <p className={styles.approvalMeta}>
                        Rate: {rule.rate}% | 
                        Created by: {rule.createdBy?.firstName} {rule.createdBy?.lastName}
                      </p>
                    </div>
                    <div className={styles.approvalActions}>
                      <button 
                        className={styles.btnSuccess}
                        onClick={() => handleApprove(rule._id)}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className={styles.btnDanger}
                        onClick={() => handleReject(rule._id)}
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
            <Spinner message="Loading tax rules..." />
          ) : taxRules.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🏛️</span>
              <h3>No Tax Rules Found</h3>
              <p>Create your first tax rule to get started.</p>
              {canCreate && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/tax-rules/create')}
                  style={{ marginTop: '16px' }}
                >
                  ➕ Create Tax Rule
                </button>
              )}
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {taxRules.map((rule) => (
                <div key={rule._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{rule.name}</h3>
                    <span className={`${styles.badge} ${getStatusBadgeClass(rule.status)}`}>
                      {rule.status}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Tax Rate</span>
                      <span className={styles.cardMetaValue}>{rule.rate}%</span>
                    </div>
                    {rule.description && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Description</span>
                        <span className={styles.cardMetaValue}>{rule.description.substring(0, 50)}...</span>
                      </div>
                    )}
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Created</span>
                      <span className={styles.cardMetaValue}>
                        {new Date(rule.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {rule.createdBy && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Created By</span>
                        <span className={styles.cardMetaValue}>
                          {rule.createdBy.firstName} {rule.createdBy.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    {rule.status === 'draft' && canCreate && (
                      <button 
                        className={`${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={() => router.push(`/dashboard/payroll/tax-rules/${rule._id}/edit`)}
                      >
                        Edit
                      </button>
                    )}
                    {rule.status === 'draft' && canDelete && (
                      <button 
                        className={`${styles.btnDanger} ${styles.btnSmall}`}
                        onClick={() => handleDelete(rule._id)}
                      >
                        Delete
                      </button>
                    )}
                    {rule.status === 'draft' && canApprove && (
                      <>
                        <button 
                          className={`${styles.btnSuccess} ${styles.btnSmall}`}
                          onClick={() => handleApprove(rule._id)}
                        >
                          Approve
                        </button>
                        <button 
                          className={`${styles.btnWarning} ${styles.btnSmall}`}
                          onClick={() => handleReject(rule._id)}
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
