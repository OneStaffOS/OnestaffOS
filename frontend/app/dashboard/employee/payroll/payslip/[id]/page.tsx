"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './detail.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Payslip {
  _id: string;
  employeeId: string;
  payrollRunId: {
    _id: string;
    runId: string;
    payrollPeriod: string;
  };
  earningsDetails: {
    baseSalary: number;
    allowances: Array<{ name: string; amount: number }>;
    bonuses: Array<{ name: string; amount: number }>;
    benefits: Array<{ name: string; amount: number }>;
    refunds: Array<{ name: string; amount: number }>;
  };
  deductionsDetails: {
    taxes: Array<{ name: string; rate: number; description?: string }>;
    insurances: Array<{ name: string; employeeRate: number; minSalary: number; maxSalary: number }>;
    penalties?: {
      employeeId: string;
      penalties: Array<{ reason: string; amount: number }>;
    };
  };
  totalGrossSalary: number;
  totaDeductions: number;
  netPay: number;
  paymentStatus: string;
  createdAt: string;
}

interface User {
  sub: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PayslipDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [payslipId, setPayslipId] = useState<string>('');
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);

    params.then(p => {
      setPayslipId(p.id);
      loadPayslip(p.id);
    });
  }, [params]);

  async function loadPayslip(id: string) {
    setLoading(true);
    setError(null);
    try {
      // Get user from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!userData.sub) {
        setError('User session not found. Please login again.');
        return;
      }

      // Fetch all employee payslips and find the specific one
      const response = await axios.get(`/payroll-execution/employees/${userData.sub}/payslips`);
      console.log('API Response:', response.data);
      const payslips = response.data || [];
      console.log('Total payslips:', payslips.length);
      const foundPayslip = payslips.find((p: any) => p._id === id);
      console.log('Found payslip:', foundPayslip);
      
      if (!foundPayslip) {
        setError('Payslip not found');
      } else {
        setPayslip(foundPayslip);
      }
    } catch (e: any) {
      console.error('Error loading payslip:', e);
      setError(e?.response?.data?.message || 'Failed to load payslip');
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
      month: 'long',
      day: 'numeric',
    });
  };

  const downloadPayslip = () => {
    window.print();
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="Payslip Details" role="Employee">
          <Spinner message="Loading payslip details..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !payslip) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="Payslip Details" role="Employee">
          <div className={styles.container}>
            <div className={styles.errorMessage}>{error || 'Payslip not found'}</div>
            <Link href="/dashboard/employee/payroll/my-payslips" className={styles.backLink}>
              ← Back to My Payslips
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Payslip Details" role="Employee">
        <div className={styles.container}>
          {/* Navigation */}
          <div className={styles.navigation}>
            <Link href="/dashboard/employee/payroll/my-payslips" className={styles.backLink}>
              ← Back to My Payslips
            </Link>
            <div className={styles.actionButtons}>
              <button className={styles.btnDownload} onClick={downloadPayslip}>
                 Download / Print
              </button>
              <button
                className={styles.btnDispute}
                onClick={() => router.push(`/dashboard/employee/payroll/dispute?payslipId=${payslipId}`)}
              >
                 Dispute This Payslip
              </button>
            </div>
          </div>

          {/* Payslip Document */}
          <div className={styles.payslipDocument}>
            {/* Print-only Header */}
            <div className={styles.printHeader}>
              <div className={styles.printLogo}>
                <h1>ONE STAFF OS</h1>
                <p>Employee Payroll Management System</p>
              </div>
              <div className={styles.printMeta}>
                <p><strong>Document Type:</strong> Official Payslip</p>
                <p><strong>Print Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Header */}
            <div className={styles.docHeader}>
              <div className={styles.companyInfo}>
                <h1>One Staff OS</h1>
                <p>Payslip for {formatDate(payslip.payrollRunId.payrollPeriod)}</p>
              </div>
              <div className={styles.payslipId}>
                <strong>Payslip ID:</strong> {payslip.payrollRunId.runId}
                <br />
                <strong>Generated:</strong> {formatDate(payslip.createdAt)}
              </div>
            </div>

            {/* Employee Info */}
            <div className={styles.employeeInfo}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Employee:</span>
                  <span className={styles.infoValue}>
                    {user?.firstName} {user?.lastName}
                    {user?.employeeNumber && ` (${user.employeeNumber})`}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Payment Status:</span>
                  <span className={`${styles.infoValue} ${styles.statusBadge} ${
                    payslip.paymentStatus === 'paid' ? styles.statusPaid : styles.statusPending
                  }`}>
                    {payslip.paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Earnings Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}> Earnings</h3>
              
              {/* Base Salary - REQ-PY-3 */}
              <div className={styles.lineItem}>
                <span className={styles.itemLabel}>
                  Base Salary
                  <span className={styles.itemNote}>(According to employment contract)</span>
                </span>
                <span className={styles.itemAmount}>{formatCurrency(payslip.earningsDetails.baseSalary)}</span>
              </div>

              {/* Allowances - REQ-PY-7 */}
              {payslip.earningsDetails.allowances && payslip.earningsDetails.allowances.length > 0 && (
                <>
                  {payslip.earningsDetails.allowances.map((allowance, idx) => (
                    <div key={idx} className={styles.lineItem}>
                      <span className={styles.itemLabel}>
                        {allowance.name}
                        {allowance.name.toLowerCase().includes('transport') && (
                          <span className={styles.itemNote}>(Transportation / Commuting compensation)</span>
                        )}
                      </span>
                      <span className={styles.itemAmount}>{formatCurrency(allowance.amount)}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Bonuses */}
              {payslip.earningsDetails.bonuses && payslip.earningsDetails.bonuses.length > 0 && (
                <>
                  {payslip.earningsDetails.bonuses.map((bonus, idx) => (
                    <div key={idx} className={styles.lineItem}>
                      <span className={styles.itemLabel}>Bonus - {bonus.name}</span>
                      <span className={styles.itemAmount}>{formatCurrency(bonus.amount)}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Benefits - REQ-PY-5 */}
              {payslip.earningsDetails.benefits && payslip.earningsDetails.benefits.length > 0 && (
                <>
                  {payslip.earningsDetails.benefits.map((benefit, idx) => (
                    <div key={idx} className={styles.lineItem}>
                      <span className={styles.itemLabel}>
                        {benefit.name}
                        {benefit.name.toLowerCase().includes('leave') && (
                          <span className={styles.itemNote}>(Compensation for unused/encashed leave days)</span>
                        )}
                      </span>
                      <span className={styles.itemAmount}>{formatCurrency(benefit.amount)}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Refunds */}
              {payslip.earningsDetails.refunds && payslip.earningsDetails.refunds.length > 0 && (
                <>
                  {payslip.earningsDetails.refunds.map((refund, idx) => (
                    <div key={idx} className={styles.lineItem}>
                      <span className={styles.itemLabel}>Refund - {refund.name}</span>
                      <span className={styles.itemAmount}>{formatCurrency(refund.amount)}</span>
                    </div>
                  ))}
                </>
              )}

              <div className={styles.subtotal}>
                <span className={styles.subtotalLabel}>Total Gross Salary</span>
                <span className={styles.subtotalAmount}>{formatCurrency(payslip.totalGrossSalary)}</span>
              </div>
            </div>

            {/* Deductions Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}> Deductions</h3>

              {/* Taxes - REQ-PY-8 */}
              {payslip.deductionsDetails.taxes && payslip.deductionsDetails.taxes.length > 0 && (
                <>
                  <div className={styles.subsectionTitle}>Tax Deductions</div>
                  {payslip.deductionsDetails.taxes.map((tax, idx) => {
                    const taxAmount = (payslip.totalGrossSalary * tax.rate) / 100;
                    return (
                      <div key={idx} className={styles.lineItem}>
                        <span className={styles.itemLabel}>
                          {tax.name} ({tax.rate}%)
                          {tax.description && <span className={styles.itemNote}>({tax.description})</span>}
                        </span>
                        <span className={styles.itemAmount}>-{formatCurrency(taxAmount)}</span>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Insurance - REQ-PY-9 */}
              {payslip.deductionsDetails.insurances && payslip.deductionsDetails.insurances.length > 0 && (
                <>
                  <div className={styles.subsectionTitle}>Insurance Deductions</div>
                  {payslip.deductionsDetails.insurances.map((insurance, idx) => {
                    const insuranceAmount = (payslip.totalGrossSalary * insurance.employeeRate) / 100;
                    return (
                      <div key={idx} className={styles.lineItem}>
                        <span className={styles.itemLabel}>
                          {insurance.name} ({insurance.employeeRate}%)
                          <span className={styles.itemNote}>(Salary range: {formatCurrency(insurance.minSalary)} - {formatCurrency(insurance.maxSalary)})</span>
                        </span>
                        <span className={styles.itemAmount}>-{formatCurrency(insuranceAmount)}</span>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Penalties - REQ-PY-10, REQ-PY-11 */}
              {payslip.deductionsDetails.penalties && payslip.deductionsDetails.penalties.penalties && 
               payslip.deductionsDetails.penalties.penalties.length > 0 && (
                <>
                  <div className={styles.subsectionTitle}>Penalties & Deductions</div>
                  {payslip.deductionsDetails.penalties.penalties.map((penalty, idx) => (
                    <div key={idx} className={styles.lineItem}>
                      <span className={styles.itemLabel}>
                        {penalty.reason}
                        {penalty.reason.toLowerCase().includes('absent') && (
                          <span className={styles.itemNote}>(Unapproved absenteeism)</span>
                        )}
                        {penalty.reason.toLowerCase().includes('unpaid leave') && (
                          <span className={styles.itemNote}>(Unpaid leave days)</span>
                        )}
                      </span>
                      <span className={styles.itemAmount}>-{formatCurrency(penalty.amount)}</span>
                    </div>
                  ))}
                </>
              )}

              <div className={styles.subtotal}>
                <span className={styles.subtotalLabel}>Total Deductions</span>
                <span className={styles.subtotalAmount}>-{formatCurrency(payslip.totaDeductions)}</span>
              </div>
            </div>

            {/* Net Pay */}
            <div className={styles.netPaySection}>
              <span className={styles.netPayLabel}>NET PAY</span>
              <span className={styles.netPayAmount}>{formatCurrency(payslip.netPay)}</span>
            </div>

            {/* Footer Note */}
            <div className={styles.footerNote}>
              <p><strong>Note:</strong> This is a system-generated payslip. For any discrepancies or questions, please use the "Dispute This Payslip" button above.</p>
              <p>Generated on: {formatDate(payslip.createdAt)}</p>
            </div>

            {/* Print-only Footer */}
            <div className={styles.printFooter}>
              <div className={styles.printSignature}>
                <div className={styles.signatureLine}>
                  <div className={styles.signatureBox}>
                    <p>_______________________</p>
                    <p><strong>HR Manager Signature</strong></p>
                    <p>Date: _______________</p>
                  </div>
                  <div className={styles.signatureBox}>
                    <p>_______________________</p>
                    <p><strong>Employee Signature</strong></p>
                    <p>Date: _______________</p>
                  </div>
                </div>
              </div>
              <div className={styles.printDisclaimer}>
                <p><strong>CONFIDENTIAL:</strong> This document contains confidential information. Unauthorized disclosure is prohibited.</p>
                <p>Document ID: {payslip._id} | Generated: {formatDate(payslip.createdAt)}</p>
                <p>© {new Date().getFullYear()} One Staff OS. All rights reserved.</p>
              </div>
            </div>
          </div>

          {/* Additional Information - REQ-PY-14 */}
          <div className={styles.additionalInfo}>
            <h3> Employer Contributions & Benefits</h3>
            <p className={styles.infoText}>
              In addition to your net salary, your employer contributes to your insurance, pension, and other benefits.
              For detailed information about employer contributions, please contact the HR department.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}