"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './reports.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
type ReportType = 'taxes' | 'insurance' | 'benefits' | 'month-end' | 'year-end';

export default function FinanceReportsPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState<ReportType>('month-end');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  // Date range for taxes, insurance, benefits
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Month/Year for month-end
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Entity filter
  const [entity, setEntity] = useState('');

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const payload: any = { reportType };

      if (reportType === 'taxes' || reportType === 'insurance' || reportType === 'benefits') {
        if (!startDate || !endDate) {
          setError('Please select start and end dates');
          setLoading(false);
          return;
        }
        payload.startDate = startDate;
        payload.endDate = endDate;
      } else if (reportType === 'month-end') {
        payload.year = selectedYear;
        payload.month = selectedMonth;
      } else if (reportType === 'year-end') {
        payload.year = selectedYear;
      }

      if (entity) {
        payload.entity = entity;
      }

      const response = await axios.post('/payroll-tracking/reports/generate', payload);
      setReportData(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = '';
    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

    // Tax Report CSV
    if (reportData.reportType === 'taxes') {
      csvContent = 'Tax Report\n\n';
      csvContent += `Period,${reportData.period}\n`;
      csvContent += `Entity,${reportData.entity}\n`;
      csvContent += `Total Employees,${reportData.totalEmployees}\n`;
      csvContent += `Total Tax Collected,${reportData.totalTaxCollected}\n\n`;
      csvContent += 'Tax Name,Employee Count,Total Amount,Average Rate\n';
      reportData.taxBreakdown.forEach((item: any) => {
        csvContent += `${item.taxName},${item.employeeCount},${item.totalAmount},${item.averageRate}%\n`;
      });
    }

    // Insurance Report CSV
    else if (reportData.reportType === 'insurance') {
      csvContent = 'Insurance Contributions Report\n\n';
      csvContent += `Period,${reportData.period}\n`;
      csvContent += `Entity,${reportData.entity}\n`;
      csvContent += `Total Employees,${reportData.totalEmployees}\n`;
      csvContent += `Total Employee Contribution,${reportData.totalEmployeeContribution}\n`;
      csvContent += `Total Employer Contribution,${reportData.totalEmployerContribution}\n`;
      csvContent += `Total Insurance Contribution,${reportData.totalInsuranceContribution}\n\n`;
      csvContent += 'Insurance Name,Employee Count,Employee Contribution,Employer Contribution,Total Contribution,Avg Employee Rate,Avg Employer Rate\n';
      reportData.insuranceBreakdown.forEach((item: any) => {
        csvContent += `${item.insuranceName},${item.employeeCount},${item.employeeContribution},${item.employerContribution},${item.totalContribution},${item.averageEmployeeRate}%,${item.averageEmployerRate}%\n`;
      });
    }

    // Benefits Report CSV
    else if (reportData.reportType === 'benefits') {
      csvContent = 'Benefits Report\n\n';
      csvContent += `Period,${reportData.period}\n`;
      csvContent += `Entity,${reportData.entity}\n`;
      csvContent += `Total Employees,${reportData.totalEmployees}\n`;
      csvContent += `Total Benefits Paid,${reportData.totalBenefitsPaid}\n\n`;
      csvContent += 'Benefit Type,Benefit Name,Employee Count,Total Amount\n';
      reportData.benefitsBreakdown.forEach((item: any) => {
        csvContent += `${item.benefitType},${item.benefitName},${item.employeeCount},${item.totalAmount}\n`;
      });
    }

    // Month-End Report CSV
    else if (reportData.reportType === 'month-end') {
      csvContent = 'Month-End Summary\n\n';
      csvContent += `Period,${reportData.period}\n`;
      csvContent += `Entity,${reportData.entity}\n`;
      csvContent += `Total Employees,${reportData.totalEmployees}\n`;
      csvContent += `Payroll Runs,${reportData.payrollRuns}\n\n`;
      csvContent += 'Summary\n';
      csvContent += `Total Gross Salary,${reportData.totalGrossSalary}\n`;
      csvContent += `Total Deductions,${reportData.totalDeductions}\n`;
      csvContent += `Total Net Pay,${reportData.totalNetPay}\n\n`;
      csvContent += 'Tax Summary\n';
      csvContent += 'Tax Name,Total Amount\n';
      reportData.taxSummary.forEach((item: any) => {
        csvContent += `${item.taxName},${item.totalAmount}\n`;
      });
      csvContent += '\nInsurance Summary\n';
      csvContent += 'Insurance Name,Employee Contribution,Employer Contribution\n';
      reportData.insuranceSummary.forEach((item: any) => {
        csvContent += `${item.insuranceName},${item.employeeContribution},${item.employerContribution}\n`;
      });
      csvContent += '\nBenefits Summary\n';
      csvContent += `Allowances,${reportData.benefitsSummary.allowances}\n`;
      csvContent += `Bonuses,${reportData.benefitsSummary.bonuses}\n`;
      csvContent += `Benefits,${reportData.benefitsSummary.benefits}\n`;
      csvContent += `Refunds,${reportData.benefitsSummary.refunds}\n`;
    }

    // Year-End Report CSV
    else if (reportData.reportType === 'year-end') {
      csvContent = `Year-End Summary ${reportData.year}\n\n`;
      csvContent += `Entity,${reportData.entity}\n`;
      csvContent += `Total Employees,${reportData.totalEmployees}\n\n`;
      csvContent += 'Annual Totals\n';
      csvContent += `Total Gross Salary,${reportData.annualTotals.totalGrossSalary}\n`;
      csvContent += `Total Deductions,${reportData.annualTotals.totalDeductions}\n`;
      csvContent += `Total Net Pay,${reportData.annualTotals.totalNetPay}\n`;
      csvContent += `Total Taxes,${reportData.annualTotals.totalTaxes}\n`;
      csvContent += `Total Insurance,${reportData.annualTotals.totalInsurance}\n`;
      csvContent += `Total Benefits,${reportData.annualTotals.totalBenefits}\n\n`;
      csvContent += 'Monthly Breakdown\n';
      csvContent += 'Month,Employee Count,Gross Salary,Deductions,Net Pay,Payroll Runs\n';
      reportData.monthlyBreakdown.forEach((item: any) => {
        csvContent += `${item.monthName},${item.employeeCount},${item.totalGrossSalary},${item.totalDeductions},${item.totalNetPay},${item.payrollRuns}\n`;
      });
      csvContent += '\nAnnual Tax Summary\n';
      csvContent += 'Tax Name,Annual Total\n';
      reportData.taxSummary.forEach((item: any) => {
        csvContent += `${item.taxName},${item.annualTotal}\n`;
      });
      csvContent += '\nAnnual Insurance Summary\n';
      csvContent += 'Insurance Name,Annual Employee Contribution,Annual Employer Contribution\n';
      reportData.insuranceSummary.forEach((item: any) => {
        csvContent += `${item.insuranceName},${item.annualEmployeeContribution},${item.annualEmployerContribution}\n`;
      });
    }

    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Finance Reports" role="Finance Staff">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📊 Financial Reports</h1>
              <p className={styles.pageSubtitle}>
                Generate comprehensive payroll reports for taxes, insurance, benefits, and period summaries
              </p>
            </div>
          </div>

          {/* Report Configuration */}
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Report Configuration</h2>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Report Type</label>
                <select
                  className={styles.select}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                >
                  <option value="taxes">Tax Report</option>
                  <option value="insurance">Insurance Contributions Report</option>
                  <option value="benefits">Benefits Report</option>
                  <option value="month-end">Month-End Summary</option>
                  <option value="year-end">Year-End Summary</option>
                </select>
              </div>

              {(reportType === 'taxes' || reportType === 'insurance' || reportType === 'benefits') && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Start Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>End Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              {reportType === 'month-end' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Month</label>
                    <select
                      className={styles.select}
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                      {monthNames.map((name, idx) => (
                        <option key={idx} value={idx + 1}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Year</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      min={2020}
                      max={2050}
                    />
                  </div>
                </>
              )}

              {reportType === 'year-end' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Year</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    min={2020}
                    max={2050}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Entity (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  placeholder="Leave empty for all entities"
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={generateReport} disabled={loading}>
                {loading ? 'Generating...' : '📈 Generate Report'}
              </button>
              {reportData && (
                <button className={styles.btnSecondary} onClick={exportToCSV}>
                  📊 Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

          {/* Loading */}
          {loading && <Spinner message="Generating report..." />}

          {/* Report Display */}
          {reportData && !loading && (
            <div className={styles.reportContainer}>
              {/* Tax Report */}
              {reportData.reportType === 'taxes' && (
                <div className={styles.card}>
                  <h2 className={styles.reportTitle}>💰 Tax Report</h2>
                  <div className={styles.reportMeta}>
                    <p><strong>Period:</strong> {reportData.period}</p>
                    <p><strong>Entity:</strong> {reportData.entity}</p>
                    <p><strong>Total Employees:</strong> {reportData.totalEmployees}</p>
                    <p><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleString()}</p>
                  </div>

                  <div className={styles.summaryCard}>
                    <h3>Total Tax Collected</h3>
                    <p className={styles.totalAmount}>{formatCurrency(reportData.totalTaxCollected)}</p>
                  </div>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Tax Name</th>
                        <th>Employees</th>
                        <th>Total Amount</th>
                        <th>Average Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.taxBreakdown.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td>{item.taxName}</td>
                          <td>{item.employeeCount}</td>
                          <td>{formatCurrency(item.totalAmount)}</td>
                          <td>{item.averageRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Insurance Report */}
              {reportData.reportType === 'insurance' && (
                <div className={styles.card}>
                  <h2 className={styles.reportTitle}>🏥 Insurance Contributions Report</h2>
                  <div className={styles.reportMeta}>
                    <p><strong>Period:</strong> {reportData.period}</p>
                    <p><strong>Entity:</strong> {reportData.entity}</p>
                    <p><strong>Total Employees:</strong> {reportData.totalEmployees}</p>
                    <p><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleString()}</p>
                  </div>

                  <div className={styles.statsGrid}>
                    <div className={styles.summaryCard}>
                      <h3>Employee Contribution</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.totalEmployeeContribution)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Employer Contribution</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.totalEmployerContribution)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Total Contribution</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.totalInsuranceContribution)}</p>
                    </div>
                  </div>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Insurance Name</th>
                        <th>Employees</th>
                        <th>Employee Contribution</th>
                        <th>Employer Contribution</th>
                        <th>Total</th>
                        <th>Avg Employee Rate</th>
                        <th>Avg Employer Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.insuranceBreakdown.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td>{item.insuranceName}</td>
                          <td>{item.employeeCount}</td>
                          <td>{formatCurrency(item.employeeContribution)}</td>
                          <td>{formatCurrency(item.employerContribution)}</td>
                          <td>{formatCurrency(item.totalContribution)}</td>
                          <td>{item.averageEmployeeRate}%</td>
                          <td>{item.averageEmployerRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Benefits Report */}
              {reportData.reportType === 'benefits' && (
                <div className={styles.card}>
                  <h2 className={styles.reportTitle}>🎁 Benefits Report</h2>
                  <div className={styles.reportMeta}>
                    <p><strong>Period:</strong> {reportData.period}</p>
                    <p><strong>Entity:</strong> {reportData.entity}</p>
                    <p><strong>Total Employees:</strong> {reportData.totalEmployees}</p>
                    <p><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleString()}</p>
                  </div>

                  <div className={styles.summaryCard}>
                    <h3>Total Benefits Paid</h3>
                    <p className={styles.totalAmount}>{formatCurrency(reportData.totalBenefitsPaid)}</p>
                  </div>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Benefit Type</th>
                        <th>Benefit Name</th>
                        <th>Employees</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.benefitsBreakdown.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td><span className={styles.badge}>{item.benefitType}</span></td>
                          <td>{item.benefitName}</td>
                          <td>{item.employeeCount}</td>
                          <td>{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Month-End Report */}
              {reportData.reportType === 'month-end' && (
                <div className={styles.card}>
                  <h2 className={styles.reportTitle}>📅 Month-End Summary</h2>
                  <div className={styles.reportMeta}>
                    <p><strong>Period:</strong> {reportData.period}</p>
                    <p><strong>Entity:</strong> {reportData.entity}</p>
                    <p><strong>Total Employees:</strong> {reportData.totalEmployees}</p>
                    <p><strong>Payroll Runs:</strong> {reportData.payrollRuns}</p>
                    <p><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleString()}</p>
                  </div>

                  <div className={styles.statsGrid}>
                    <div className={styles.summaryCard}>
                      <h3>Gross Salary</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.totalGrossSalary)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Deductions</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.totalDeductions)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Net Pay</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.totalNetPay)}</p>
                    </div>
                  </div>

                  <div className={styles.reportSection}>
                    <h3>Tax Summary</h3>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Tax Name</th>
                          <th>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.taxSummary.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.taxName}</td>
                            <td>{formatCurrency(item.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.reportSection}>
                    <h3>Insurance Summary</h3>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Insurance Name</th>
                          <th>Employee Contribution</th>
                          <th>Employer Contribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.insuranceSummary.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.insuranceName}</td>
                            <td>{formatCurrency(item.employeeContribution)}</td>
                            <td>{formatCurrency(item.employerContribution)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.reportSection}>
                    <h3>Benefits Summary</h3>
                    <div className={styles.benefitsGrid}>
                      <div className={styles.benefitItem}>
                        <span>Allowances:</span>
                        <strong>{formatCurrency(reportData.benefitsSummary.allowances)}</strong>
                      </div>
                      <div className={styles.benefitItem}>
                        <span>Bonuses:</span>
                        <strong>{formatCurrency(reportData.benefitsSummary.bonuses)}</strong>
                      </div>
                      <div className={styles.benefitItem}>
                        <span>Benefits:</span>
                        <strong>{formatCurrency(reportData.benefitsSummary.benefits)}</strong>
                      </div>
                      <div className={styles.benefitItem}>
                        <span>Refunds:</span>
                        <strong>{formatCurrency(reportData.benefitsSummary.refunds)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Year-End Report */}
              {reportData.reportType === 'year-end' && (
                <div className={styles.card}>
                  <h2 className={styles.reportTitle}>📆 Year-End Summary {reportData.year}</h2>
                  <div className={styles.reportMeta}>
                    <p><strong>Entity:</strong> {reportData.entity}</p>
                    <p><strong>Total Employees:</strong> {reportData.totalEmployees}</p>
                    <p><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleString()}</p>
                  </div>

                  <div className={styles.statsGrid}>
                    <div className={styles.summaryCard}>
                      <h3>Annual Gross Salary</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.annualTotals.totalGrossSalary)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Annual Deductions</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.annualTotals.totalDeductions)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Annual Net Pay</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.annualTotals.totalNetPay)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Total Taxes</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.annualTotals.totalTaxes)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Total Insurance</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.annualTotals.totalInsurance)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <h3>Total Benefits</h3>
                      <p className={styles.totalAmount}>{formatCurrency(reportData.annualTotals.totalBenefits)}</p>
                    </div>
                  </div>

                  <div className={styles.reportSection}>
                    <h3>Monthly Breakdown</h3>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Employees</th>
                          <th>Gross Salary</th>
                          <th>Deductions</th>
                          <th>Net Pay</th>
                          <th>Runs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.monthlyBreakdown.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.monthName}</td>
                            <td>{item.employeeCount}</td>
                            <td>{formatCurrency(item.totalGrossSalary)}</td>
                            <td>{formatCurrency(item.totalDeductions)}</td>
                            <td>{formatCurrency(item.totalNetPay)}</td>
                            <td>{item.payrollRuns}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.reportSection}>
                    <h3>Annual Tax Summary</h3>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Tax Name</th>
                          <th>Annual Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.taxSummary.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.taxName}</td>
                            <td>{formatCurrency(item.annualTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.reportSection}>
                    <h3>Annual Insurance Summary</h3>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Insurance Name</th>
                          <th>Annual Employee Contribution</th>
                          <th>Annual Employer Contribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.insuranceSummary.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.insuranceName}</td>
                            <td>{formatCurrency(item.annualEmployeeContribution)}</td>
                            <td>{formatCurrency(item.annualEmployerContribution)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
