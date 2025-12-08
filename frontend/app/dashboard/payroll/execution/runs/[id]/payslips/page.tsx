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
import styles from '../../../execution.module.css';

interface Payslip {
  _id: string;
  employeeId: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  totalGrossSalary: number;
  totaDeductions: number;
  netPay: number;
  paymentStatus: string;
  earningsDetails: {
    baseSalary: number;
    allowances: any[];
    bonuses: any[];
    benefits: any[];
  };
  deductionsDetails: {
    taxes: any[];
    insurances: any[];
    penalties: any[];
  };
}

export default function PayslipsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setRunId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (runId) {
      loadPayslips();
    }
  }, [runId]);

  async function loadPayslips() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/payroll-execution/runs/${runId}/payslips`);
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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Payslips" role="Payroll">
          <Spinner message="Loading payslips..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const totalGross = payslips.reduce((sum, p) => sum + p.totalGrossSalary, 0);
  const totalDeductions = payslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
  const totalNet = payslips.reduce((sum, p) => sum + p.netPay, 0);

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Payslips" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href={`/dashboard/payroll/execution/runs/${runId}`} className={styles.backLink}>
            ← Back to Payroll Run Details
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📄 Employee Payslips</h1>
              <p className={styles.pageSubtitle}>
                View detailed payslips for all employees in this payroll run
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{payslips.length}</span>
              <span className={styles.statLabel}>Total Payslips</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{formatCurrency(totalGross)}</span>
              <span className={styles.statLabel}>Total Gross Salary</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{formatCurrency(totalDeductions)}</span>
              <span className={styles.statLabel}>Total Deductions</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{formatCurrency(totalNet)}</span>
              <span className={styles.statLabel}>Total Net Pay</span>
            </div>
          </div>

          {/* Payslips Table */}
          <div className={styles.card}>
            {payslips.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>📄</div>
                <h3 className={styles.emptyStateTitle}>No Payslips Generated</h3>
                <p className={styles.emptyStateDescription}>
                  Payslips have not been generated for this payroll run yet.
                  Generate payslips after locking the payroll run.
                </p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee #</th>
                    <th>Base Salary</th>
                    <th>Allowances</th>
                    <th>Bonuses</th>
                    <th>Benefits</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((payslip) => (
                    <tr key={payslip._id}>
                      <td>
                        <strong>
                          {payslip.employeeId.firstName} {payslip.employeeId.lastName}
                        </strong>
                      </td>
                      <td>{payslip.employeeId.employeeNumber}</td>
                      <td>{formatCurrency(payslip.earningsDetails.baseSalary)}</td>
                      <td>
                        {payslip.earningsDetails.allowances?.length > 0
                          ? formatCurrency(
                              payslip.earningsDetails.allowances.reduce(
                                (sum, a) => sum + (a.amount || 0),
                                0
                              )
                            )
                          : '-'}
                      </td>
                      <td>
                        {payslip.earningsDetails.bonuses?.length > 0
                          ? formatCurrency(
                              payslip.earningsDetails.bonuses.reduce(
                                (sum, b) => sum + (b.amount || 0),
                                0
                              )
                            )
                          : '-'}
                      </td>
                      <td>
                        {payslip.earningsDetails.benefits?.length > 0
                          ? formatCurrency(
                              payslip.earningsDetails.benefits.reduce(
                                (sum, b) => sum + (b.amount || 0),
                                0
                              )
                            )
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detailed Breakdown */}
          {payslips.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Detailed Payslip Breakdown</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {payslips.map((payslip, index) => (
                  <details key={payslip._id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>
                      {payslip.employeeId.firstName} {payslip.employeeId.lastName} - {formatCurrency(payslip.netPay)}
                    </summary>
                    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                      {/* Earnings */}
                      <div>
                        <h4 style={{ margin: '0 0 12px 0', color: '#16a34a', fontSize: '14px' }}>
                          💰 Earnings
                        </h4>
                        <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Base Salary:</span>
                            <strong>{formatCurrency(payslip.earningsDetails.baseSalary)}</strong>
                          </div>
                          {payslip.earningsDetails.allowances?.map((a, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{a.name}:</span>
                              <strong>{formatCurrency(a.amount)}</strong>
                            </div>
                          ))}
                          {payslip.earningsDetails.bonuses?.map((b, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{b.name}:</span>
                              <strong>{formatCurrency(b.amount)}</strong>
                            </div>
                          ))}
                          {payslip.earningsDetails.benefits?.map((b, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{b.name}:</span>
                              <strong>{formatCurrency(b.amount)}</strong>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0', marginTop: '8px' }}>
                            <strong>Total Earnings:</strong>
                            <strong style={{ color: '#16a34a' }}>{formatCurrency(payslip.totalGrossSalary)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div>
                        <h4 style={{ margin: '0 0 12px 0', color: '#dc2626', fontSize: '14px' }}>
                          ➖ Deductions
                        </h4>
                        <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                          {payslip.deductionsDetails.taxes?.map((t, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Tax ({t.taxRate}%):</span>
                              <strong>{formatCurrency(t.amount)}</strong>
                            </div>
                          ))}
                          {payslip.deductionsDetails.insurances?.map((ins, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{ins.name}:</span>
                              <strong>{formatCurrency(ins.employeeContribution)}</strong>
                            </div>
                          ))}
                          {payslip.deductionsDetails.penalties?.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Penalty ({p.reason}):</span>
                              <strong>{formatCurrency(p.amount)}</strong>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0', marginTop: '8px' }}>
                            <strong>Total Deductions:</strong>
                            <strong style={{ color: '#dc2626' }}>{formatCurrency(payslip.totaDeductions || 0)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                      <strong>Net Pay:</strong>
                      <strong style={{ color: '#2563eb', fontSize: '18px' }}>{formatCurrency(payslip.netPay)}</strong>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
