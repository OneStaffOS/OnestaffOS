/**
 * HR Manager Performance Dashboard
 * REQ-AE-10: Consolidated dashboard tracking appraisal completion across departments
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './dashboard.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Cycle {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  total: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  published: number;
}

interface Assignment {
  _id: string;
  cycleId: any;
  employeeProfileId: any;
  managerProfileId: any;
  departmentId: any;
  templateId: any;
  status: string;
  assignedAt: string;
  dueDate?: string;
  submittedAt?: string;
  publishedAt?: string;
  latestAppraisalId?: string;
}

interface DashboardData {
  cycles: Cycle[];
  overall: {
    total: number;
    notStarted: number;
    inProgress: number;
    submitted: number;
    published: number;
  };
  departmentStats: DepartmentStats[];
  assignments: Assignment[];
}

export default function HRPerformanceDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [selectedCycle]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const url = selectedCycle 
        ? `/performance/dashboard/hr-admin?cycleId=${selectedCycle}`
        : '/performance/dashboard/hr-admin';
      const response = await axios.get(url);
      setDashboardData(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getCompletionPercentage = (stats: { total: number; published: number }) => {
    if (stats.total === 0) return 0;
    return Math.round((stats.published / stats.total) * 100);
  };

  const getProgressPercentage = (stats: { total: number; submitted: number; published: number }) => {
    if (stats.total === 0) return 0;
    return Math.round(((stats.submitted + stats.published) / stats.total) * 100);
  };

  const handlePublishDepartment = async (departmentId: string) => {
    if (!confirm('Publish all submitted appraisals for this department?')) return;
    
    try {
      await axios.post(`/performance/assignments/publish-bulk`, {
        cycleId: selectedCycle,
        departmentId,
      });
      alert('Appraisals published successfully');
      fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish appraisals');
    }
  };

  const handleSendReminders = async (departmentId?: string) => {
    const message = departmentId 
      ? 'Send reminders to all pending appraisals in this department?'
      : 'Send reminders to all pending appraisals?';
    
    if (!confirm(message)) return;
    
    try {
      const payload: { cycleId?: string; departmentId?: string } = {};
      
      if (selectedCycle) {
        payload.cycleId = selectedCycle;
      }
      
      if (departmentId) {
        payload.departmentId = departmentId;
      }
      
      await axios.post('/performance/reminders/send', payload);
      alert('Reminders sent successfully to all pending appraisals');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send reminders');
    }
  };

  const handleViewCycle = (cycleId: string) => {
    router.push(`/hr/performance/cycles/${cycleId}`);
  };

  const handleCreateTemplate = () => {
    router.push('/hr/performance/templates/create');
  };

  const handleCreateCycle = () => {
    router.push('/hr/performance/cycles/create');
  };

  const handleBulkAssign = () => {
    if (!selectedCycle) {
      alert('Please select a cycle first');
      return;
    }
    router.push(`/hr/performance/cycles/${selectedCycle}/assign`);
  };

  const handleExportReport = async () => {
    try {
      const url = selectedCycle 
        ? `/performance/reports/progress?cycleId=${selectedCycle}`
        : '/performance/reports/progress';
      window.open(url, '_blank');
    } catch (err: any) {
      alert('Failed to export report');
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER,Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      {loading ? (
        <Spinner fullScreen message="Loading dashboard..." />
      ) : (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Performance Dashboard</h1>
            <p className={styles.subtitle}>Track appraisal completion across departments</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.secondaryButton}
              onClick={handleCreateTemplate}
            >
              + Template
            </button>
            <button
              className={styles.secondaryButton}
              onClick={handleCreateCycle}
            >
              + Cycle
            </button>
            <button
              className={styles.primaryButton}
              onClick={() => router.push('/hr/performance/cycles')}
            >
              Manage Cycles
            </button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Cycle Filter and Quick Actions */}
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label htmlFor="cycle" className={styles.filterLabel}>
              Filter by Cycle:
            </label>
            <select
              id="cycle"
              className={styles.filterSelect}
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
            >
              <option value="">All Cycles</option>
              {dashboardData?.cycles.map((cycle) => (
                <option key={cycle._id} value={cycle._id}>
                  {cycle.name} ({cycle.status})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.quickActions}>
            {selectedCycle && (
              <button
                className={styles.actionBtn}
                onClick={handleBulkAssign}
              >
                📋 Bulk Assign
              </button>
            )}
            <button
              className={styles.actionBtn}
              onClick={() => handleSendReminders()}
            >
              📧 Send Reminders
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleExportReport}
            >
              📊 Export Report
            </button>
          </div>
        </div>

        {dashboardData && (
          <>
            {/* Overall Stats Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Assignments</div>
                <div className={styles.statValue}>{dashboardData.overall.total}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Not Started</div>
                <div className={`${styles.statValue} ${styles.warning}`}>
                  {dashboardData.overall.notStarted}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>In Progress</div>
                <div className={`${styles.statValue} ${styles.info}`}>
                  {dashboardData.overall.inProgress}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Submitted</div>
                <div className={`${styles.statValue} ${styles.primary}`}>
                  {dashboardData.overall.submitted}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Published</div>
                <div className={`${styles.statValue} ${styles.success}`}>
                  {dashboardData.overall.published}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Completion Rate</div>
                <div className={styles.statValue}>
                  {getCompletionPercentage(dashboardData.overall)}%
                </div>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Department Progress</h2>
              <div className={styles.departmentGrid}>
                {dashboardData.departmentStats.map((dept) => (
                  <div key={dept.departmentId} className={styles.departmentCard}>
                    <div className={styles.departmentHeader}>
                      <h3 className={styles.departmentName}>{dept.departmentName}</h3>
                      <span className={styles.departmentTotal}>{dept.total} employees</span>
                    </div>

                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${getProgressPercentage(dept)}%` }}
                      />
                    </div>
                    <div className={styles.progressLabel}>
                      {getProgressPercentage(dept)}% Submitted/Published
                    </div>

                    <div className={styles.departmentStats}>
                      <div className={styles.miniStat}>
                        <span className={styles.miniStatLabel}>Not Started</span>
                        <span className={styles.miniStatValue}>{dept.notStarted}</span>
                      </div>
                      <div className={styles.miniStat}>
                        <span className={styles.miniStatLabel}>In Progress</span>
                        <span className={styles.miniStatValue}>{dept.inProgress}</span>
                      </div>
                      <div className={styles.miniStat}>
                        <span className={styles.miniStatLabel}>Submitted</span>
                        <span className={styles.miniStatValue}>{dept.submitted}</span>
                      </div>
                      <div className={styles.miniStat}>
                        <span className={styles.miniStatLabel}>Published</span>
                        <span className={styles.miniStatValue}>{dept.published}</span>
                      </div>
                    </div>

                    <div className={styles.departmentActions}>
                      {dept.submitted > 0 && (
                        <button
                          className={styles.publishButton}
                          onClick={() => handlePublishDepartment(dept.departmentId)}
                        >
                          Publish {dept.submitted} Pending
                        </button>
                      )}
                      {(dept.notStarted > 0 || dept.inProgress > 0) && (
                        <button
                          className={styles.reminderButton}
                          onClick={() => handleSendReminders(dept.departmentId)}
                        >
                          📧 Send Reminders
                        </button>
                      )}
                    </div>
                  </div>
                ))}                
              </div>
            </div>

            {/* Recent Assignments Table */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Recent Assignments</h2>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Manager</th>
                      <th>Cycle</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.assignments.slice(0, 20).map((assignment) => (
                      <tr key={assignment._id}>
                        <td>
                          {assignment.employeeProfileId?.firstName} {assignment.employeeProfileId?.lastName}
                          <br />
                          <small>{assignment.employeeProfileId?.employeeNumber}</small>
                        </td>
                        <td>{assignment.departmentId?.name}</td>
                        <td>
                          {assignment.managerProfileId?.firstName} {assignment.managerProfileId?.lastName}
                        </td>
                        <td>{assignment.cycleId?.name}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[assignment.status.toLowerCase().replace('_', '')]}`}>
                            {assignment.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          {assignment.dueDate
                            ? new Date(assignment.dueDate).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            <button
                              className={styles.actionButton}
                              onClick={() =>
                                router.push(`/hr/performance/assignments/${assignment._id}`)
                              }
                            >
                              View
                            </button>
                            {assignment.status === 'SUBMITTED' && (
                              <button
                                className={styles.publishBtn}
                                onClick={async () => {
                                  if (confirm('Publish this appraisal?')) {
                                    try {
                                      await axios.post('/performance/ratings/publish', {
                                        recordIds: [assignment.latestAppraisalId]
                                      });
                                      alert('Published successfully');
                                      fetchDashboard();
                                    } catch (err: any) {
                                      alert('Failed to publish');
                                    }
                                  }
                                }}
                              >
                                Publish
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </ProtectedRoute>
  );
}
