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
import styles from '../../execution.module.css';

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
  payrollSpecialistId?: { firstName: string; lastName: string };
  payrollManagerId?: { firstName: string; lastName: string };
  financeStaffId?: { firstName: string; lastName: string };
  rejectionReason?: string;
  managerApprovalDate?: string;
  financeApprovalDate?: string;
  createdAt: string;
}

interface EmployeePayrollDetail {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    bankName?: string;
    bankAccountNumber?: string;
  };
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  netPay: number;
  bankStatus: string;
  exceptions?: string;
  bonus?: number;
  benefit?: number;
}

export default function PayrollRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeePayrollDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [runId, setRunId] = useState<string>('');

  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isFinanceStaff = user?.roles.includes(SystemRole.FINANCE_STAFF);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  useEffect(() => {
    params.then(p => {
      setRunId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (runId) {
      loadPayrollRun();
    }
  }, [runId]);

  async function loadPayrollRun() {
    setLoading(true);
    setError(null);
    try {
      const [runResponse, detailsResponse] = await Promise.all([
        axios.get(`/payroll-execution/runs/${runId}`),
        axios.get(`/payroll-execution/runs/${runId}/employee-details`),
      ]);
      setRun(runResponse.data);
      setEmployeeDetails(detailsResponse.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load payroll run details');
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishForReview() {
    if (!confirm('Are you sure you want to publish this payroll run for manager review?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/publish`);
      setSuccess('Payroll run published for review successfully');
      await loadPayrollRun();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to publish payroll run');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!confirm('Are you sure you want to submit this payroll run for manager review?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/submit-for-review`);
      setSuccess('Payroll run submitted for manager review successfully');
      await loadPayrollRun();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit payroll run');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish() {
    if (!confirm('Are you sure you want to publish this payroll run for review?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/publish`);
      setSuccess('Payroll run published for review successfully');
      await loadPayrollRun();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to publish payroll run');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManagerApprove() {
    if (!confirm('Are you sure you want to approve this payroll run as Manager?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/manager-approve`);
      setSuccess('Payroll run approved by manager successfully');
      await loadPayrollRun();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to approve payroll run');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFinanceApprove() {
    if (!confirm('Are you sure you want to approve this payroll run as Finance?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/finance-approve`);
      setSuccess('Payroll run approved by finance successfully');
      await loadPayrollRun();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to approve payroll run');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/reject`, { rejectionReason: reason });
      setSuccess('Payroll run rejected');
      await loadPayrollRun();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to reject payroll run');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLock() {
    if (!confirm('Are you sure you want to lock this payroll run? This will prevent further edits.')) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/lock`);
      setSuccess('Payroll run locked successfully');
      await loadPayrollRun();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to lock payroll run');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGeneratePayslips() {
    if (!confirm('Are you sure you want to generate payslips for this locked payroll run?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/generate-payslips`);
      setSuccess('Payslips generated successfully! Redirecting...');
      setTimeout(() => {
        router.push(`/dashboard/payroll/execution/runs/${runId}/payslips`);
      }, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to generate payslips');
      setActionLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { 
      style: 'currency', 
      currency: 'EGP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Payroll Run Details" role="Payroll">
          <Spinner message="Loading payroll run details..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!run) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Payroll Run Details" role="Payroll">
          <div className={styles.container}>
            <div className={styles.errorMessage}>Payroll run not found</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const exceptionsEmployees = employeeDetails.filter(e => e.exceptions);

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Payroll Run Details" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/execution/runs" className={styles.backLink}>
            ← Back to Payroll Runs
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>
                💰 {run.runId}
              </h1>
              <p className={styles.pageSubtitle}>
                Payroll Period: {formatDate(run.payrollPeriod)} | {run.entity}
              </p>
            </div>
            <div className={styles.headerActions}>
              <span className={getStatusBadgeClass(run.status)}>
                {run.status}
              </span>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>✅ {success}</div>}

          {/* Rejection Reason */}
          {run.status === 'rejected' && run.rejectionReason && (
            <div className={styles.errorMessage}>
              <strong>❌ Rejection Reason:</strong> {run.rejectionReason}
            </div>
          )}

          {/* Exceptions Alert */}
          {run.exceptions > 0 && (
            <div className={styles.warningMessage}>
              ⚠️ This payroll run has {run.exceptions} exception(s) that need review before processing
            </div>
          )}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{run.employees}</span>
              <span className={styles.statLabel}>Total Employees</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{run.exceptions}</span>
              <span className={styles.statLabel}>Exceptions</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{formatCurrency(run.totalnetpay)}</span>
              <span className={styles.statLabel}>Total Net Pay</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {employeeDetails.filter(e => e.bankStatus === 'valid').length}
              </span>
              <span className={styles.statLabel}>Valid Bank Accounts</span>
            </div>
          </div>

          {/* Run Details */}
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionHeader}>Run Information</h3>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Run ID</span>
                <span className={styles.detailValue}>{run.runId}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Period End Date</span>
                <span className={styles.detailValue}>{formatDate(run.payrollPeriod)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Entity</span>
                <span className={styles.detailValue}>{run.entity}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Created By</span>
                <span className={styles.detailValue}>
                  {run.payrollSpecialistId 
                    ? `${run.payrollSpecialistId.firstName} ${run.payrollSpecialistId.lastName}`
                    : '-'}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Approved By (Manager)</span>
                <span className={styles.detailValue}>
                  {run.payrollManagerId 
                    ? `${run.payrollManagerId.firstName} ${run.payrollManagerId.lastName}`
                    : 'Pending'}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Approved By (Finance)</span>
                <span className={styles.detailValue}>
                  {run.financeStaffId 
                    ? `${run.financeStaffId.firstName} ${run.financeStaffId.lastName}`
                    : 'Pending'}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Payment Status</span>
                <span className={styles.detailValue}>
                  <span className={run.paymentStatus === 'paid' ? styles.badgePaid : styles.badgePending}>
                    {run.paymentStatus}
                  </span>
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Created At</span>
                <span className={styles.detailValue}>{formatDate(run.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Exceptions Section */}
          {exceptionsEmployees.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>⚠️ Exceptions ({exceptionsEmployees.length})</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee Number</th>
                    <th>Exceptions</th>
                    <th>Net Pay</th>
                    <th>Bank Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptionsEmployees.map((detail) => (
                    <tr key={detail._id}>
                      <td>
                        {detail.employeeId.firstName} {detail.employeeId.lastName}
                      </td>
                      <td>{detail.employeeId.employeeNumber}</td>
                      <td>
                        <span className={styles.exceptionBadge}>
                          {detail.exceptions}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: detail.netPay < 0 ? '#dc2626' : '#16a34a' }}>
                          {formatCurrency(detail.netPay)}
                        </strong>
                      </td>
                      <td>
                        <span className={detail.bankStatus === 'valid' ? styles.badgeApproved : styles.badgeRejected}>
                          {detail.bankStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Employee Details */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Employee Payroll Details</h2>
            </div>
            {employeeDetails.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>👥</div>
                <h3 className={styles.emptyStateTitle}>No Employee Details Found</h3>
                <p className={styles.emptyStateDescription}>
                  Employee payroll details will appear here once calculated
                </p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee #</th>
                    <th>Base Salary</th>
                    <th>Allowances</th>
                    <th>Bonus</th>
                    <th>Benefits</th>
                    <th>Deductions</th>
                    <th>Attendance Deduction</th>
                    <th>Leave Deduction</th>
                    <th>Net Pay</th>
                    <th>Bank Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeDetails.map((detail) => {
                    // Parse attendance and leave deductions from exceptions string
                    const parseAttendanceDeduction = (exceptions?: string): number => {
                      if (!exceptions) return 0;
                      const match = exceptions.match(/(\d+(?:\.\d+)?)\s*absent\s+days.*?\((\d+(?:\.\d+)?)\s+deducted\)/i);
                      return match ? parseFloat(match[2]) : 0;
                    };

                    const parseLeaveDeduction = (exceptions?: string): number => {
                      if (!exceptions) return 0;
                      const match = exceptions.match(/(\d+(?:\.\d+)?)\s+unpaid\s+leave\s+days.*?\((\d+(?:\.\d+)?)\s+deducted\)/i);
                      return match ? parseFloat(match[2]) : 0;
                    };

                    const attendanceDeduction = parseAttendanceDeduction(detail.exceptions);
                    const leaveDeduction = parseLeaveDeduction(detail.exceptions);

                    return (
                      <tr key={detail._id}>
                        <td>
                          <strong>
                            {detail.employeeId.firstName} {detail.employeeId.lastName}
                          </strong>
                        </td>
                        <td>{detail.employeeId.employeeNumber}</td>
                        <td>{formatCurrency(detail.baseSalary)}</td>
                        <td>{formatCurrency(detail.allowances)}</td>
                        <td>{detail.bonus ? formatCurrency(detail.bonus) : '-'}</td>
                        <td>{detail.benefit ? formatCurrency(detail.benefit) : '-'}</td>
                        <td style={{ color: '#dc2626' }}>{formatCurrency(detail.deductions)}</td>
                        <td style={{ color: '#dc2626' }}>
                          {attendanceDeduction > 0 ? formatCurrency(attendanceDeduction) : '-'}
                        </td>
                        <td style={{ color: '#dc2626' }}>
                          {leaveDeduction > 0 ? formatCurrency(leaveDeduction) : '-'}
                        </td>
                        <td>
                          <strong style={{ color: '#16a34a' }}>
                            {formatCurrency(detail.netPay)}
                          </strong>
                        </td>
                        <td>
                          <span className={detail.bankStatus === 'valid' ? styles.badgeApproved : styles.badgeRejected}>
                            {detail.bankStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>              </div>            )}
          </div>

          {/* Actions Section */}
          <div className={styles.actionSection}>
            {/* Specialist Submit for Manager Review */}
            {isPayrollSpecialist && run.status === 'draft' && (
              <button
                className={styles.btnPrimary}
                onClick={handleSubmitForReview}
                disabled={actionLoading}
              >
                📤 Submit for Manager Review
              </button>
            )}

            {/* Manager Publish to Finance */}
            {isPayrollManager && run.status === 'under review' && (
              <button
                className={styles.btnPrimary}
                onClick={handlePublish}
                disabled={actionLoading}
              >
                📤 Send to Finance for Approval
              </button>
            )}

            {/* Finance Final Approval - Only Finance Staff can approve/reject */}
            {(isFinanceStaff || isSystemAdmin) && run.status === 'pending finance approval' && (
              <>
                <button
                  className={styles.btnSuccess}
                  onClick={handleFinanceApprove}
                  disabled={actionLoading}
                >
                  ✅ Approve (Finance)
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  ❌ Reject
                </button>
              </>
            )}

            {/* Lock Action */}
            {(isPayrollManager || isSystemAdmin) && run.status === 'approved' && (
              <button
                className={styles.btnWarning}
                onClick={handleLock}
                disabled={actionLoading}
              >
                🔒 Lock Payroll Run
              </button>
            )}

            {/* Generate Payslips */}
            {(isPayrollSpecialist || isPayrollManager) && run.status === 'locked' && run.paymentStatus === 'paid' && (
              <button
                className={styles.btnPrimary}
                onClick={handleGeneratePayslips}
                disabled={actionLoading}
              >
                📄 Generate Payslips
              </button>
            )}

            {/* View Payslips */}
            {run.status === 'locked' && (
              <button
                className={styles.btnSecondary}
                onClick={() => router.push(`/dashboard/payroll/execution/runs/${runId}/payslips`)}
              >
                👁️ View Payslips
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
