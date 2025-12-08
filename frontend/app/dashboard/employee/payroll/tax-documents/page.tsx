"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './tax-documents.module.css';

interface Payslip {
  _id: string;
  payrollRunId: {
    runId: string;
    payrollPeriod: string;
  };
  totalGrossSalary: number;
  totaDeductions: number;
  netPay: number;
  earningsDetails: {
    baseSalary: number;
  };
  deductionsDetails: {
    taxes: Array<{ name: string; amount: number; rule?: string }>;
  };
  createdAt: string;
}

export default function TaxDocumentsPage() {
  const router = useRouter();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadPayslips();
  }, []);

  async function loadPayslips() {
    setLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await axios.get(`/payroll-execution/employees/${user.sub}/payslips`);
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

  const getAvailableYears = () => {
    const years = new Set<number>();
    payslips.forEach(p => {
      const year = new Date(p.createdAt).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getPayslipsForYear = (year: number) => {
    return payslips.filter(p => new Date(p.createdAt).getFullYear() === year);
  };

  const calculateAnnualTaxSummary = (year: number) => {
    const yearPayslips = getPayslipsForYear(year);
    
    const totalGross = yearPayslips.reduce((sum, p) => sum + p.totalGrossSalary, 0);
    const totalDeductions = yearPayslips.reduce((sum, p) => sum + p.totaDeductions, 0);
    const totalNet = yearPayslips.reduce((sum, p) => sum + p.netPay, 0);
    
    const totalTaxes = yearPayslips.reduce((sum, p) => {
      const taxes = p.deductionsDetails.taxes || [];
      return sum + taxes.reduce((taxSum, tax) => taxSum + tax.amount, 0);
    }, 0);

    // Group taxes by type
    const taxByType: Record<string, number> = {};
    yearPayslips.forEach(p => {
      const taxes = p.deductionsDetails.taxes || [];
      taxes.forEach(tax => {
        if (!taxByType[tax.name]) {
          taxByType[tax.name] = 0;
        }
        taxByType[tax.name] += tax.amount;
      });
    });

    return {
      totalGross,
      totalDeductions,
      totalNet,
      totalTaxes,
      taxByType,
      numberOfPayslips: yearPayslips.length,
    };
  };

  const downloadAnnualTaxStatement = (year: number) => {
    const summary = calculateAnnualTaxSummary(year);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const content = `
ANNUAL TAX STATEMENT ${year}
Generated: ${new Date().toLocaleDateString()}

Employee Information:
${user.firstName || ''} ${user.lastName || ''}

Annual Summary:
Total Gross Income: ${formatCurrency(summary.totalGross)}
Total Deductions: ${formatCurrency(summary.totalDeductions)}
Total Net Pay: ${formatCurrency(summary.totalNet)}
Total Taxes Paid: ${formatCurrency(summary.totalTaxes)}
Number of Payslips: ${summary.numberOfPayslips}

Tax Breakdown by Type:
${Object.entries(summary.taxByType).map(([type, amount]) => `${type}: ${formatCurrency(amount)}`).join('\n')}

This is a system-generated document.
For official tax purposes, please contact the HR department.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-statement-${year}.txt`;
    a.click();
  };

  const downloadMonthlyTaxBreakdown = (year: number) => {
    const yearPayslips = getPayslipsForYear(year);
    
    const headers = ['Month', 'Gross Salary', 'Total Taxes', 'Tax Types', 'Net Pay'];
    const rows = yearPayslips.map(p => {
      const month = new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const taxes = p.deductionsDetails.taxes || [];
      const totalTaxes = taxes.reduce((sum, tax) => sum + tax.amount, 0);
      const taxTypes = taxes.map(t => `${t.name}: ${formatCurrency(t.amount)}`).join(' | ');
      
      return [
        month,
        p.totalGrossSalary,
        totalTaxes,
        taxTypes,
        p.netPay,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-breakdown-${year}.csv`;
    a.click();
  };

  const availableYears = getAvailableYears();
  const summary = availableYears.length > 0 ? calculateAnnualTaxSummary(selectedYear) : null;

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="Tax Documents" role="Employee">
          <Spinner message="Loading tax documents..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Tax Documents" role="Employee">
        <div className={styles.container}>
          {/* Navigation */}
          <div className={styles.navigation}>
            <Link href="/dashboard/employee/payroll/my-payslips" className={styles.backLink}>
              ← Back to My Payslips
            </Link>
          </div>

          {/* Info Banner */}
          <div className={styles.infoBanner}>
            <div className={styles.infoIcon}>📄</div>
            <div className={styles.infoContent}>
              <h4>Tax Documents & Statements</h4>
              <p>
                Download your annual tax statements and monthly tax breakdowns. These documents summarize your
                earnings and tax deductions for the selected year. For official tax filing purposes, please
                contact the HR department.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Empty State */}
          {!error && availableYears.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <h3>No Tax Documents Available</h3>
              <p>You don't have any payslips yet. Tax documents will be available once you receive your first payslip.</p>
            </div>
          )}

          {/* Content */}
          {!error && availableYears.length > 0 && (
            <>
              {/* Year Selector */}
              <div className={styles.yearSelector}>
                <label className={styles.yearLabel}>Select Tax Year:</label>
                <select
                  className={styles.yearSelect}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Summary Cards */}
              {summary && (
                <>
                  <div className={styles.summarySection}>
                    <h3>Annual Summary for {selectedYear}</h3>
                    <div className={styles.summaryGrid}>
                      <div className={styles.summaryCard}>
                        <div className={styles.summaryIcon}>💰</div>
                        <div className={styles.summaryContent}>
                          <div className={styles.summaryLabel}>Total Gross Income</div>
                          <div className={styles.summaryValue}>{formatCurrency(summary.totalGross)}</div>
                        </div>
                      </div>
                      <div className={styles.summaryCard}>
                        <div className={styles.summaryIcon}>🧾</div>
                        <div className={styles.summaryContent}>
                          <div className={styles.summaryLabel}>Total Taxes Paid</div>
                          <div className={styles.summaryValue}>{formatCurrency(summary.totalTaxes)}</div>
                        </div>
                      </div>
                      <div className={styles.summaryCard}>
                        <div className={styles.summaryIcon}>💵</div>
                        <div className={styles.summaryContent}>
                          <div className={styles.summaryLabel}>Total Net Pay</div>
                          <div className={styles.summaryValue}>{formatCurrency(summary.totalNet)}</div>
                        </div>
                      </div>
                      <div className={styles.summaryCard}>
                        <div className={styles.summaryIcon}>📊</div>
                        <div className={styles.summaryContent}>
                          <div className={styles.summaryLabel}>Number of Payslips</div>
                          <div className={styles.summaryValue}>{summary.numberOfPayslips}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tax Breakdown */}
                  <div className={styles.taxBreakdownSection}>
                    <h3>Tax Breakdown by Type</h3>
                    <div className={styles.taxTable}>
                      <div className={styles.taxTableHeader}>
                        <div>Tax Type</div>
                        <div>Annual Amount</div>
                      </div>
                      {Object.entries(summary.taxByType).map(([type, amount]) => (
                        <div key={type} className={styles.taxTableRow}>
                          <div className={styles.taxType}>{type}</div>
                          <div className={styles.taxAmount}>{formatCurrency(amount)}</div>
                        </div>
                      ))}
                      <div className={styles.taxTableFooter}>
                        <div>Total Taxes</div>
                        <div>{formatCurrency(summary.totalTaxes)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Download Actions */}
                  <div className={styles.downloadSection}>
                    <h3>Download Documents</h3>
                    <div className={styles.downloadGrid}>
                      <div className={styles.downloadCard}>
                        <div className={styles.downloadIcon}>📥</div>
                        <div className={styles.downloadContent}>
                          <h4>Annual Tax Statement</h4>
                          <p>Complete tax summary for {selectedYear} including all earnings and deductions</p>
                          <button
                            className={styles.btnDownload}
                            onClick={() => downloadAnnualTaxStatement(selectedYear)}
                          >
                            Download Statement
                          </button>
                        </div>
                      </div>
                      <div className={styles.downloadCard}>
                        <div className={styles.downloadIcon}>📊</div>
                        <div className={styles.downloadContent}>
                          <h4>Monthly Tax Breakdown (CSV)</h4>
                          <p>Detailed month-by-month breakdown of taxes paid in {selectedYear}</p>
                          <button
                            className={styles.btnDownload}
                            onClick={() => downloadMonthlyTaxBreakdown(selectedYear)}
                          >
                            Download Breakdown
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Disclaimer */}
              <div className={styles.disclaimer}>
                <h4>⚠️ Important Notice</h4>
                <p>
                  These documents are for informational purposes only. For official tax filing and compliance,
                  please contact the HR department to obtain certified tax documents. The HR department can provide
                  Form 41 (salary tax certificate) and other official documents required for your tax return.
                </p>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
