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
import styles from '../execution.module.css';

interface TerminationBenefit {
  _id: string;
  employeeId: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  benefitId: {
    benefitName: string;
    amount: number;
  };
  givenAmount: number;
  status: string;
  terminationId: string;
  createdAt: string;
}

export default function TerminationBenefitsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [benefits, setBenefits] = useState<TerminationBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadBenefits();
  }, []);

  async function loadBenefits() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/payroll-execution/termination-benefits/pending');
      setBenefits(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load termination benefits');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(benefitId: string) {
    if (!confirm('Are you sure you want to approve this termination benefit?')) return;
    setActionLoading(benefitId);
    setError(null);
    try {
      await axios.post(`/payroll-execution/termination-benefits/${benefitId}/approve`);
      setSuccess('Termination benefit approved successfully');
      await loadBenefits();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to approve termination benefit');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(benefitId: string) {
    if (!confirm('Are you sure you want to reject this termination benefit?')) return;
    setActionLoading(benefitId);
    setError(null);
    try {
      await axios.post(`/payroll-execution/termination-benefits/${benefitId}/reject`);
      setSuccess('Termination benefit rejected');
      await loadBenefits();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to reject termination benefit');
    } finally {
      setActionLoading(null);
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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Termination Benefits Review" role="Payroll">
          <Spinner message="Loading termination benefits..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Termination Benefits Review" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/execution" className={styles.backLink}>
            ← Back to Payroll Execution
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📤 Termination Benefits Review</h1>
              <p className={styles.pageSubtitle}>
                Review and approve end-of-service benefits for terminated or resigned employees
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>✅ {success}</div>}

          {/* Info */}
          <div className={styles.warningMessage}>
            ℹ️ <strong>Important:</strong> Termination benefits must be approved before they can be included in the final payroll. 
            Only approved benefits will be automatically added to the employee's last payroll payment.
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{benefits.length}</span>
              <span className={styles.statLabel}>Pending Approvals</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {formatCurrency(benefits.reduce((sum, b) => sum + b.givenAmount, 0))}
              </span>
              <span className={styles.statLabel}>Total Pending Amount</span>
            </div>
          </div>

          {/* Benefits List */}
          <div className={styles.card}>
            {benefits.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>✅</div>
                <h3 className={styles.emptyStateTitle}>All Caught Up!</h3>
                <p className={styles.emptyStateDescription}>
                  There are no pending termination benefits to review at this time.
                </p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee Number</th>
                    <th>Benefit Type</th>
                    <th>Configured Amount</th>
                    <th>Given Amount</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {benefits.map((benefit) => (
                    <tr key={benefit._id}>
                      <td>
                        <strong>
                          {benefit.employeeId.firstName} {benefit.employeeId.lastName}
                        </strong>
                      </td>
                      <td>{benefit.employeeId.employeeNumber}</td>
                      <td>{benefit.benefitId?.benefitName || '-'}</td>
                      <td>{formatCurrency(benefit.benefitId?.amount || 0)}</td>
                      <td>
                        <strong style={{ color: '#2563eb' }}>
                          {formatCurrency(benefit.givenAmount)}
                        </strong>
                      </td>
                      <td>{formatDate(benefit.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className={styles.btnSuccess}
                            onClick={() => handleApprove(benefit._id)}
                            disabled={actionLoading === benefit._id}
                          >
                            ✅ Approve
                          </button>
                          <button
                            className={styles.btnDanger}
                            onClick={() => handleReject(benefit._id)}
                            disabled={actionLoading === benefit._id}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
