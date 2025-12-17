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
import styles from './payslips.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Payslip {
  _id: string;
  payrollRunId: {
    runId: string;
    payrollPeriod: string;
  };
  earningsDetails: {
    baseSalary: number;
    allowances: any[];
    bonuses: any[];
    benefits: any[];
    refunds: any[];
  };
  deductionsDetails: {
    taxes: any[];
    insurances: any[];
    penalties?: {
      employeeId: string;
      penalties: Array<{
        reason: string;
        amount: number;
      }>;
    };
  };
  totalGrossSalary: number;
  totaDeductions: number;
  netPay: number;
  paymentStatus: string;
  createdAt: string;
}

export default function MyPayslipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.sub) {
      loadPayslips();
    }
  }, [user]);

  async function loadPayslips() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/payroll-execution/employees/${user?.sub}/payslips`);
      setPayslips(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load payslips');
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
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return styles.badgePaid;
      case 'pending': return styles.badgePending;
      case 'disputed': return styles.badgeDisputed;
      default: return styles.badge;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="My Payslips" role="Employee">
          <Spinner message="Loading your payslips..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My Payslips" role="Employee">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/employee" className={styles.backLink}>
            ← Back to Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>💰 My Payslips</h1>
              <p className={styles.pageSubtitle}>
                View and download your monthly salary statements
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.btnPrimary}
                onClick={() => router.push('/dashboard/employee/payroll/salary-history')}
              >
                📊 View Salary History
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => router.push('/dashboard/employee/payroll/tax-documents')}
              >
                📄 Tax Documents
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

          {/* Stats */}
          {payslips.length > 0 && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{payslips.length}</span>
                <span className={styles.statLabel}>Total Payslips</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {formatCurrency(payslips[0]?.netPay || 0)}
                </span>
                <span className={styles.statLabel}>Latest Net Pay</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {formatCurrency(
                    payslips.reduce((sum, p) => sum + p.netPay, 0) / payslips.length
                  )}
                </span>
                <span className={styles.statLabel}>Average Net Pay</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {payslips.filter(p => p.paymentStatus === 'paid').length}
                </span>
                <span className={styles.statLabel}>Paid Payslips</span>
              </div>
            </div>
          )}

          {/* Payslips List */}
          <div className={styles.card}>
            {payslips.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>📄</div>
                <h3 className={styles.emptyStateTitle}>No Payslips Available</h3>
                <p className={styles.emptyStateDescription}>
                  Your payslips will appear here once payroll is processed
                </p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Payroll Period</th>
                    <th>Run ID</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Payment Status</th>
                    <th>Generated On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((payslip) => (
                    <tr key={payslip._id}>
                      <td>
                        <strong style={{ color: '#2563eb' }}>
                          {payslip.payrollRunId?.payrollPeriod
                            ? formatDate(payslip.payrollRunId.payrollPeriod)
                            : '-'}
                        </strong>
                      </td>
                      <td>{payslip.payrollRunId?.runId || '-'}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          {formatCurrency(payslip.totalGrossSalary)}
                        </strong>
                      </td>
                      <td style={{ color: '#dc2626' }}>
                        {formatCurrency(payslip.totaDeductions || 0)}
                      </td>
                      <td>
                        <strong style={{ color: '#2563eb', fontSize: '16px' }}>
                          {formatCurrency(payslip.netPay)}
                        </strong>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(payslip.paymentStatus)}>
                          {payslip.paymentStatus}
                        </span>
                      </td>
                      <td>{formatDate(payslip.createdAt)}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.btnView}
                            onClick={() => router.push(`/dashboard/employee/payroll/payslip/${payslip._id}`)}
                          >
                            View Details
                          </button>
                          <button
                            className={styles.btnDispute}
                            onClick={() => router.push(`/dashboard/employee/payroll/dispute?payslipId=${payslip._id}`)}
                          >
                            Dispute
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <h3>Quick Actions</h3>
            <div className={styles.actionGrid}>
              <button
                className={styles.actionCard}
                onClick={() => router.push('/dashboard/employee/payroll/my-disputes')}
              >
                <span className={styles.actionIcon}>⚠️</span>
                <span className={styles.actionTitle}>My Disputes</span>
                <span className={styles.actionDesc}>View and track payroll disputes</span>
              </button>
              <button
                className={styles.actionCard}
                onClick={() => router.push('/dashboard/employee/payroll/my-claims')}
              >
                <span className={styles.actionIcon}>💼</span>
                <span className={styles.actionTitle}>My Claims</span>
                <span className={styles.actionDesc}>Track expense reimbursements</span>
              </button>
              <button
                className={styles.actionCard}
                onClick={() => router.push('/dashboard/employee/payroll/submit-claim')}
              >
                <span className={styles.actionIcon}>➕</span>
                <span className={styles.actionTitle}>Submit New Claim</span>
                <span className={styles.actionDesc}>Request expense reimbursement</span>
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
