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
interface PayrollPolicy {
  _id: string;
  policyName: string;
  policyType: string;
  description: string;
  effectiveDate: string;
  ruleDefinition: {
    percentage: number;
    fixedAmount: number;
    thresholdAmount: number;
  };
  applicability: string;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  createdAt: string;
}

export default function PayrollPoliciesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PayrollPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadPolicies() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/policies', { params });
      setPolicies(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, [statusFilter]);

  const canApprove = isPayrollManager || isSystemAdmin;
  const canCreate = isPayrollSpecialist || isSystemAdmin;

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this policy?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/policies/${id}/approve`);
      setSuccess('Policy approved successfully');
      await loadPolicies();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this policy?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/policies/${id}/reject`);
      setSuccess('Policy rejected');
      await loadPolicies();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) return;
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/policies/${id}`);
      setSuccess('Policy deleted successfully');
      await loadPolicies();
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

  const pendingPolicies = policies.filter(p => p.status === 'draft');

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER, 
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Payroll Policies" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Payroll Policies</h1>
              <p className={styles.pageSubtitle}>
                Manage deduction, allowance, benefit, and misconduct policies
              </p>
            </div>
            {canCreate && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/policies/create')}
                >
                   Create Policy
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}> {error}</div>}
          {success && <div className={styles.successMessage}> {success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{policies.length}</span>
              <span className={styles.statLabel}>Total Policies</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{policies.filter(p => p.status === 'approved').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingPolicies.length}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{policies.filter(p => p.status === 'rejected').length}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Pending Approvals Section (HR Manager View) */}
          {canApprove && pendingPolicies.length > 0 && (
            <div className={styles.approvalSection}>
              <h3 className={styles.approvalTitle}> Pending Approvals ({pendingPolicies.length})</h3>
              <div className={styles.approvalList}>
                {pendingPolicies.map(policy => (
                  <div key={policy._id} className={styles.approvalItem}>
                    <div className={styles.approvalInfo}>
                      <h4 className={styles.approvalName}>{policy.policyName}</h4>
                      <p className={styles.approvalMeta}>
                        {policy.policyType} | {policy.applicability} | 
                        Created by: {policy.createdBy?.firstName} {policy.createdBy?.lastName}
                      </p>
                    </div>
                    <div className={styles.approvalActions}>
                      <button 
                        className={styles.btnSuccess}
                        onClick={() => handleApprove(policy._id)}
                      >
                         Approve
                      </button>
                      <button 
                        className={styles.btnDanger}
                        onClick={() => handleReject(policy._id)}
                      >
                         Reject
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
            <Spinner message="Loading policies..." />
          ) : policies.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}></span>
              <h3>No Policies Found</h3>
              <p>Create your first payroll policy to get started.</p>
              {canCreate && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/policies/create')}
                  style={{ marginTop: '16px' }}
                >
                   Create Policy
                </button>
              )}
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Policy Name</th>
                    <th>Type</th>
                    <th>Applicability</th>
                    <th>Effective Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy) => (
                    <tr key={policy._id}>
                      <td>
                        <strong>{policy.policyName}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {policy.description?.substring(0, 50)}...
                        </div>
                      </td>
                      <td>{policy.policyType}</td>
                      <td>{policy.applicability}</td>
                      <td>{new Date(policy.effectiveDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`${styles.badge} ${getStatusBadgeClass(policy.status)}`}>
                          {policy.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button 
                            className={`${styles.btnSecondary} ${styles.btnSmall}`}
                            onClick={() => router.push(`/dashboard/payroll/policies/${policy._id}`)}
                          >
                            View
                          </button>
                          {policy.status === 'draft' && canCreate && (
                            <>
                              <button 
                                className={`${styles.btnSecondary} ${styles.btnSmall}`}
                                onClick={() => router.push(`/dashboard/payroll/policies/${policy._id}/edit`)}
                              >
                                Edit
                              </button>
                              <button 
                                className={`${styles.btnDanger} ${styles.btnSmall}`}
                                onClick={() => handleDelete(policy._id)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {policy.status === 'draft' && canApprove && (
                            <>
                              <button 
                                className={`${styles.btnSuccess} ${styles.btnSmall}`}
                                onClick={() => handleApprove(policy._id)}
                              >
                                Approve
                              </button>
                              <button 
                                className={`${styles.btnWarning} ${styles.btnSmall}`}
                                onClick={() => handleReject(policy._id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}