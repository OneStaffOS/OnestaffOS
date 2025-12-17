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
import styles from '../../finance.module.css';

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
  managerApprovalDate?: string;
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
  netPay: number;
  bankStatus: string;
  exceptions?: string;
}

export default function PayrollApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeePayrollDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [runId, setRunId] = useState<string>('');

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

  async function handleApprove() {
    if (!confirm(`Are you sure you want to approve disbursement of ${formatCurrency(run?.totalnetpay || 0)} for ${run?.employees} employees?`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/finance-approve`);
      setSuccess('✅ Payroll disbursement approved successfully!');
      setTimeout(() => {
        router.push('/dashboard/finance');
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to approve payroll disbursement');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    const reason = prompt('Please provide a reason for rejecting this disbursement:');
    if (!reason) return;

    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`/payroll-execution/runs/${runId}/reject`, { rejectionReason: reason });
      setSuccess('Payroll disbursement rejected');
      setTimeout(() => {
        router.push('/dashboard/finance');
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to reject payroll disbursement');
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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Payroll Approval" role="Finance Staff">
          <Spinner message="Loading payroll disbursement details..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!run) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Payroll Approval" role="Finance Staff">
          <div className={styles.container}>
            <div className={styles.errorMessage}>Payroll run not found</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const exceptionsEmployees = employeeDetails.filter(e => e.exceptions);
  const invalidBankAccounts = employeeDetails.filter(e => e.bankStatus !== 'valid');

  return (
    <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Review Payroll Disbursement" role="Finance Staff">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/finance" className={styles.backLink}>
            ← Back to Finance Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>
                💼 Review Payroll Disbursement: {run.runId}
              </h1>
              <p className={styles.pageSubtitle}>
                Payroll Period: {formatDate(run.payrollPeriod)} | {run.entity}
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Warnings */}
          {run.exceptions > 0 && (
            <div className={styles.errorMessage}>
              ⚠️ <strong>Warning:</strong> This payroll run has {run.exceptions} exception(s) that need review
            </div>
          )}
          {invalidBankAccounts.length > 0 && (
            <div className={styles.errorMessage}>
              ⚠️ <strong>Warning:</strong> {invalidBankAccounts.length} employee(s) have invalid bank account information
            </div>
          )}

          {/* Summary Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{run.employees}</span>
              <span className={styles.statLabel}>Total Employees</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: '#dc2626' }}>
                {formatCurrency(run.totalnetpay)}
              </span>
              <span className={styles.statLabel}>Total Disbursement</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: run.exceptions > 0 ? '#dc2626' : '#16a34a' }}>
                {run.exceptions}
              </span>
              <span className={styles.statLabel}>Exceptions</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: invalidBankAccounts.length > 0 ? '#f59e0b' : '#16a34a' }}>
                {employeeDetails.filter(e => e.bankStatus === 'valid').length}/{run.employees}
              </span>
              <span className={styles.statLabel}>Valid Bank Accounts</span>
            </div>
          </div>

          {/* Approval Details */}
          <div className={styles.card} style={{ marginBottom: '24px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              Approval Chain
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>Created By (Payroll Specialist)</div>
                <div style={{ fontWeight: '600' }}>
                  {run.payrollSpecialistId && typeof run.payrollSpecialistId === 'object'
                    ? `${run.payrollSpecialistId.firstName} ${run.payrollSpecialistId.lastName}`
                    : '-'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {formatDate(run.createdAt)}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>Approved By (HR Manager)</div>
                <div style={{ fontWeight: '600' }}>
                  {run.payrollManagerId && typeof run.payrollManagerId === 'object'
                    ? `${run.payrollManagerId.firstName} ${run.payrollManagerId.lastName}`
                    : '-'}
                </div>
                {run.managerApprovalDate && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {formatDate(run.managerApprovalDate)}
                  </div>
                )}
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>Finance Approval</div>
                <div style={{ fontWeight: '600', color: '#f59e0b' }}>Pending Your Review</div>
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div className={styles.card}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Employee Disbursement Details
              </h3>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee #</th>
                  <th>Base Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th>Bank Status</th>
                  <th>Bank Details</th>
                </tr>
              </thead>
              <tbody>
                {employeeDetails.map((detail) => (
                  <tr key={detail._id} style={{ 
                    background: detail.exceptions || detail.bankStatus !== 'valid' ? '#fef2f2' : 'transparent' 
                  }}>
                    <td>
                      <strong>
                        {detail.employeeId.firstName} {detail.employeeId.lastName}
                      </strong>
                      {detail.exceptions && (
                        <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                          ⚠️ {detail.exceptions}
                        </div>
                      )}
                    </td>
                    <td>{detail.employeeId.employeeNumber}</td>
                    <td>{formatCurrency(detail.baseSalary)}</td>
                    <td style={{ color: '#16a34a' }}>{formatCurrency(detail.allowances)}</td>
                    <td style={{ color: '#dc2626' }}>{formatCurrency(detail.deductions)}</td>
                    <td>
                      <strong style={{ color: '#2563eb', fontSize: '15px' }}>
                        {formatCurrency(detail.netPay)}
                      </strong>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: detail.bankStatus === 'valid' ? '#dcfce7' : '#fee2e2',
                        color: detail.bankStatus === 'valid' ? '#16a34a' : '#dc2626'
                      }}>
                        {detail.bankStatus}
                      </span>
                    </td>
                    <td>
                      {detail.employeeId.bankName && detail.employeeId.bankAccountNumber ? (
                        <div style={{ fontSize: '13px' }}>
                          <div>{detail.employeeId.bankName}</div>
                          <div style={{ color: '#64748b' }}>{detail.employeeId.bankAccountNumber}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#dc2626' }}>Not Provided</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className={styles.card} style={{ marginTop: '24px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              Finance Approval Decision
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
              Please review all employee disbursement details, bank information, and exceptions before approving.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className={styles.btnPrimary}
                onClick={handleApprove}
                disabled={actionLoading}
                style={{ padding: '14px 32px', fontSize: '15px' }}
              >
                {actionLoading ? '⏳ Processing...' : '✅ Approve Disbursement'}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                style={{
                  padding: '14px 32px',
                  fontSize: '15px',
                  background: 'white',
                  color: '#dc2626',
                  border: '1px solid #dc2626',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ❌ Reject
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => router.push('/dashboard/finance')}
                disabled={actionLoading}
                style={{ padding: '14px 32px', fontSize: '15px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
