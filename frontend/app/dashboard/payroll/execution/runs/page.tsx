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

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
  employees: number;
  exceptions: number;
  totalnetpay: number;
  paymentStatus: string;
  payrollSpecialistId?: string | { firstName: string; lastName: string };
  payrollManagerId?: string | { firstName: string; lastName: string };
  financeStaffId?: string | { firstName: string; lastName: string };
  createdAt: string;
}

export default function PayrollRunsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadRuns();
  }, [statusFilter]);

  async function loadRuns() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-execution/runs', { params });
      setRuns(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft': return styles.badgeDraft;
      case 'under review': return styles.badgeUnderReview;
      case 'pending finance approval': return styles.badgePendingFinance;
      case 'approved': return styles.badgeApproved;
      case 'rejected': return styles.badgeRejected;
      case 'locked': return styles.badgeLocked;
      default: return styles.badge;
    }
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid': return styles.badgePaid;
      case 'pending': return styles.badgePending;
      default: return styles.badge;
    }
  };

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
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Payroll Runs" role="Payroll">
          <Spinner message="Loading payroll runs..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Payroll Runs" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/execution" className={styles.backLink}>
            ← Back to Payroll Execution
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>
                <span className="emoji"></span>
                <span className="text">Payroll Runs</span>
              </h1>
              <p className={styles.pageSubtitle}>
                Manage and track all payroll runs across different periods
              </p>
            </div>
            {user?.roles.includes(SystemRole.PAYROLL_SPECIALIST) && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/execution/runs/create')}
                >
                   Create Payroll Run
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}> {error}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{runs.length}</span>
              <span className={styles.statLabel}>Total Runs</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {runs.filter(r => r.status === 'draft').length}
              </span>
              <span className={styles.statLabel}>Draft</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {runs.filter(r => r.status === 'under review').length}
              </span>
              <span className={styles.statLabel}>Under Review</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {runs.filter(r => r.status === 'approved').length}
              </span>
              <span className={styles.statLabel}>Approved</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <span className={styles.filterLabel}>Filter by status:</span>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="under review">Under Review</option>
              <option value="pending finance approval">Pending Finance</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="locked">Locked</option>
            </select>
          </div>

          {/* Payroll Runs Table */}
          <div className={styles.card}>
            {runs.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}></div>
                <h3 className={styles.emptyStateTitle}>No Payroll Runs Found</h3>
                <p className={styles.emptyStateDescription}>
                  {statusFilter !== 'all' 
                    ? `No payroll runs with status "${statusFilter}"`
                    : 'Start by creating your first payroll run'}
                </p>
                {statusFilter === 'all' && user?.roles.includes(SystemRole.PAYROLL_SPECIALIST) && (
                  <button
                    className={styles.btnPrimary}
                    onClick={() => router.push('/dashboard/payroll/execution/runs/create')}
                  >
                     Create First Payroll Run
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Run ID</th>
                      <th>Period</th>
                      <th>Entity</th>
                      <th>Employees</th>
                      <th>Exceptions</th>
                      <th>Total Net Pay</th>
                      <th>Status</th>
                      <th>Payment Status</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run._id}>
                        <td>
                          <strong style={{ color: '#2563eb' }}>{run.runId}</strong>
                        </td>
                        <td>{formatDate(run.payrollPeriod)}</td>
                        <td>{run.entity}</td>
                        <td>{run.employees || 0}</td>
                        <td>
                          {run.exceptions > 0 ? (
                            <span className={styles.exceptionBadge}>
                               {run.exceptions}
                            </span>
                          ) : (
                            <span style={{ color: '#10b981' }}> None</span>
                          )}
                        </td>
                        <td>
                          <strong>{formatCurrency(run.totalnetpay)}</strong>
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(run.status)}>
                            {run.status}
                          </span>
                        </td>
                        <td>
                          <span className={getPaymentStatusBadgeClass(run.paymentStatus)}>
                            {run.paymentStatus}
                          </span>
                        </td>
                        <td>
                          {run.payrollSpecialistId && typeof run.payrollSpecialistId === 'object'
                            ? `${run.payrollSpecialistId.firstName} ${run.payrollSpecialistId.lastName}`
                            : '-'}
                        </td>
                        <td>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => router.push(`/dashboard/payroll/execution/runs/${run._id}`)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}