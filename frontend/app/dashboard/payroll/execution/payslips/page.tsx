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
interface Payslip {
  _id: string;
  employeeId: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  payrollRunId: {
    runId: string;
    payrollPeriod: string;
  };
  totalGrossSalary: number;
  totaDeductions: number;
  netPay: number;
  paymentStatus: string;
  createdAt: string;
}

export default function AllPayslipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);

  const isEmployee = user?.roles?.includes(SystemRole.DEPARTMENT_EMPLOYEE);
  const isPayrollStaff = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST) || 
                         user?.roles?.includes(SystemRole.PAYROLL_MANAGER) ||
                         user?.roles?.includes(SystemRole.HR_MANAGER) ||
                         user?.roles?.includes(SystemRole.SYSTEM_ADMIN);

  useEffect(() => {
    if (user && user.sub && user.roles) {
      const isEmp = user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE);
      const isPayStaff = user.roles.includes(SystemRole.PAYROLL_SPECIALIST) || 
                         user.roles.includes(SystemRole.PAYROLL_MANAGER) ||
                         user.roles.includes(SystemRole.HR_MANAGER) ||
                         user.roles.includes(SystemRole.SYSTEM_ADMIN);
      
      if (isEmp) {
        loadEmployeePayslips();
      } else if (isPayStaff) {
        loadAllPayrollRuns();
      } else {
        setLoading(false);
      }
    } else if (user) {
      setLoading(false);
    }
  }, [user?.sub, user?.roles]);

  async function loadEmployeePayslips() {
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

  async function loadAllPayrollRuns() {
    setLoading(true);
    setError(null);
    try {
      // Load all locked payroll runs
      const runsResponse = await axios.get('/payroll-execution/runs?status=locked');
      const runs = runsResponse.data || [];
      setPayrollRuns(runs);
      
      // Fetch payslips for all locked runs
      const allPayslips: Payslip[] = [];
      for (const run of runs) {
        try {
          const payslipsResponse = await axios.get(`/payroll-execution/runs/${run._id}/payslips`);
          const runPayslips = payslipsResponse.data || [];
          allPayslips.push(...runPayslips);
        } catch (e) {
          console.error(`Failed to load payslips for run ${run.runId}`, e);
        }
      }
      setPayslips(allPayslips);
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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="My Payslips" role="Employee">
          <Spinner message="Loading payslips..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title={isEmployee ? "My Payslips" : "All Payslips"} role={isEmployee ? "Employee" : "Payroll"}>
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/execution" className={styles.backLink}>
            ← Back to Payroll Execution
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>
                 {isEmployee ? "My Payslips" : "All Payslips"}
              </h1>
              <p className={styles.pageSubtitle}>
                {isEmployee 
                  ? "View your salary statements and payment history"
                  : "View and manage all generated payslips"
                }
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}> {error}</div>}

          {/* For Employees: Show their payslips */}
          {isEmployee && (
            <>
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
                    <span className={styles.statLabel}>Paid</span>
                  </div>
                </div>
              )}

              {/* Payslips List */}
              <div className={styles.card}>
                {payslips.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}></div>
                    <h3 className={styles.emptyStateTitle}>No Payslips Available</h3>
                    <p className={styles.emptyStateDescription}>
                      Your payslips will appear here once payroll is processed
                    </p>
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Payroll Run</th>
                        <th>Period</th>
                        <th>Gross Salary</th>
                        <th>Deductions</th>
                        <th>Net Pay</th>
                        <th>Payment Status</th>
                        <th>Generated On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payslips.map((payslip) => (
                        <tr key={payslip._id}>
                          <td>
                            <strong style={{ color: '#2563eb' }}>
                              {payslip.payrollRunId?.runId || '-'}
                            </strong>
                          </td>
                          <td>
                            {payslip.payrollRunId?.payrollPeriod
                              ? formatDate(payslip.payrollRunId.payrollPeriod)
                              : '-'}
                          </td>
                          <td>
                            <strong style={{ color: '#16a34a' }}>
                              {formatCurrency(payslip.totalGrossSalary)}
                            </strong>
                          </td>
                          <td style={{ color: '#dc2626' }}>
                            {formatCurrency(payslip.totaDeductions || 0)}
                          </td>
                          <td>
                            <strong style={{ color: '#2563eb', fontSize: '15px' }}>
                              {formatCurrency(payslip.netPay)}
                            </strong>
                          </td>
                      <td>
                        <span
                          className={
                            payslip.paymentStatus === 'paid'
                              ? styles.badgePaid
                              : styles.badgePending
                          }
                        >
                          {payslip.paymentStatus}
                        </span>
                      </td>
                      <td>{formatDate(payslip.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* For Payroll Staff: Show all payslips from all locked runs */}
      {isPayrollStaff && (
        <>
          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{payslips.length}</span>
              <span className={styles.statLabel}>Total Payslips</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{payrollRuns.length}</span>
              <span className={styles.statLabel}>Locked Runs</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {formatCurrency(payslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0))}
              </span>
              <span className={styles.statLabel}>Total Gross Pay</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {formatCurrency(payslips.reduce((sum, p) => sum + (p.netPay || 0), 0))}
              </span>
              <span className={styles.statLabel}>Total Net Pay</span>
            </div>
          </div>

          {/* Show locked runs if no payslips */}
          {payslips.length === 0 && payrollRuns.length > 0 && (
            <div className={styles.card} style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#1e40af' }}>
                 Locked Payroll Runs ({payrollRuns.length})
              </h3>
              <p style={{ marginBottom: '15px', color: '#6b7280' }}>
                The following payroll runs are locked but don't have payslips generated yet. 
                Click on a run to generate payslips.
              </p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Period</th>
                    <th>Entity</th>
                    <th>Employees</th>
                    <th>Total Net Pay</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map((run) => (
                    <tr key={run._id}>
                      <td>
                        <strong style={{ color: '#2563eb' }}>{run.runId}</strong>
                      </td>
                      <td>{formatDate(run.payrollPeriod)}</td>
                      <td>{run.entity || '-'}</td>
                      <td>{run.employees || 0}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          {formatCurrency(run.totalnetpay || 0)}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={
                            run.paymentStatus === 'paid'
                              ? styles.badgePaid
                              : styles.badgePending
                          }
                        >
                          {run.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <button
                          className={styles.btnPrimary}
                          onClick={() => router.push(`/dashboard/payroll/execution/runs/${run._id}`)}
                        >
                          View Run →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payslips List */}
          <div className={styles.card}>
            {payslips.length === 0 && payrollRuns.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}></div>
                <h3 className={styles.emptyStateTitle}>No Locked Payroll Runs</h3>
                <p className={styles.emptyStateDescription}>
                  No locked payroll runs found. Lock and approve a payroll run first, then generate payslips.
                </p>
              </div>
            ) : payslips.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}></div>
                <h3 className={styles.emptyStateTitle}>No Payslips Generated Yet</h3>
                <p className={styles.emptyStateDescription}>
                  Payslips haven't been generated for the locked runs above. Click "View Run" and then "Generate Payslips".
                </p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee #</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((payslip) => (
                    <tr key={payslip._id}>
                      <td>
                        <strong>
                          {payslip.employeeId?.firstName} {payslip.employeeId?.lastName}
                        </strong>
                      </td>
                      <td>{payslip.employeeId?.employeeNumber || '-'}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          {formatCurrency(payslip.totalGrossSalary)}
                        </strong>
                      </td>
                      <td style={{ color: '#dc2626' }}>
                        {formatCurrency(payslip.totaDeductions || 0)}
                      </td>
                      <td>
                        <strong style={{ color: '#2563eb', fontSize: '15px' }}>
                          {formatCurrency(payslip.netPay)}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={
                            payslip.paymentStatus === 'paid'
                              ? styles.badgePaid
                              : styles.badgePending
                          }
                        >
                          {payslip.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => {
                            // Navigate to detailed payslip view if needed
                            alert('View payslip details for ' + payslip.employeeId?.firstName);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}