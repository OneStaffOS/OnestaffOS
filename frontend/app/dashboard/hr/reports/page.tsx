/**
 * HR Admin - System Reports Page (Route: /hr/reports)
 * Generate and view employee and system reports
 * Phase III: HR/Admin Processing & Master Data
 */

'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './reports.module.css';

interface ReportData {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  suspendedEmployees: number;
  terminatedEmployees: number;
  departmentCounts: { department: string; count: number }[];
  recentHires: any[];
  recentTerminations: any[];
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('summary');

  const generateReport = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, employeesRes] = await Promise.all([
        axios.get('/employee-profile/admin/stats'),
        axios.get('/employee-profile')
      ]);

      const stats = statsRes.data;
      const employees = employeesRes.data;

      // Calculate department counts
      const deptCounts: { [key: string]: number } = {};
      employees.forEach((emp: any) => {
        const deptName = emp.primaryDepartmentId?.name;
        if (deptName) {
          deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
        }
      });

      const departmentCounts = Object.entries(deptCounts).map(([department, count]) => ({
        department,
        count: count as number
      }));

      // Get recent hires (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentHires = employees.filter((emp: any) => 
        new Date(emp.dateOfHire) > thirtyDaysAgo
      );

      // Get recent terminations
      const recentTerminations = employees.filter((emp: any) => 
        emp.status === 'TERMINATED' && emp.contractEndDate &&
        new Date(emp.contractEndDate) > thirtyDaysAgo
      );

      setReportData({
        totalEmployees: stats.totalUsers,
        activeEmployees: stats.activeEmployees,
        onLeaveEmployees: stats.onLeaveEmployees,
        suspendedEmployees: stats.suspendedEmployees,
        terminatedEmployees: employees.filter((e: any) => e.status === 'TERMINATED').length,
        departmentCounts,
        recentHires,
        recentTerminations
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = "Employee Summary Report\n\n";
    csvContent += "Metric,Count\n";
    csvContent += `Total Employees,${reportData.totalEmployees}\n`;
    csvContent += `Active Employees,${reportData.activeEmployees}\n`;
    csvContent += `On Leave,${reportData.onLeaveEmployees}\n`;
    csvContent += `Suspended,${reportData.suspendedEmployees}\n`;
    csvContent += `Terminated,${reportData.terminatedEmployees}\n\n`;
    
    csvContent += "Department,Employee Count\n";
    reportData.departmentCounts.forEach(dept => {
      csvContent += `${dept.department},${dept.count}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>System Reports</h1>
            <p className={styles.subtitle}>Generate and export employee and system reports</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.controls}>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className={styles.select}
          >
            <option value="summary">Employee Summary Report</option>
            <option value="department">Department Analysis</option>
            <option value="status">Status Breakdown</option>
            <option value="activity">Recent Activity Report</option>
          </select>
          <button
            onClick={generateReport}
            className={styles.generateButton}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {reportData && (
            <button onClick={exportToCSV} className={styles.exportButton}>
              Export to CSV
            </button>
          )}
        </div>

        {reportData && (
          <div className={styles.reportContainer}>
            <div className={styles.reportSection}>
              <h2>Employee Summary</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total Employees</div>
                  <div className={styles.statValue}>{reportData.totalEmployees}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Active</div>
                  <div className={styles.statValue}>{reportData.activeEmployees}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>On Leave</div>
                  <div className={styles.statValue}>{reportData.onLeaveEmployees}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Suspended</div>
                  <div className={styles.statValue}>{reportData.suspendedEmployees}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Terminated</div>
                  <div className={styles.statValue}>{reportData.terminatedEmployees}</div>
                </div>
              </div>
            </div>

            <div className={styles.reportSection}>
              <h2>Department Breakdown</h2>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Employee Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.departmentCounts
                      .sort((a, b) => b.count - a.count)
                      .map(dept => (
                        <tr key={dept.department}>
                          <td>{dept.department}</td>
                          <td>{dept.count}</td>
                          <td>
                            {((dept.count / reportData.totalEmployees) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.reportSection}>
              <h2>Recent Hires (Last 30 Days)</h2>
              {reportData.recentHires.length === 0 ? (
                <p className={styles.emptyState}>No recent hires</p>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Position</th>
                        <th>Department</th>
                        <th>Hire Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.recentHires.map((emp: any) => (
                        <tr key={emp._id}>
                          <td>{emp.employeeNumber || 'N/A'}</td>
                          <td>{emp.firstName} {emp.lastName}</td>
                          <td>{emp.primaryPositionId?.title || 'N/A'}</td>
                          <td>{emp.primaryDepartmentId?.name || 'N/A'}</td>
                          <td>{new Date(emp.dateOfHire).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.reportSection}>
              <h2>Recent Terminations (Last 30 Days)</h2>
              {reportData.recentTerminations.length === 0 ? (
                <p className={styles.emptyState}>No recent terminations</p>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Position</th>
                        <th>Department</th>
                        <th>End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.recentTerminations.map((emp: any) => (
                        <tr key={emp._id}>
                          <td>{emp.employeeNumber || 'N/A'}</td>
                          <td>{emp.firstName} {emp.lastName}</td>
                          <td>{emp.primaryPositionId?.title || 'N/A'}</td>
                          <td>{emp.primaryDepartmentId?.name || 'N/A'}</td>
                          <td>{new Date(emp.contractEndDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!reportData && !loading && (
          <div className={styles.placeholder}>
            <p>Click "Generate Report" to view the report data</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
