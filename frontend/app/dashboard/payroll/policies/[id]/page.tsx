"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../payroll.module.css';

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
  createdBy?: { firstName: string; lastName: string; email: string };
  approvedBy?: { firstName: string; lastName: string; email: string };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PolicyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [policy, setPolicy] = useState<PayrollPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const role = localStorage.getItem('userRole') || '';
    setUserRole(role);
  }, []);

  async function loadPolicy() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/payroll-configuration/policies/${id}`);
      setPolicy(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadPolicy();
  }, [id]);

  const canApprove = [SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN].includes(userRole as SystemRole);
  const canEdit = [SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN].includes(userRole as SystemRole);

  async function handleApprove() {
    if (!confirm('Are you sure you want to approve this policy?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/policies/${id}/approve`);
      setSuccess('Policy approved successfully');
      await loadPolicy();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject() {
    if (!confirm('Are you sure you want to reject this policy?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/policies/${id}/reject`);
      setSuccess('Policy rejected');
      await loadPolicy();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) return;
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/policies/${id}`);
      router.push('/dashboard/payroll/policies');
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

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST, 
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Policy Details" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/policies" className={styles.backLink}>
            ← Back to Policies
          </Link>

          {/* Messages */}
          {error && <div className={styles.errorMessage}> {error}</div>}
          {success && <div className={styles.successMessage}> {success}</div>}

          {loading ? (
            <Spinner message="Loading policy details..." />
          ) : !policy ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}></span>
              <h3>Policy Not Found</h3>
              <p>The requested policy could not be found.</p>
            </div>
          ) : (
            <div className={styles.detailsContainer}>
              <div className={styles.detailsHeader}>
                <div>
                  <h1 className={styles.detailsTitle}>{policy.policyName}</h1>
                  <span className={`${styles.badge} ${getStatusBadgeClass(policy.status)}`}>
                    {policy.status}
                  </span>
                </div>
              </div>

              <div className={styles.detailsBody}>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Policy Type</span>
                    <span className={styles.detailValue}>{policy.policyType}</span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Applicability</span>
                    <span className={styles.detailValue}>{policy.applicability}</span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Effective Date</span>
                    <span className={styles.detailValue}>
                      {new Date(policy.effectiveDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Status</span>
                    <span className={styles.detailValue}>{policy.status}</span>
                  </div>

                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>Description</span>
                    <span className={styles.detailValue}>{policy.description}</span>
                  </div>
                </div>

                {/* Rule Definition */}
                <div className={styles.section} style={{ marginTop: '24px' }}>
                  <h3 className={styles.sectionTitle}> Rule Definition</h3>
                  <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Percentage</span>
                      <span className={styles.detailValue}>{policy.ruleDefinition.percentage}%</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Fixed Amount</span>
                      <span className={styles.detailValue}>{policy.ruleDefinition.fixedAmount} EGP</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Threshold Amount</span>
                      <span className={styles.detailValue}>{policy.ruleDefinition.thresholdAmount} EGP</span>
                    </div>
                  </div>
                </div>

                {/* Audit Information */}
                <div className={styles.section} style={{ marginTop: '24px' }}>
                  <h3 className={styles.sectionTitle}> Audit Information</h3>
                  <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Created By</span>
                      <span className={styles.detailValue}>
                        {policy.createdBy ? `${policy.createdBy.firstName} ${policy.createdBy.lastName}` : 'N/A'}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Created At</span>
                      <span className={styles.detailValue}>
                        {new Date(policy.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {policy.approvedBy && (
                      <>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Approved By</span>
                          <span className={styles.detailValue}>
                            {policy.approvedBy.firstName} {policy.approvedBy.lastName}
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Approved At</span>
                          <span className={styles.detailValue}>
                            {policy.approvedAt ? new Date(policy.approvedAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.detailsActions}>
                {policy.status === 'draft' && canEdit && (
                  <>
                    <button 
                      className={styles.btnSecondary}
                      onClick={() => router.push(`/dashboard/payroll/policies/${id}/edit`)}
                    >
                       Edit
                    </button>
                    <button 
                      className={styles.btnDanger}
                      onClick={handleDelete}
                    >
                       Delete
                    </button>
                  </>
                )}
                {policy.status === 'draft' && canApprove && (
                  <>
                    <button 
                      className={styles.btnSuccess}
                      onClick={handleApprove}
                    >
                       Approve
                    </button>
                    <button 
                      className={styles.btnWarning}
                      onClick={handleReject}
                    >
                       Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}