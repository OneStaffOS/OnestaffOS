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
interface EmployeeDetail {
  employeeId: string;
  firstName: string;
  lastName: string;
  grossPay: number;
  netPay: number;
  hasBankAccount: boolean;
  hasValidBank: boolean;
  hasException: boolean;
  exceptionReason?: string;
}

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
  employees: number;
  exceptions: number;
  totalnetpay: number;
  payrollSpecialistId?: { firstName: string; lastName: string };
  createdAt: string;
}

export default function PayrollManagerExceptionsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRunsWithExceptions();
  }, []);

  async function loadRunsWithExceptions() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/payroll-execution/runs');
      const allRuns = response.data || [];
      // Filter runs that have exceptions
      const runsWithExceptions = allRuns.filter((r: PayrollRun) => r.exceptions > 0);
      setRuns(runsWithExceptions);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load payroll runs with exceptions');
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployeeDetails(run: PayrollRun) {
    setSelectedRun(run);
    setDetailsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/payroll-execution/runs/${run._id}/employee-details`);
      const details = response.data || [];
      // Filter to show only employees with exceptions
      const employeesWithExceptions = details.filter((e: EmployeeDetail) => e.hasException);
      setEmployeeDetails(employeesWithExceptions);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load employee details');
      setEmployeeDetails([]);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetailsView() {
    setSelectedRun(null);
    setEmployeeDetails([]);
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

  const totalExceptions = runs.reduce((sum, run) => sum + run.exceptions, 0);
  const totalEmployeesAffected = runs.reduce((sum, run) => sum + run.employees, 0);

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Resolve Escalated Exceptions" role="Payroll Manager">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader} style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            padding: '32px',
            borderRadius: '16px',
            marginBottom: '32px',
            color: 'white',
            boxShadow: '0 10px 30px rgba(220, 38, 38, 0.2)'
          }}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle} style={{ color: 'white', fontSize: '32px' }}>
                ⚠️ Escalated Exceptions Dashboard
              </h1>
              <p className={styles.pageSubtitle} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
                Review and resolve payroll exceptions that require manager-level intervention
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {runs.length}
              </span>
              <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                Runs With Exceptions
              </span>
            </div>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {totalExceptions}
              </span>
              <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                Total Exceptions
              </span>
            </div>
            <div className={styles.statCard} style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
              border: 'none'
            }}>
              <span className={styles.statValue} style={{ color: 'white' }}>
                {totalEmployeesAffected}
              </span>
              <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.9)' }}>
                Employees in These Runs
              </span>
            </div>
          </div>

          {/* Payroll Runs With Exceptions */}
          {loading ? (
            <Spinner message="Loading payroll runs with exceptions..." />
          ) : (
            <div className={styles.card} style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb',
              marginBottom: '32px'
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: '#1f2937'
              }}>
                📋 Payroll Runs Requiring Attention
              </h2>

              {runs.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>✅</div>
                  <h3 className={styles.emptyStateTitle}>No Exceptions Found</h3>
                  <p className={styles.emptyStateDescription}>
                    All payroll runs are currently exception-free. Great work!
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(to right, #fef3c7, #fef08a)' }}>
                      <th>Run ID</th>
                      <th>Period</th>
                      <th>Entity</th>
                      <th>Status</th>
                      <th>Exceptions</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const statusStyle = getStatusBadgeStyle(run.status);
                      const createdBy = run.payrollSpecialistId 
                        ? `${run.payrollSpecialistId.firstName} ${run.payrollSpecialistId.lastName}`
                        : 'Unknown';

                      return (
                        <tr key={run._id}>
                          <td>
                            <strong style={{ color: '#dc2626', fontSize: '15px' }}>
                              {run.runId}
                            </strong>
                          </td>
                          <td>{formatDate(run.payrollPeriod)}</td>
                          <td>{run.entity}</td>
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
                            <span style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '700'
                            }}>
                              ⚠️ {run.exceptions}
                            </span>
                          </td>
                          <td>{createdBy}</td>
                          <td>
                            <button
                              onClick={() => loadEmployeeDetails(run)}
                              style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                                color: 'white',
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                              }}
                            >
                              🔍 Review Exceptions
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Exception Details Modal */}
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
              zIndex: 1000,
              overflow: 'auto',
              padding: '20px'
            }}>
              <div style={{
                background: 'white',
                padding: '32px',
                borderRadius: '16px',
                maxWidth: '900px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                maxHeight: '90vh',
                overflow: 'auto'
              }}>
                {/* Modal Header */}
                <div style={{ 
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '700',
                    color: '#dc2626'
                  }}>
                    ⚠️ Exception Details: {selectedRun.runId}
                  </h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                    Period: {formatDate(selectedRun.payrollPeriod)} • Entity: {selectedRun.entity}
                  </p>
                </div>

                {/* Loading State */}
                {detailsLoading ? (
                  <Spinner message="Loading employee exceptions..." />
                ) : (
                  <>
                    {/* Exception Summary */}
                    <div style={{
                      background: 'linear-gradient(to right, #fef3c7, #fef08a)',
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '24px'
                    }}>
                      <strong style={{ fontSize: '14px', color: '#92400e' }}>
                        Total Exceptions: {employeeDetails.length}
                      </strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#78350f' }}>
                        The following employees have payroll exceptions requiring manager review
                      </p>
                    </div>

                    {/* Employees With Exceptions Table */}
                    {employeeDetails.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        No employee exception details available
                      </div>
                    ) : (
                      <table className={styles.table}>
                        <thead>
                          <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                            <th>Employee</th>
                            <th>Gross Pay</th>
                            <th>Net Pay</th>
                            <th>Bank Status</th>
                            <th>Exception Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeDetails.map((emp, idx) => (
                            <tr key={idx}>
                              <td>
                                <strong>{emp.firstName} {emp.lastName}</strong>
                                <br />
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                  ID: {emp.employeeId}
                                </span>
                              </td>
                              <td>{formatCurrency(emp.grossPay)}</td>
                              <td>
                                <strong style={{ color: '#16a34a' }}>
                                  {formatCurrency(emp.netPay)}
                                </strong>
                              </td>
                              <td>
                                {emp.hasBankAccount ? (
                                  emp.hasValidBank ? (
                                    <span style={{ color: '#16a34a', fontSize: '13px' }}>✅ Valid</span>
                                  ) : (
                                    <span style={{ color: '#dc2626', fontSize: '13px' }}>⚠️ Invalid</span>
                                  )
                                ) : (
                                  <span style={{ color: '#f59e0b', fontSize: '13px' }}>⚠️ Missing</span>
                                )}
                              </td>
                              <td>
                                <span style={{ 
                                  color: '#dc2626', 
                                  fontSize: '13px',
                                  fontStyle: 'italic'
                                }}>
                                  {emp.exceptionReason || 'No reason provided'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Manager Actions Guide */}
                    <div style={{
                      marginTop: '24px',
                      padding: '16px',
                      background: '#f0f9ff',
                      borderLeft: '4px solid #3b82f6',
                      borderRadius: '4px'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1e40af' }}>
                        💡 Recommended Actions:
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569' }}>
                        <li>Review each exception reason carefully</li>
                        <li>For missing/invalid bank accounts: Contact HR or employee directly</li>
                        <li>For calculation errors: Coordinate with Payroll Specialist to fix</li>
                        <li>If corrections needed: Unlock payroll run, make changes, then re-lock</li>
                        <li>Document all resolution actions in the audit log</li>
                      </ul>
                    </div>

                    {/* Close Button */}
                    <div style={{ marginTop: '24px', textAlign: 'right' }}>
                      <button
                        onClick={closeDetailsView}
                        style={{
                          padding: '10px 24px',
                          border: '1px solid #e2e8f0',
                          background: 'white',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Close
                      </button>
                    </div>
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
