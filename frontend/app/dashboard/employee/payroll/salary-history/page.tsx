"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './history.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Payslip {
  _id: string;
  payrollRunId: {
    runId: string;
    payrollPeriod: string;
  };
  totalGrossSalary: number;
  totaDeductions: number;
  netPay: number;
  paymentStatus: string;
  createdAt: string;
  earningsDetails: {
    baseSalary: number;
  };
}

export default function SalaryHistoryPage() {
  const router = useRouter();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  useEffect(() => {
    loadPayslips();
  }, []);

  async function loadPayslips() {
    setLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await axios.get(`/payroll-execution/employees/${user.sub}/payslips`);
      const payslipsData = response.data || [];
      setPayslips(payslipsData);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load salary history');
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
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSortedPayslips = () => {
    const sorted = [...payslips];
    if (sortBy === 'date') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      sorted.sort((a, b) => b.netPay - a.netPay);
    }
    return sorted;
  };

  const calculateStats = () => {
    if (payslips.length === 0) {
      return {
        totalPaid: 0,
        averageNet: 0,
        highestNet: 0,
        lowestNet: 0,
        totalGross: 0,
        totalDeductions: 0,
      };
    }

    const paidPayslips = payslips.filter(p => p.paymentStatus === 'paid');
    const netPays = payslips.map(p => p.netPay);
    
    return {
      totalPaid: paidPayslips.reduce((sum, p) => sum + p.netPay, 0),
      averageNet: payslips.reduce((sum, p) => sum + p.netPay, 0) / payslips.length,
      highestNet: Math.max(...netPays),
      lowestNet: Math.min(...netPays),
      totalGross: payslips.reduce((sum, p) => sum + p.totalGrossSalary, 0),
      totalDeductions: payslips.reduce((sum, p) => sum + p.totaDeductions, 0),
    };
  };

  const exportToCSV = () => {
    const headers = ['Period', 'Gross Salary', 'Deductions', 'Net Pay', 'Status', 'Date'];
    const rows = getSortedPayslips().map(p => [
      formatDate(p.payrollRunId.payrollPeriod),
      p.totalGrossSalary,
      p.totaDeductions,
      p.netPay,
      p.paymentStatus,
      formatFullDate(p.createdAt),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = calculateStats();
  const sortedPayslips = getSortedPayslips();

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="Salary History" role="Employee">
          <Spinner message="Loading salary history..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Salary History" role="Employee">
        <div className={styles.container}>
          {/* Navigation */}
          <div className={styles.navigation}>
            <Link href="/dashboard/employee/payroll/my-payslips" className={styles.backLink}>
              ← Back to My Payslips
            </Link>
            <div className={styles.controls}>
              <button className={styles.btnExport} onClick={exportToCSV}>
                 Export to CSV
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Paid (All Time)</div>
                <div className={styles.statValue}>{formatCurrency(stats.totalPaid)}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Average Net Pay</div>
                <div className={styles.statValue}>{formatCurrency(stats.averageNet)}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Highest Net Pay</div>
                <div className={styles.statValue}>{formatCurrency(stats.highestNet)}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Lowest Net Pay</div>
                <div className={styles.statValue}>{formatCurrency(stats.lowestNet)}</div>
              </div>
            </div>
          </div>

          {/* View Controls */}
          <div className={styles.viewControls}>
            <div className={styles.viewTabs}>
              <button
                className={`${styles.viewTab} ${viewMode === 'table' ? styles.activeTab : ''}`}
                onClick={() => setViewMode('table')}
              >
                 Table View
              </button>
              <button
                className={`${styles.viewTab} ${viewMode === 'chart' ? styles.activeTab : ''}`}
                onClick={() => setViewMode('chart')}
              >
                 Chart View
              </button>
            </div>
            <div className={styles.sortControls}>
              <label className={styles.sortLabel}>Sort by:</label>
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              >
                <option value="date">Date (Newest First)</option>
                <option value="amount">Amount (Highest First)</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {error && <div className={styles.errorMessage}>{error}</div>}

          {!error && payslips.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}></div>
              <h3>No Salary History</h3>
              <p>You don't have any payslips yet.</p>
            </div>
          )}

          {!error && payslips.length > 0 && viewMode === 'table' && (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Base Salary</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPayslips.map((payslip) => (
                    <tr key={payslip._id}>
                      <td className={styles.tablePeriod}>{formatDate(payslip.payrollRunId.payrollPeriod)}</td>
                      <td className={styles.tableAmount}>{formatCurrency(payslip.earningsDetails.baseSalary)}</td>
                      <td className={styles.tableAmount}>{formatCurrency(payslip.totalGrossSalary)}</td>
                      <td className={styles.tableDeductions}>-{formatCurrency(payslip.totaDeductions)}</td>
                      <td className={styles.tableNetPay}>{formatCurrency(payslip.netPay)}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            payslip.paymentStatus === 'paid' ? styles.statusPaid : styles.statusPending
                          }`}
                        >
                          {payslip.paymentStatus}
                        </span>
                      </td>
                      <td className={styles.tableDate}>{formatFullDate(payslip.createdAt)}</td>
                      <td className={styles.tableActions}>
                        <button
                          className={styles.btnView}
                          onClick={() => router.push(`/dashboard/employee/payroll/payslip/${payslip._id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!error && payslips.length > 0 && viewMode === 'chart' && (
            <div className={styles.chartContainer}>
              <div className={styles.chartHeader}>
                <h3>Salary Trend Over Time</h3>
              </div>
              <div className={styles.chartContent}>
                {sortedPayslips.reverse().map((payslip, index) => {
                  const maxValue = Math.max(...payslips.map(p => p.totalGrossSalary));
                  const barHeight = (payslip.totalGrossSalary / maxValue) * 100;
                  
                  return (
                    <div key={payslip._id} className={styles.chartBar}>
                      <div className={styles.barContainer}>
                        <div
                          className={styles.barFill}
                          style={{ height: `${barHeight}%` }}
                          title={formatCurrency(payslip.totalGrossSalary)}
                        ></div>
                      </div>
                      <div className={styles.barLabel}>{formatDate(payslip.payrollRunId.payrollPeriod)}</div>
                      <div className={styles.barValue}>{formatCurrency(payslip.netPay)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {payslips.length > 0 && (
            <div className={styles.summarySection}>
              <h3>Summary Statistics</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Total Gross Earnings</div>
                  <div className={styles.summaryValue}>{formatCurrency(stats.totalGross)}</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Total Deductions</div>
                  <div className={styles.summaryValue}>-{formatCurrency(stats.totalDeductions)}</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Total Payslips</div>
                  <div className={styles.summaryValue}>{payslips.length}</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Paid Payslips</div>
                  <div className={styles.summaryValue}>
                    {payslips.filter(p => p.paymentStatus === 'paid').length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}