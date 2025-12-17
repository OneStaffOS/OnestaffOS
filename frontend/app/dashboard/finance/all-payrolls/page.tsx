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
import styles from '../finance.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
  employees: number;
  totalnetpay: number;
  paymentStatus: string;
  payrollSpecialistId?: string | { firstName: string; lastName: string };
  financeStaffId?: string | { firstName: string; lastName: string };
  financeApprovalDate?: string;
  createdAt: string;
}

export default function AllPayrollsPage() {
  const router = useRouter();
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

  const getStatusBadgeStyle = (status: string) => {
    const styles: any = {
      'draft': { background: '#f3f4f6', color: '#6b7280' },
      'under review': { background: '#fef3c7', color: '#92400e' },
      'pending finance approval': { background: '#fef08a', color: '#854d0e' },
      'approved': { background: '#dcfce7', color: '#16a34a' },
      'rejected': { background: '#fee2e2', color: '#dc2626' },
      'locked': { background: '#dbeafe', color: '#2563eb' },
    };
    return styles[status] || { background: '#f3f4f6', color: '#6b7280' };
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="All Payroll Runs" role="Finance Staff">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/finance" className={styles.backLink}>
            ← Back to Finance Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📊 All Payroll Runs</h1>
              <p className={styles.pageSubtitle}>
                Complete history of all payroll runs and disbursements
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{runs.length}</span>
              <span className={styles.statLabel}>Total Runs</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {runs.filter(r => r.status === 'pending finance approval').length}
              </span>
              <span className={styles.statLabel}>Pending Finance Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {runs.filter(r => r.status === 'approved').length}
              </span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {runs.filter(r => r.status === 'locked').length}
              </span>
              <span className={styles.statLabel}>Locked & Processed</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '600', fontSize: '14px', color: '#64748b' }}>Filter by status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
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
          {loading ? (
            <Spinner message="Loading payroll runs..." />
          ) : (
            <div className={styles.card}>
              {runs.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>📊</div>
                  <h3 className={styles.emptyStateTitle}>No Payroll Runs Found</h3>
                  <p className={styles.emptyStateDescription}>
                    {statusFilter !== 'all' 
                      ? `No payroll runs with status "${statusFilter}"`
                      : 'No payroll runs available'}
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Run ID</th>
                      <th>Period</th>
                      <th>Entity</th>
                      <th>Employees</th>
                      <th>Total Disbursement</th>
                      <th>Status</th>
                      <th>Finance Approved By</th>
                      <th>Payment Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const statusStyle = getStatusBadgeStyle(run.status);
                      return (
                        <tr key={run._id}>
                          <td>
                            <strong style={{ color: '#2563eb' }}>{run.runId}</strong>
                          </td>
                          <td>{formatDate(run.payrollPeriod)}</td>
                          <td>{run.entity}</td>
                          <td>{run.employees}</td>
                          <td>
                            <strong>{formatCurrency(run.totalnetpay)}</strong>
                          </td>
                          <td>
                            <span style={{
                              ...statusStyle,
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {run.status}
                            </span>
                          </td>
                          <td>
                            {run.financeStaffId && typeof run.financeStaffId === 'object' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span>{run.financeStaffId.firstName} {run.financeStaffId.lastName}</span>
                                {run.financeApprovalDate && (
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    {formatDate(run.financeApprovalDate)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: run.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                              color: run.paymentStatus === 'paid' ? '#16a34a' : '#92400e'
                            }}>
                              {run.paymentStatus}
                            </span>
                          </td>
                          <td>
                            {run.status === 'pending finance approval' ? (
                              <button
                                className={styles.btnPrimary}
                                onClick={() => router.push(`/dashboard/finance/payroll-approvals/${run._id}`)}
                                style={{ padding: '8px 16px', fontSize: '13px' }}
                              >
                                Review
                              </button>
                            ) : (
                              <button
                                className={styles.btnSecondary}
                                onClick={() => router.push(`/dashboard/payroll/execution/runs/${run._id}`)}
                                style={{ padding: '8px 16px', fontSize: '13px' }}
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
