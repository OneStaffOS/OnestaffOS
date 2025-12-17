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
import styles from '../../payroll.module.css';

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
  unlockReason?: string;
  createdAt: string;
}

export default function PayrollManagerRunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [unlockReason, setUnlockReason] = useState('');

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

  async function handleLock(run: PayrollRun) {
    if (!confirm(`Are you sure you want to LOCK payroll run ${run.runId}? This will prevent any further edits.`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post(`/payroll-execution/runs/${run._id}/lock`);
      setSuccess(`✅ Payroll run ${run.runId} has been locked successfully`);
      await loadRuns();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to lock payroll run');
    } finally {
      setActionLoading(false);
    }
  }

  function openUnlockDialog(run: PayrollRun) {
    setSelectedRun(run);
    setUnlockReason('');
    setError(null);
    setSuccess(null);
  }

  function closeUnlockDialog() {
    setSelectedRun(null);
    setUnlockReason('');
  }

  async function handleUnlock() {
    if (!selectedRun) return;

    if (!unlockReason.trim()) {
      setError('Please provide a reason for unlocking this payroll run');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post(`/payroll-execution/runs/${selectedRun._id}/unlock`, {
        payrollRunId: selectedRun._id,
        unlockReason: unlockReason.trim()
      });
      setSuccess(`✅ Payroll run ${selectedRun.runId} has been unlocked. Reason: ${unlockReason}`);
      closeUnlockDialog();
      await loadRuns();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to unlock payroll run');
    } finally {
      setActionLoading(false);
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
      'unlocked': { background: '#fce7f3', color: '#be123c' },
    };
    return styles[status] || { background: '#f3f4f6', color: '#6b7280' };
  };

  const approvedRuns = runs.filter(r => r.status === 'approved');
  const lockedRuns = runs.filter(r => r.status === 'locked');
  const unlockedRuns = runs.filter(r => r.status === 'unlocked');

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Lock/Unlock Payroll Runs" role="Payroll Manager">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader} style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            padding: '32px',
            borderRadius: '16px',
            marginBottom: '32px',
            color: 'white',
            boxShadow: '0 10px 30px rgba(30, 64, 175, 0.2)'
          }}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle} style={{ color: 'white', fontSize: '32px' }}>
                🔐 Lock/Unlock Payroll Runs
              </h1>
              <p className={styles.pageSubtitle} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
                Manage payroll run security - lock finalized runs or unlock for corrections with documented reasons
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {approvedRuns.length}
              </span>
              <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                Approved (Can Lock)
              </span>
            </div>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(6, 182, 212, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {lockedRuns.length}
              </span>
              <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                Currently Locked
              </span>
            </div>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {unlockedRuns.length}
              </span>
              <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                Unlocked (Exceptional)
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ 
            marginBottom: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px',
            background: 'linear-gradient(to right, #eff6ff, #dbeafe)',
            borderRadius: '12px'
          }}>
            <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e40af' }}>Filter by status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                background: 'white'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved (Ready to Lock)</option>
              <option value="locked">Locked</option>
              <option value="unlocked">Unlocked</option>
            </select>
          </div>

          {/* Payroll Runs Table */}
          {loading ? (
            <Spinner message="Loading payroll runs..." />
          ) : (
            <div className={styles.card} style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb'
            }}>
              {runs.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>🔒</div>
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
                    <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                      <th>Run ID</th>
                      <th>Period</th>
                      <th>Entity</th>
                      <th>Employees</th>
                      <th>Total Pay</th>
                      <th>Status</th>
                      <th>Unlock Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const statusStyle = getStatusBadgeStyle(run.status);
                      const canLock = run.status === 'approved';
                      const canUnlock = run.status === 'locked';

                      return (
                        <tr key={run._id}>
                          <td>
                            <strong style={{ color: '#2563eb', fontSize: '15px' }}>
                              {run.runId}
                            </strong>
                          </td>
                          <td>{formatDate(run.payrollPeriod)}</td>
                          <td>{run.entity}</td>
                          <td>
                            <span style={{
                              background: '#dbeafe',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#1e40af'
                            }}>
                              {run.employees}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: '#16a34a' }}>
                              {formatCurrency(run.totalnetpay)}
                            </strong>
                          </td>
                          <td>
                            <span style={{
                              ...statusStyle,
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {run.status}
                            </span>
                          </td>
                          <td>
                            {run.unlockReason ? (
                              <span style={{ 
                                fontSize: '13px', 
                                color: '#dc2626',
                                fontStyle: 'italic'
                              }}>
                                {run.unlockReason}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                          <td>
                            {canLock && (
                              <button
                                onClick={() => handleLock(run)}
                                disabled={actionLoading}
                                style={{
                                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                  color: 'white',
                                  padding: '8px 16px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                                }}
                              >
                                🔒 Lock
                              </button>
                            )}
                            {canUnlock && (
                              <button
                                onClick={() => openUnlockDialog(run)}
                                disabled={actionLoading}
                                style={{
                                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                  color: 'white',
                                  padding: '8px 16px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                                }}
                              >
                                🔓 Unlock
                              </button>
                            )}
                            {!canLock && !canUnlock && (
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                                No Action
                              </span>
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

          {/* Unlock Dialog Modal */}
          {selectedRun && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                padding: '32px',
                borderRadius: '16px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
              }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
                  🔓 Unlock Payroll Run: {selectedRun.runId}
                </h2>
                <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>
                  This is an exceptional action. You must provide a detailed reason for unlocking this payroll run.
                </p>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Reason for Unlocking (Required) *
                  </label>
                  <textarea
                    value={unlockReason}
                    onChange={(e) => setUnlockReason(e.target.value)}
                    placeholder="Example: Correction needed for employee bank details, retroactive salary adjustment approved by CEO, etc."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeUnlockDialog}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUnlock}
                    disabled={actionLoading || !unlockReason.trim()}
                    style={{
                      padding: '10px 24px',
                      border: 'none',
                      background: actionLoading || !unlockReason.trim() ? '#9ca3af' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: actionLoading || !unlockReason.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {actionLoading ? '⏳ Unlocking...' : '🔓 Confirm Unlock'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
