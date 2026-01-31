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
  totalnetpay: number;
  unlockReason?: string;
  payrollManagerId?: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export default function PayrollManagerAuditPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<string>('all-security-actions');

  useEffect(() => {
    loadAuditTrail();
  }, [viewFilter]);

  async function loadAuditTrail() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/payroll-execution/runs');
      const allRuns = response.data || [];
      
      // Filter based on view
      let filteredRuns = allRuns;
      if (viewFilter === 'locked') {
        filteredRuns = allRuns.filter((r: PayrollRun) => r.status === 'locked');
      } else if (viewFilter === 'unlocked') {
        filteredRuns = allRuns.filter((r: PayrollRun) => r.status === 'unlocked');
      } else if (viewFilter === 'all-security-actions') {
        filteredRuns = allRuns.filter((r: PayrollRun) => 
          r.status === 'locked' || r.status === 'unlocked'
        );
      }

      // Sort by most recent first
      filteredRuns.sort((a: PayrollRun, b: PayrollRun) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setRuns(filteredRuns);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load audit trail');
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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    const styles: any = {
      'locked': { background: '#dbeafe', color: '#2563eb' },
      'unlocked': { background: '#fce7f3', color: '#be123c' },
    };
    return styles[status] || { background: '#f3f4f6', color: '#6b7280' };
  };

  const lockedCount = runs.filter(r => r.status === 'locked').length;
  const unlockedCount = runs.filter(r => r.status === 'unlocked').length;
  const totalSecurityActions = lockedCount + unlockedCount;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Payroll Security Audit Trail" role="Payroll Manager">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader} style={{
            background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
            padding: '32px',
            borderRadius: '16px',
            marginBottom: '32px',
            color: 'white',
            boxShadow: '0 10px 30px rgba(22, 163, 74, 0.2)'
          }}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle} style={{ color: 'white', fontSize: '32px' }}>
                 Payroll Security Audit Trail
              </h1>
              <p className={styles.pageSubtitle} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
                Complete history of all payroll lock/unlock actions with timestamps and reasons
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}> {error}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {totalSecurityActions}
              </span>
              <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                Total Security Actions
              </span>
            </div>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {lockedCount}
              </span>
              <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                Currently Locked
              </span>
            </div>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(190, 18, 60, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {unlockedCount}
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
            background: 'linear-gradient(to right, #f0fdf4, #dcfce7)',
            borderRadius: '12px'
          }}>
            <span style={{ fontWeight: '600', fontSize: '14px', color: '#16a34a' }}>View:</span>
            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #22c55e',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                background: 'white'
              }}
            >
              <option value="all-security-actions">All Lock/Unlock Actions</option>
              <option value="locked">Currently Locked Only</option>
              <option value="unlocked">Unlocked (Exceptions) Only</option>
            </select>
          </div>

          {/* Audit Trail Table */}
          {loading ? (
            <Spinner message="Loading audit trail..." />
          ) : (
            <div className={styles.card} style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb'
            }}>
              {runs.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}></div>
                  <h3 className={styles.emptyStateTitle}>No Audit Records Found</h3>
                  <p className={styles.emptyStateDescription}>
                    {viewFilter === 'locked' && 'No locked payroll runs'}
                    {viewFilter === 'unlocked' && 'No unlocked payroll runs'}
                    {viewFilter === 'all-security-actions' && 'No lock/unlock actions recorded yet'}
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(to right, #f0fdf4, #dcfce7)' }}>
                      <th>Run ID</th>
                      <th>Period</th>
                      <th>Entity</th>
                      <th>Employees</th>
                      <th>Total Pay</th>
                      <th>Security Status</th>
                      <th>Last Modified</th>
                      <th>Unlock Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const statusStyle = getStatusBadgeStyle(run.status);
                      const isUnlocked = run.status === 'unlocked';

                      return (
                        <tr key={run._id} style={{
                          background: isUnlocked ? '#fef2f2' : 'white'
                        }}>
                          <td>
                            <strong style={{ 
                              color: isUnlocked ? '#dc2626' : '#2563eb', 
                              fontSize: '15px' 
                            }}>
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
                              {run.status === 'locked' ? 'LOCKED' : 'UNLOCKED'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px' }}>
                              {formatDateTime(run.updatedAt)}
                            </div>
                          </td>
                          <td>
                            {run.unlockReason ? (
                              <div style={{
                                background: '#fee2e2',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #fecaca'
                              }}>
                                <div style={{ 
                                  fontSize: '11px', 
                                  color: '#991b1b',
                                  fontWeight: '600',
                                  marginBottom: '4px'
                                }}>
                                   UNLOCK JUSTIFICATION:
                                </div>
                                <div style={{ 
                                  fontSize: '13px', 
                                  color: '#dc2626',
                                  fontStyle: 'italic'
                                }}>
                                  "{run.unlockReason}"
                                </div>
                              </div>
                            ) : (
                              <span style={{ 
                                color: '#94a3b8', 
                                fontSize: '13px',
                                fontStyle: 'italic'
                              }}>
                                N/A (Locked)
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

          {/* Audit Information Panel */}
          <div style={{
            marginTop: '32px',
            padding: '24px',
            background: 'linear-gradient(to right, #f0f9ff, #e0f2fe)',
            borderLeft: '4px solid #0ea5e9',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0c4a6e', fontWeight: '700' }}>
               Audit Trail Information
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#475569', lineHeight: '1.8' }}>
              <li><strong>Locked Status:</strong> Payroll run is finalized and protected from any modifications</li>
              <li><strong>Unlocked Status:</strong> Exceptional override allowing corrections - requires documented justification</li>
              <li><strong>Last Modified:</strong> Timestamp when the lock/unlock action was performed</li>
              <li><strong>Unlock Reason:</strong> Mandatory documentation explaining why a locked payroll was reopened</li>
              <li><strong>Security Policy:</strong> All unlock actions are permanently logged for compliance and audit purposes</li>
            </ul>
          </div>

          {/* Export Options */}
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                Export Audit Trail
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Download complete audit history for compliance reporting
              </p>
            </div>
            <button
              onClick={() => alert('Export feature coming soon - will generate CSV/PDF report')}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                color: 'white',
                padding: '10px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
              }}
            >
               Export to CSV
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}