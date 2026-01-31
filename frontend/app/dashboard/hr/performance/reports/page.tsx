/**
 * HR Performance Reports Page
 * REQ-OD-06, REQ-OD-08: Performance analytics, trends, and comprehensive reporting
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './reports.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface ReportData {
  summary: {
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    averageScore: number;
  };
  ratingDistribution: {
    excellent: number;
    good: number;
    satisfactory: number;
    needsImprovement: number;
    unsatisfactory: number;
  };
  departmentStats: Array<{
    departmentId: string;
    departmentName: string;
    total: number;
    completed: number;
    averageScore: number;
  }>;
  cycleTrends: Array<{
    cycleId: string;
    cycleName: string;
    startDate: string;
    endDate: string;
    totalAssignments: number;
    completedAssignments: number;
    averageScore: number;
  }>;
  recentAppraisals: any[];
}

export default function PerformanceReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReportData();
  }, [selectedCycle, selectedDepartment]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCycle) params.append('cycleId', selectedCycle);
      if (selectedDepartment) params.append('departmentId', selectedDepartment);
      
      const response = await axios.get(`/performance/reports/overview?${params}`);
      setReportData(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const generateCSV = () => {
    if (!reportData) return '';
    
    let csv = 'Performance Report\n\n';
    csv += 'Summary Statistics\n';
    csv += `Total Assignments,${reportData.summary.totalAssignments}\n`;
    csv += `Completed Assignments,${reportData.summary.completedAssignments}\n`;
    csv += `Completion Rate,${reportData.summary.completionRate.toFixed(2)}%\n`;
    csv += `Average Score,${reportData.summary.averageScore.toFixed(2)}\n\n`;
    
    csv += 'Department Statistics\n';
    csv += 'Department,Total,Completed,Average Score\n';
    reportData.departmentStats.forEach(dept => {
      csv += `${dept.departmentName},${dept.total},${dept.completed},${dept.averageScore.toFixed(2)}\n`;
    });
    
    return csv;
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.DEPARTMENT_HEAD]}>
        <Spinner message="Loading reports..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.DEPARTMENT_HEAD]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back
          </button>
          <div>
            <h1 className={styles.title}>Performance Reports & Analytics</h1>
            <p className={styles.subtitle}>Comprehensive performance insights and trends</p>
          </div>
          <div>
            <button className={styles.exportButton} onClick={handleExport}>
              Export Report
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Filter by Cycle:</label>
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className={styles.select}
            >
              <option value="">All Cycles</option>
              {reportData?.cycleTrends.map(cycle => (
                <option key={cycle.cycleId} value={cycle.cycleId}>
                  {cycle.cycleName}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Filter by Department:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className={styles.select}
            >
              <option value="">All Departments</option>
              {reportData?.departmentStats.map(dept => (
                <option key={dept.departmentId} value={dept.departmentId}>
                  {dept.departmentName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className={styles.summaryGrid}>
          <div className={styles.statCard}>
            <h3>Total Appraisals</h3>
            <p className={styles.statValue}>{reportData?.summary.totalAssignments || 0}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Completed</h3>
            <p className={styles.statValue}>{reportData?.summary.completedAssignments || 0}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Completion Rate</h3>
            <p className={styles.statValue}>
              {reportData?.summary.completionRate.toFixed(1) || 0}%
            </p>
          </div>
          <div className={styles.statCard}>
            <h3>Average Score</h3>
            <p className={styles.statValue}>
              {reportData?.summary.averageScore.toFixed(2) || 0}
            </p>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className={styles.section}>
          <h2>Rating Distribution</h2>
          <div className={styles.distributionGrid}>
            {[
              { key: 'excellent'as const, label: 'Excellent', color: '#059669' },
              { key: 'good'as const, label: 'Good', color: '#2563eb' },
              { key: 'satisfactory'as const, label: 'Satisfactory', color: '#f59e0b' },
              { key: 'needsImprovement'as const, label: 'Needs Improvement', color: '#ef4444' },
              { key: 'unsatisfactory'as const, label: 'Unsatisfactory', color: '#991b1b' },
            ].map(({ key, label, color }) => {
              const value = reportData?.ratingDistribution[key] || 0;
              const total = Object.values(reportData?.ratingDistribution || {}).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (value / total) * 100 : 0;
              
              return (
                <div key={key} className={styles.distributionItem}>
                  <div className={styles.distributionLabel}>
                    <span>{label}</span>
                    <span className={styles.distributionValue}>{value}</span>
                  </div>
                  <div className={styles.distributionBarBg}>
                    <div 
                      className={styles.distributionBarFill}
                      style={{ width: `${percentage}%`, background: color }}
                    />
                  </div>
                  <span className={styles.distributionPercent}>{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Performance */}
        <div className={styles.section}>
          <h2>Department Performance</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Completed</th>
                  <th>Completion %</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.departmentStats.map(dept => (
                  <tr key={dept.departmentId}>
                    <td>{dept.departmentName}</td>
                    <td>{dept.total}</td>
                    <td>{dept.completed}</td>
                    <td>
                      {dept.total > 0 ? ((dept.completed / dept.total) * 100).toFixed(1) : 0}%
                    </td>
                    <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>{dept.averageScore.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cycle Trends */}
        <div className={styles.section}>
          <h2>Cycle Performance Trends</h2>
          <div className={styles.trendsGrid}>
            {reportData?.cycleTrends.map(cycle => (
              <div key={cycle.cycleId} className={styles.trendCard}>
                <h3>{cycle.cycleName}</h3>
                <p className={styles.dateRange}>
                  {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                </p>
                <div className={styles.trendStats}>
                  <div>
                    <span className={styles.trendLabel}>Assignments:</span>
                    <span className={styles.trendValue}>{cycle.totalAssignments}</span>
                  </div>
                  <div>
                    <span className={styles.trendLabel}>Completed:</span>
                    <span className={styles.trendValue}>{cycle.completedAssignments}</span>
                  </div>
                  <div>
                    <span className={styles.trendLabel}>Avg Score:</span>
                    <span className={styles.trendValue}>{cycle.averageScore.toFixed(2)}</span>
                  </div>
                </div>
                <div className={styles.completionBar}>
                  <div 
                    className={styles.completionProgress}
                    style={{ 
                      width: `${cycle.totalAssignments > 0 ? (cycle.completedAssignments / cycle.totalAssignments) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}