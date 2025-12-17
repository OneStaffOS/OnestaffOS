/**
 * Line Manager Performance Dashboard
 * REQ-PP-13, REQ-AE-03: View assigned appraisals and complete ratings for direct reports
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './manager-dashboard.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Cycle {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  managerDueDate?: string;
}

interface Assignment {
  _id: string;
  cycleId: any;
  employeeProfileId: any;
  departmentId: any;
  positionId: any;
  templateId: any;
  status: string;
  assignedAt: string;
  dueDate?: string;
  submittedAt?: string;
  latestAppraisalId?: any;
}

interface DashboardData {
  activeCycles: Cycle[];
  assignments: Assignment[];
  stats: {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

export default function ManagerPerformanceDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [filterCycle, setFilterCycle] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/performance/dashboard/manager');
      // Debug log removed
      setDashboardData(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAppraisal = (assignmentId: string) => {
    router.push(`/dashboard/manager/performance/appraisal/${assignmentId}`);
  };

  const isOverdue = (assignment: Assignment) => {
    if (!assignment.dueDate) return false;
    return new Date(assignment.dueDate) < new Date() &&
      assignment.status !== 'SUBMITTED' &&
      assignment.status !== 'HR_PUBLISHED';
  };

  const filteredAssignments = dashboardData?.assignments.filter((assignment) => {
    if (filterCycle && assignment.cycleId?._id !== filterCycle) return false;
    if (filterStatus && assignment.status !== filterStatus) return false;
    return true;
  }) || [];

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER]}>
        <Spinner fullScreen message="Loading dashboard..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_MANAGER]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>My Team Performance</h1>
            <p className={styles.subtitle}>Manage appraisals for your direct reports</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshButton}
              onClick={fetchDashboard}
            >
              Refresh
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => router.push('/dashboard/manager/team')}
            >
              View Team
            </button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {dashboardData && (
          <>
            {/* Stats Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}></div>
                <div className={styles.statLabel}>Total Assignments</div>
                <div className={styles.statValue}>{dashboardData.stats.total}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}></div>
                <div className={styles.statLabel}>Not Started</div>
                <div className={`${styles.statValue} ${styles.warning}`}>
                  {dashboardData.stats.notStarted}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}></div>
                <div className={styles.statLabel}>In Progress</div>
                <div className={`${styles.statValue} ${styles.info}`}>
                  {dashboardData.stats.inProgress}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}></div>
                <div className={styles.statLabel}>Completed</div>
                <div className={`${styles.statValue} ${styles.success}`}>
                  {dashboardData.stats.completed}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}></div>
                <div className={styles.statLabel}>Overdue</div>
                <div className={`${styles.statValue} ${styles.danger}`}>
                  {dashboardData.stats.overdue}
                </div>
              </div>
            </div>

            {/* Active Cycles Info */}
            {dashboardData.activeCycles.length > 0 && (
              <div className={styles.cyclesSection}>
                <h2 className={styles.sectionTitle}>Active Appraisal Cycles</h2>
                <div className={styles.cyclesGrid}>
                  {dashboardData.activeCycles.map((cycle) => (
                    <div key={cycle._id} className={styles.cycleCard}>
                      <h3 className={styles.cycleName}>{cycle.name}</h3>
                      <div className={styles.cycleInfo}>
                        <div className={styles.cycleDetail}>
                          <span className={styles.cycleLabel}>Period:</span>
                          <span className={styles.cycleValue}>
                            {new Date(cycle.startDate).toLocaleDateString()} -{' '}
                            {new Date(cycle.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        {cycle.managerDueDate && (
                          <div className={styles.cycleDetail}>
                            <span className={styles.cycleLabel}>Manager Due Date:</span>
                            <span className={styles.cycleValue}>
                              {new Date(cycle.managerDueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <span className={`${styles.cycleStatus} ${styles[cycle.status.toLowerCase()]}`}>
                          {cycle.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className={styles.filtersSection}>
              <div className={styles.filterControls}>
                <div className={styles.filterGroup}>
                  <label htmlFor="cycleFilter" className={styles.filterLabel}>
                    Cycle:
                  </label>
                  <select
                    id="cycleFilter"
                    className={styles.filterSelect}
                    value={filterCycle}
                    onChange={(e) => setFilterCycle(e.target.value)}
                  >
                    <option value="">All Cycles</option>
                    {dashboardData.activeCycles.map((cycle) => (
                      <option key={cycle._id} value={cycle._id}>
                        {cycle.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="statusFilter" className={styles.filterLabel}>
                    Status:
                  </label>
                  <select
                    id="statusFilter"
                    className={styles.filterSelect}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="SUBMITTED">Completed</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.quickFilters}>
                <button
                  className={`${styles.filterChip} ${filterStatus === 'NOT_STARTED' ? styles.active : ''}`}
                  onClick={() => setFilterStatus(filterStatus === 'NOT_STARTED' ? '' : 'NOT_STARTED')}
                >
                  Not Started ({dashboardData.stats.notStarted})
                </button>
                <button
                  className={`${styles.filterChip} ${filterStatus === 'IN_PROGRESS' ? styles.active : ''}`}
                  onClick={() => setFilterStatus(filterStatus === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
                >
                  In Progress ({dashboardData.stats.inProgress})
                </button>
                <button
                  className={`${styles.filterChip} ${dashboardData.stats.overdue > 0 ? styles.overdueChip : ''}`}
                  onClick={() => {
                    // Filter to show only overdue
                    setFilterStatus('');
                  }}
                >
                  Overdue ({dashboardData.stats.overdue})
                </button>
              </div>
            </div>

            {/* Assignments List */}
            <div className={styles.assignmentsSection}>
              <h2 className={styles.sectionTitle}>
                Assigned Appraisals ({filteredAssignments.length})
              </h2>
              
              {filteredAssignments.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No assignments found</p>
                </div>
              ) : (
                <div className={styles.assignmentsGrid}>
                  {filteredAssignments.map((assignment) => (
                    <div
                      key={assignment._id}
                      className={`${styles.assignmentCard} ${
                        isOverdue(assignment) ? styles.overdue : ''
                      }`}
                    >
                      {isOverdue(assignment) && (
                        <div className={styles.overdueLabel}>OVERDUE</div>
                      )}
                      
                      <div className={styles.assignmentHeader}>
                        <div>
                          <h3 className={styles.employeeName}>
                            {assignment.employeeProfileId?.firstName}{' '}
                            {assignment.employeeProfileId?.lastName}
                          </h3>
                          <p className={styles.employeeNumber}>
                            {typeof assignment.employeeProfileId?.employeeNumber === 'string' ? assignment.employeeProfileId?.employeeNumber : assignment.employeeProfileId?._id}
                          </p>
                        </div>
                        <span className={`${styles.statusBadge} ${styles[assignment.status.toLowerCase().replace('_', '')]}`}>
                          {assignment.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className={styles.assignmentBody}>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Cycle:</span>
                          <span className={styles.infoValue}>
                            {assignment.cycleId?.name}
                          </span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Department:</span>
                          <span className={styles.infoValue}>
                            {assignment.departmentId?.name}
                          </span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Position:</span>
                          <span className={styles.infoValue}>
                            {assignment.positionId?.title || 'N/A'}
                          </span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Template:</span>
                          <span className={styles.infoValue}>
                            {assignment.templateId?.name}
                          </span>
                        </div>
                        {assignment.dueDate && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Due Date:</span>
                            <span className={`${styles.infoValue} ${isOverdue(assignment) ? styles.overdueText : ''}`}>
                              {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className={styles.assignmentActions}>
                        {assignment.status === 'NOT_STARTED' && (
                          <>
                            <button
                              className={styles.primaryButton}
                              onClick={() => handleStartAppraisal(assignment._id)}
                            >
                              Start Appraisal
                            </button>
                            <button 
                              className={styles.viewProfileButton}
                              onClick={() => router.push(`/dashboard/manager/team/employee/${assignment.employeeProfileId?._id}`)}
                            >
                              View Profile
                            </button>
                          </>
                        )}
                        {assignment.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              className={styles.primaryButton}
                              onClick={() => handleStartAppraisal(assignment._id)}
                            >
                              Continue Appraisal
                            </button>
                            <button
                              className={styles.infoButton}
                              onClick={() => router.push(`/dashboard/manager/team/employee/${assignment.employeeProfileId?._id}`)}
                            >
                              View Profile
                            </button>
                          </>
                        )}
                        {assignment.status === 'SUBMITTED' && (
                          <>
                            <button
                              className={styles.secondaryButton}
                              onClick={() => handleStartAppraisal(assignment._id)}
                            >
                              View Submitted
                            </button>
                            <button
                              className={styles.infoButton}
                              onClick={() => router.push(`/dashboard/manager/team/employee/${assignment.employeeProfileId?._id}`)}
                            >
                              View Profile
                            </button>
                          </>
                        )}
                        {assignment.status === 'HR_PUBLISHED' && (
                          <>
                            <button
                              className={styles.secondaryButton}
                              onClick={() => handleStartAppraisal(assignment._id)}
                            >
                              View Published
                            </button>
                            <button
                              className={styles.infoButton}
                              onClick={() => router.push(`/dashboard/manager/team/employee/${assignment.employeeProfileId?._id}`)}
                            >
                              View Profile
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
