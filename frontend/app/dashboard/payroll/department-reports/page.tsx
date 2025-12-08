"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './reports.module.css';

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface DepartmentReport {
  reportType: 'department-payroll';
  department: {
    id: string;
    name: string;
    code: string;
  };
  period: string;
  totalEmployees: number;
  salaryDistribution: {
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetPay: number;
    averageGrossSalary: number;
    averageNetPay: number;
    highestSalary: number;
    lowestSalary: number;
  };
  employeeBreakdown: Array<{
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetPay: number;
    payslipsCount: number;
  }>;
  budgetAnalysis: {
    totalPayrollCost: number;
    taxesPaid: number;
    insurancePaid: number;
    benefitsPaid: number;
  };
  generatedAt: Date;
}

export default function DepartmentReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<DepartmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDepartments();
    
    // Set default date range (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  async function loadDepartments() {
    try {
      const response = await axios.get('/payroll-tracking/reports/departments');
      setDepartments(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load departments');
    }
  }

  async function generateReport() {
    if (!selectedDepartment || !startDate || !endDate) {
      setError('Please select department and date range');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await axios.post('/payroll-tracking/reports/department', {
        departmentId: selectedDepartment,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });
      setReport(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!report) return;

    const rows: string[] = [];
    
    // Header
    rows.push(`Department Payroll Report`);
    rows.push(`Department: ${report.department.name} (${report.department.code})`);
    rows.push(`Period: ${report.period}`);
    rows.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    rows.push('');

    // Summary
    rows.push('SALARY DISTRIBUTION');
    rows.push(`Total Employees,${report.totalEmployees}`);
    rows.push(`Total Gross Salary,${report.salaryDistribution.totalGrossSalary.toFixed(2)}`);
    rows.push(`Total Deductions,${report.salaryDistribution.totalDeductions.toFixed(2)}`);
    rows.push(`Total Net Pay,${report.salaryDistribution.totalNetPay.toFixed(2)}`);
    rows.push(`Average Gross Salary,${report.salaryDistribution.averageGrossSalary.toFixed(2)}`);
    rows.push(`Average Net Pay,${report.salaryDistribution.averageNetPay.toFixed(2)}`);
    rows.push(`Highest Salary,${report.salaryDistribution.highestSalary.toFixed(2)}`);
    rows.push(`Lowest Salary,${report.salaryDistribution.lowestSalary.toFixed(2)}`);
    rows.push('');

    // Budget Analysis
    rows.push('BUDGET ANALYSIS');
    rows.push(`Total Payroll Cost,${report.budgetAnalysis.totalPayrollCost.toFixed(2)}`);
    rows.push(`Taxes Paid,${report.budgetAnalysis.taxesPaid.toFixed(2)}`);
    rows.push(`Insurance Paid,${report.budgetAnalysis.insurancePaid.toFixed(2)}`);
    rows.push(`Benefits Paid,${report.budgetAnalysis.benefitsPaid.toFixed(2)}`);
    rows.push('');

    // Employee Breakdown
    rows.push('EMPLOYEE BREAKDOWN');
    rows.push('Employee Code,Employee Name,Payslips Count,Gross Salary,Deductions,Net Pay');
    report.employeeBreakdown.forEach(emp => {
      rows.push(`${emp.employeeCode},${emp.employeeName},${emp.payslipsCount},${emp.totalGrossSalary.toFixed(2)},${emp.totalDeductions.toFixed(2)},${emp.totalNetPay.toFixed(2)}`);
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Department_Report_${report.department.code}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Department Payroll Reports" role="Payroll">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📊 Department Payroll Reports</h1>
              <p className={styles.pageSubtitle}>
                Analyze salary distribution and budget alignment by department
              </p>
            </div>
            <button 
              className={styles.btnSecondary}
              onClick={() => router.push('/dashboard/payroll')}
            >
              ← Back to Payroll
            </button>
          </div>

          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

          {/* Configuration Panel */}
          <div className={styles.configPanel}>
            <h3 className={styles.configTitle}>Report Configuration</h3>
            <div className={styles.configGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Department *</label>
                <select 
                  className={styles.select}
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Start Date *</label>
                <input 
                  type="date"
                  className={styles.input}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>End Date *</label>
                <input 
                  type="date"
                  className={styles.input}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>&nbsp;</label>
                <button 
                  className={styles.btnPrimary}
                  onClick={generateReport}
                  disabled={loading || !selectedDepartment || !startDate || !endDate}
                >
                  {loading ? 'Generating...' : '📊 Generate Report'}
                </button>
              </div>
            </div>
          </div>

          {loading && <Spinner message="Generating department report..." />}

          {/* Report Display */}
          {report && !loading && (
            <div className={styles.reportContainer}>
              {/* Report Header */}
              <div className={styles.reportHeader}>
                <div>
                  <h2 className={styles.reportTitle}>
                    {report.department.name} ({report.department.code})
                  </h2>
                  <p className={styles.reportPeriod}>{report.period}</p>
                </div>
                <button className={styles.btnExport} onClick={exportToCSV}>
                  📥 Export to CSV
                </button>
              </div>

              {/* Summary Cards */}
              <div className={styles.statsGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.cardIcon}>👥</div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardLabel}>Total Employees</div>
                    <div className={styles.cardValue}>{report.totalEmployees}</div>
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.cardIcon}>💰</div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardLabel}>Total Gross Salary</div>
                    <div className={styles.cardValue}>
                      ${report.salaryDistribution.totalGrossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.cardIcon}>💵</div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardLabel}>Total Net Pay</div>
                    <div className={styles.cardValue}>
                      ${report.salaryDistribution.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.cardIcon}>📊</div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardLabel}>Average Salary</div>
                    <div className={styles.cardValue}>
                      ${report.salaryDistribution.averageGrossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary Distribution */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Salary Distribution Analysis</h3>
                <div className={styles.distributionGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Highest Salary:</span>
                    <span className={styles.statValue}>
                      ${report.salaryDistribution.highestSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Lowest Salary:</span>
                    <span className={styles.statValue}>
                      ${report.salaryDistribution.lowestSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total Deductions:</span>
                    <span className={styles.statValue}>
                      ${report.salaryDistribution.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Average Net Pay:</span>
                    <span className={styles.statValue}>
                      ${report.salaryDistribution.averageNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Budget Analysis */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Budget Analysis</h3>
                <div className={styles.budgetGrid}>
                  <div className={styles.budgetCard}>
                    <div className={styles.budgetLabel}>Total Payroll Cost</div>
                    <div className={styles.budgetValue}>
                      ${report.budgetAnalysis.totalPayrollCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={styles.budgetCard}>
                    <div className={styles.budgetLabel}>Taxes Paid</div>
                    <div className={styles.budgetValue}>
                      ${report.budgetAnalysis.taxesPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={styles.budgetCard}>
                    <div className={styles.budgetLabel}>Insurance Paid</div>
                    <div className={styles.budgetValue}>
                      ${report.budgetAnalysis.insurancePaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={styles.budgetCard}>
                    <div className={styles.budgetLabel}>Benefits Paid</div>
                    <div className={styles.budgetValue}>
                      ${report.budgetAnalysis.benefitsPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee Breakdown Table */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Employee Breakdown</h3>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Employee Code</th>
                        <th>Employee Name</th>
                        <th>Payslips</th>
                        <th>Gross Salary</th>
                        <th>Deductions</th>
                        <th>Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.employeeBreakdown.map((emp, idx) => (
                        <tr key={idx}>
                          <td>{emp.employeeCode}</td>
                          <td>{emp.employeeName}</td>
                          <td>{emp.payslipsCount}</td>
                          <td>${emp.totalGrossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>${emp.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>${emp.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
