/**
 * Admin Dashboard (Route: /dashboard/admin)
 * Full system access for system administrators
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import styles from './admin.module.css';
import axios from '@/lib/axios-config';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  activeEmployees: number;
  totalDepartments: number;
  pendingRequests: number;
  recentRegistrations: number;
  suspendedEmployees: number;
  onLeaveEmployees: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface RecentActivity {
  id: string;
  type: 'registration' | 'profile_update' | 'change_request' | 'role_update' | 'status_change';
  user: string;
  description: string;
  timestamp: string;
}

interface PendingRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  requestType: string;
  field: string;
  currentValue: string;
  requestedValue: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeEmployees: 0,
    totalDepartments: 0,
    pendingRequests: 0,
    recentRegistrations: 0,
    suspendedEmployees: 0,
    onLeaveEmployees: 0,
    systemHealth: 'healthy',
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [statsRes, activityRes, requestsRes, departmentsRes] = await Promise.allSettled([
        axios.get('/employee-profile/admin/stats'),
        axios.get('/employee-profile/admin/recent-activity'),
        axios.get('/employee-profile/change-requests?status=pending'),
        axios.get('/organization-structure/departments'),
      ]);

      if (statsRes.status === 'fulfilled') {
        const statsData = statsRes.value.data;
        
        // Calculate total departments from the departments endpoint
        let departmentCount = 0;
        if (departmentsRes.status === 'fulfilled') {
          departmentCount = departmentsRes.value.data.filter((dept: any) => dept.isActive).length;
        }
        
        setStats({
          ...statsData,
          totalDepartments: departmentCount,
        });
      }

      if (activityRes.status === 'fulfilled') {
        setRecentActivity(activityRes.value.data);
      }

      if (requestsRes.status === 'fulfilled') {
        setPendingRequests(requestsRes.value.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await axios.patch(`/employee-profile/change-requests/${requestId}/approve`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await axios.patch(`/employee-profile/change-requests/${requestId}/reject`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN]}>
      <DashboardLayout title="Admin Dashboard" role="System Administrator">
        <div className={styles.container}>
          {/* Stats Overview */}
          <section className={styles.statsSection}>
            <h2 className={styles.sectionTitle}>System Overview</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Total Users</h3>
                  <p className={styles.statValue}>{loading ? '...' : stats.totalUsers}</p>
                  <span className={styles.statChange}>All system users</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Active Employees</h3>
                  <p className={styles.statValue}>{loading ? '...' : stats.activeEmployees}</p>
                  <span className={styles.statChange}>Currently employed</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Suspended</h3>
                  <p className={styles.statValue}>{loading ? '...' : stats.suspendedEmployees}</p>
                  <span className={styles.statChange}>Suspended accounts</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>On Leave</h3>
                  <p className={styles.statValue}>{loading ? '...' : stats.onLeaveEmployees}</p>
                  <span className={styles.statChange}>Currently on leave</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Departments</h3>
                  <p className={styles.statValue}>{loading ? '...' : stats.totalDepartments}</p>
                  <span className={styles.statChange}>Active departments</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Pending Requests</h3>
                  <p className={styles.statValue}>{loading ? '...' : stats.pendingRequests}</p>
                  <span className={styles.statChange}>Awaiting review</span>
                </div>
              </div>
            </div>
          </section>

          {/* Pending Change Requests */}
          <section className={styles.requestsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Pending Change Requests</h2>
              <Link href="/dashboard/hr/change-requests" className={styles.viewAllLink}>
                View All
              </Link>
            </div>
            <div className={styles.requestsCard}>
              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <p>Loading pending requests...</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No pending change requests</p>
                </div>
              ) : (
                <div className={styles.requestsList}>
                  {pendingRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className={styles.requestItem}>
                      <div className={styles.requestInfo}>
                        <div className={styles.requestHeader}>
                          <span className={styles.employeeName}>{request.employeeName}</span>
                          <span className={styles.employeeId}>({request.employeeId})</span>
                        </div>
                        <p className={styles.requestDetails}>
                          <strong>Request:</strong> {request.requestedValue}
                        </p>
                        <span className={styles.requestDate}>Submitted: {request.submittedDate}</span>
                      </div>
                      <div className={styles.requestActions}>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          Approve
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className={styles.actionsSection}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionGrid}>
              <Link href="/dashboard/hr/employees" className={styles.actionCard}>
                <h3>Manage Employees</h3>
                <p>View, edit, and manage employee profiles</p>
              </Link>

              <Link href="/dashboard/hr/change-requests" className={styles.actionCard}>
                <h3>Review Requests</h3>
                <p>Approve or reject profile change requests</p>
              </Link>

              <Link href="/team" className={styles.actionCard}>
                <h3>Team Directory</h3>
                <p>View organizational structure and teams</p>
              </Link>

              <Link href="/dashboard/hr/roles" className={styles.actionCard}>
                <h3>Role Management</h3>
                <p>Assign roles and access permissions</p>
              </Link>

              <Link href="/org-structure/departments" className={styles.actionCard}>
                <h3>Manage Departments</h3>
                <p>Create and manage organizational departments</p>
              </Link>

              <Link href="/org-structure/positions" className={styles.actionCard}>
                <h3>Manage Positions</h3>
                <p>Create and manage organizational positions</p>
              </Link>

              <Link href="/org-structure/hierarchy" className={styles.actionCard}>
                <h3>View Hierarchy</h3>
                <p>View organizational structure and reporting lines</p>
              </Link>

              <Link href="/org-structure/change-requests" className={styles.actionCard}>
                <h3>Structure Change Requests</h3>
                <p>Review organizational structure change requests</p>
              </Link>

              <Link href="/dashboard/hr/time-management/shift-types" className={styles.actionCard}>
                <h3>Shift Types</h3>
                <p>Configure standard shift types used across the organization</p>
              </Link>

              <Link href="/dashboard/hr/time-management/shift-assignments" className={styles.actionCard}>
                <h3>Shift Assignments</h3>
                <p>Assign shifts to employees, departments, or positions</p>
              </Link>

              <Link href="/dashboard/time-exceptions" className={styles.actionCard}>
                <h3>Review Time Exceptions</h3>
                <p>View and process pending time exception requests</p>
              </Link>

              <Link href="/dashboard/admin/escalation-settings" className={styles.actionCard}>
                <h3>Escalation Settings</h3>
                <p>Configure automatic escalation rules for pending requests</p>
              </Link>

              <Link href="/dashboard/hr/reports" className={styles.actionCard}>
                <h3>System Reports</h3>
                <p>Generate employee and system reports</p>
              </Link>

              <Link href="/dashboard/hr/audit" className={styles.actionCard}>
                <h3>Audit Trail</h3>
                <p>View all system changes and edits</p>
              </Link>

              <Link href="/dashboard/hr/employee-status" className={styles.actionCard}>
                <h3>Employee Status</h3>
                <p>Activate, suspend, or terminate accounts</p>
              </Link>
              {/* HR-only view: Holiday Configuration (visible to HR Admins) */}
              <button
                className={styles.actionCard}
                onClick={() => router.push('/dashboard/hr/holidays')}
              >
                <h3>Holiday Configuration</h3>
                <p>Manage national, organizational holidays & rest days</p>
              </button>

              <Link href="/dashboard/admin/settings" className={styles.actionCard}>
                <h3>Company Wide Settings</h3>
                <p>Configure global payroll settings including pay date, timezone, and currency</p>
              </Link>

              <Link href="/dashboard/admin/backup" className={styles.actionCard}>
                <h3>Backup & Restore</h3>
                <p>Manage system backups and restore data</p>
              </Link>
            </div>
          </section>

          {/* Recent Activity */}
          <section className={styles.activitySection}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            <div className={styles.activityCard}>
              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <p>Loading recent activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No recent activity to display</p>
                </div>
              ) : (
                <div className={styles.activityList}>
                  {recentActivity.slice(0, 10).map((activity) => (
                    <div key={activity.id} className={styles.activityItem}>
                      <div className={styles.activityContent}>
                        <p className={styles.activityDescription}>{activity.description}</p>
                        <span className={styles.activityUser}>{activity.user}</span>
                      </div>
                      <span className={styles.activityTime}>{activity.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
