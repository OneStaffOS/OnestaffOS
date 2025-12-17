"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './finance.module.css';

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
  payrollManagerId?: string | { firstName: string; lastName: string };
  managerApprovalDate?: string;
  createdAt: string;
}

export default function FinanceDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pendingRuns, setPendingRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  async function loadPendingApprovals() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/payroll-execution/runs', {
        params: { status: 'pending finance approval' }
      });
      setPendingRuns(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load pending payroll runs');
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

  const totalDisbursement = pendingRuns.reduce((sum, run) => sum + run.totalnetpay, 0);

  return (
    <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Finance Dashboard" role="Finance Staff">
        <div className={styles.container}>
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
                💼 Finance Dashboard
              </h1>
              <p className={styles.pageSubtitle} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
                Review and approve payroll disbursements before execution
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

          {loading ? (
            <Spinner message="Loading pending approvals..." />
          ) : (
            <>
              {/* Stats */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard} style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
                  border: 'none'
                }}>
                  <span className={styles.statValue} style={{ color: 'white' }}>
                    {pendingRuns.length}
                  </span>
                  <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Pending Approvals
                  </span>
                </div>
                <div className={styles.statCard} style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
                  border: 'none'
                }}>
                  <span className={styles.statValue} style={{ color: 'white' }}>
                    {pendingRuns.reduce((sum, r) => sum + r.employees, 0)}
                  </span>
                  <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Total Employees
                  </span>
                </div>
                <div className={styles.statCard} style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)',
                  border: 'none'
                }}>
                  <span className={styles.statValue} style={{ color: 'white' }}>
                    {formatCurrency(totalDisbursement)}
                  </span>
                  <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Total Disbursement
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className={styles.quickActions} style={{
                background: 'linear-gradient(to right, #eff6ff, #dbeafe)',
                padding: '24px',
                borderRadius: '12px',
                borderLeft: '4px solid #2563eb',
                marginBottom: '24px'
              }}>
                <h2 className={styles.sectionTitle} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  color: '#1e40af',
                  marginBottom: '16px'
                }}>
                  🚀 Quick Actions
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <button
                    className={styles.actionCard}
                    onClick={() => router.push('/dashboard/finance/all-payrolls')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 20px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#1e293b'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>📊</span>
                    <span>All Payroll Runs</span>
                  </button>
                  <button
                    className={styles.actionCard}
                    onClick={() => router.push('/dashboard/finance/approved-disputes')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 20px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#1e293b'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#f59e0b';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>⚖️</span>
                    <span>Approved Disputes</span>
                  </button>
                  <button
                    className={styles.actionCard}
                    onClick={() => router.push('/dashboard/finance/approved-claims')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 20px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#1e293b'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>💰</span>
                    <span>Approved Claims</span>
                  </button>
                  <button
                    className={styles.actionCard}
                    onClick={() => router.push('/dashboard/finance/reports')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 20px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#1e293b'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>📈</span>
                    <span>Financial Reports</span>
                  </button>
                </div>
              </div>

              {/* Pending Payroll Runs Section */}
              <div style={{
                background: 'linear-gradient(to right, #fef3c7, #fef9c3)',
                padding: '20px',
                borderRadius: '12px',
                borderLeft: '4px solid #f59e0b',
                marginBottom: '24px'
              }}>
                <h2 className={styles.sectionTitle} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  color: '#92400e'
                }}>
                  📋 Payroll Disbursements Pending Approval
                </h2>
                <p className={styles.sectionDescription}>
                  Review payroll runs that have been approved by Payroll Manager and require finance approval before disbursement
                </p>
              </div>

              {/* Pending Payroll Runs */}
              <div className={styles.card} style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb'
              }}>
                {pendingRuns.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon} style={{ fontSize: '72px' }}>✅</div>
                    <h3 className={styles.emptyStateTitle}>No Pending Approvals</h3>
                    <p className={styles.emptyStateDescription}>
                      All payroll disbursements have been reviewed. New approvals will appear here when HR Manager approves payroll runs.
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
                        <th>Total Disbursement</th>
                        <th>Created By</th>
                        <th>Manager Approved</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRuns.map((run) => (
                        <tr key={run._id} style={{
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }} onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(to right, #fef9c3, #fef3c7)';
                          e.currentTarget.style.transform = 'scale(1.005)';
                        }} onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                          <td>
                            <strong style={{ 
                              color: '#2563eb',
                              fontSize: '15px',
                              fontWeight: '700'
                            }}>
                              {run.runId}
                            </strong>
                          </td>
                          <td>{formatDate(run.payrollPeriod)}</td>
                          <td>
                            <span style={{
                              background: '#eff6ff',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}>
                              {run.entity}
                            </span>
                          </td>
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
                            <strong style={{ 
                              color: '#dc2626',
                              fontSize: '15px',
                              fontWeight: '700'
                            }}>
                              {formatCurrency(run.totalnetpay)}
                            </strong>
                          </td>
                          <td>
                            {run.payrollSpecialistId && typeof run.payrollSpecialistId === 'object'
                              ? `${run.payrollSpecialistId.firstName} ${run.payrollSpecialistId.lastName}`
                              : '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span>
                                {run.payrollManagerId && typeof run.payrollManagerId === 'object'
                                  ? `${run.payrollManagerId.firstName} ${run.payrollManagerId.lastName}`
                                  : '-'}
                              </span>
                              {run.managerApprovalDate && (
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                  {formatDate(run.managerApprovalDate)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className={styles.btnPrimary}
                              onClick={() => router.push(`/dashboard/finance/payroll-approvals/${run._id}`)}
                              style={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                padding: '10px 20px',
                                fontSize: '14px',
                                fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                              }}
                            >
                              📝 Review & Approve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* All Payroll Runs Link */}
              <div className={styles.card} style={{ 
                marginTop: '24px',
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                border: '2px dashed #d1d5db',
                padding: '24px',
                boxShadow: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '18px', 
                      fontWeight: '700',
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      📊 View All Payroll Runs
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      color: '#64748b', 
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}>
                      View complete history of all payroll runs including approved and processed disbursements
                    </p>
                  </div>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => router.push('/dashboard/finance/all-payrolls')}
                    style={{
                      padding: '12px 24px',
                      fontSize: '15px',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.15)';
                    }}
                  >
                    View All →
                  </button>
                </div>
              </div>

              {/* Financial Reports Link */}
              <div className={styles.card} style={{ 
                marginTop: '24px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '2px dashed #86efac',
                padding: '24px',
                boxShadow: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '18px', 
                      fontWeight: '700',
                      color: '#14532d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      📊 Financial Reports & Analytics
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      color: '#15803d', 
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}>
                      Generate comprehensive reports for taxes, insurance, benefits, month-end, and year-end summaries
                    </p>
                  </div>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => router.push('/dashboard/finance/reports')}
                    style={{
                      padding: '12px 24px',
                      fontSize: '15px',
                      fontWeight: '600',
                      background: 'white',
                      border: '2px solid #16a34a',
                      color: '#16a34a',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.25)';
                      e.currentTarget.style.background = '#f0fdf4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 163, 74, 0.15)';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    Generate Reports →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
