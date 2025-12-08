/**
 * Manager Dashboard (Route: /dashboard/manager)
 * Unified dashboard for all manager types (Department Manager, HR Manager, Head of Department)
 * Supports: Template creation, Cycle management, Team appraisals, Progress monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import { useAuth } from '../../context/AuthContext';

interface DashboardStats {
  directReports: number;
  pendingApprovals: number;
  totalAppraisals: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  overdue: number;
  activeCycles: number;
  disputes: number;
  archived: number;
  pendingLeaveRequests: number;
}

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  roles?: string[];
}

export default function ManagerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    directReports: 0,
    pendingApprovals: 0,
    totalAppraisals: 0,
    notStarted: 0,
    inProgress: 0,
    submitted: 0,
    overdue: 0,
    activeCycles: 0,
    disputes: 0,
    archived: 0,
    pendingLeaveRequests: 0,
  });

  useEffect(() => {
    // Get role from AuthContext user
    if (user?.roles && user.roles.length > 0) {
      const roles = user.roles;
      const managerRole = roles.find((r: string) => 
        r === 'HR_MANAGER' || r === 'HEAD_OF_DEPARTMENT' || r === 'DEPARTMENT_MANAGER'
      ) || roles[0];
      setUserRole(managerRole);
    }
    fetchUserProfile();
    fetchStats();
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications/manager/inbox');
      const notes = res.data || [];
      setNotifications(notes);
    } catch (err) {
      console.debug('Failed to fetch manager notifications:', err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/employee-profile/my-profile');
      setUserProfile(response.data);
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/performance/dashboard/manager');
      
      // Fetch pending leave requests count for the manager's department
      let pendingLeaves = 0;
      try {
        const profileRes = await axios.get('/employee-profile/my-profile');
        const deptId = profileRes.data?.primaryDepartmentId?._id || profileRes.data?.primaryDepartmentId;
        if (deptId) {
          const leavesRes = await axios.get(`/leaves/requests/department/${deptId}`, {
            params: { status: 'pending' }
          });
          pendingLeaves = leavesRes.data?.length || 0;
        }
      } catch (leaveErr) {
        console.debug('Could not fetch leave requests:', leaveErr);
      }
      
      setStats({
        directReports: response.data.assignments?.length || 0,
        pendingApprovals: response.data.stats?.submitted || 0,
        totalAppraisals: response.data.stats?.total || 0,
        notStarted: response.data.stats?.notStarted || 0,
        inProgress: response.data.stats?.inProgress || 0,
        submitted: response.data.stats?.submitted || 0,
        overdue: response.data.stats?.overdue || 0,
        activeCycles: response.data.activeCycles?.length || 0,
        disputes: 0, // TODO: Add disputes endpoint
        archived: 0, // TODO: Fetch archived count
        pendingLeaveRequests: pendingLeaves,
      });
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // REQ-PP-01: Configure appraisal templates
  const handleCreateTemplate = () => {
    router.push('/dashboard/hr/performance/templates/create');
  };

  // REQ-PP-02: Define and schedule appraisal cycles
  const handleCreateCycle = () => {
    router.push('/dashboard/hr/performance/cycles/create');
  };

  // REQ-PP-02, REQ-PP-05: Manage cycles and assignments
  const handleManageCycles = () => {
    router.push('/dashboard/hr/performance/cycles');
  };

  // REQ-PP-13: View assigned appraisal forms
  const handlePerformanceDashboard = () => {
    router.push('/dashboard/manager/performance-dashboard');
  };

  // REQ-AE-03, REQ-AE-04: Complete appraisal ratings
  const handleViewTeam = () => {
    router.push('/dashboard/manager/team');
  };

  // REQ-AE-06: Monitor progress and send reminders
  const handleMonitorProgress = () => {
    router.push('/dashboard/manager/performance-dashboard?view=progress');
  };

  // REQ-AE-10: Consolidated dashboard for HR Manager
  const handleConsolidatedView = () => {
    router.push('/dashboard/hr/performance-dashboard');
  };

  // REQ-OD-07: Resolve disputes
  const handleDisputes = () => {
    router.push('/dashboard/hr/performance/disputes');
  };

  // REQ-OD-08: Historical analysis
  const handleReports = () => {
    router.push('/dashboard/hr/performance/reports');
  };

  // REQ-AE-06: Send reminders for pending appraisals
  const handleSendReminders = async () => {
    if (!confirm('Send reminders to managers with pending appraisals?')) return;
    
    try {
      const response = await axios.post('/performance/reminders/send', {});
      alert(`Reminders sent successfully to ${response.data.sent} manager(s)`);
      fetchStats(); // Refresh dashboard
    } catch (err: any) {
      console.error('Failed to send reminders:', err);
      alert('Failed to send reminders: ' + (err.response?.data?.message || err.message));
    }
  };

  // REQ-OD-05: View archived records
  const handleViewArchived = () => {
    router.push('/dashboard/hr/performance/archived');
  };

  // REQ-PP-02: Activate/Close cycles
  const handleActivateCycle = (cycleId: string) => {
    router.push(`/dashboard/hr/performance/cycles/${cycleId}/activate`);
  };

  const handleCloseCycle = (cycleId: string) => {
    router.push(`/dashboard/hr/performance/cycles/${cycleId}/close`);
  };

  const isHRManager = userRole === 'HR Manager';
  const isDeptHead = userRole === 'department head';

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
      <DashboardLayout title="Manager Dashboard" role="Manager">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
          }}>
            <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              👔 Manager Dashboard
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', margin: '0.5rem 0 0 0' }}>
              Performance appraisals, team management, and leave approvals
            </p>
          </div>

          {/* REQ-PP-13, REQ-AE-03: Performance Overview */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1.5rem',
            marginBottom: '2.5rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Performance Appraisals</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', margin: '0.5rem 0', lineHeight: 1 }}>
                {loading ? '-' : stats.totalAppraisals}
              </p>
              <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total assignments</span>
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.95, lineHeight: 1.6 }}>
                {!loading && (
                  <>
                    <div>Not Started: {stats.notStarted}</div>
                    <div>In Progress: {stats.inProgress}</div>
                    <div>Submitted: {stats.submitted}</div>
                  </>
                )}
              </div>
              <button 
                onClick={handlePerformanceDashboard}
                style={{ 
                  marginTop: '1rem', 
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                View Dashboard
              </button>
            </div>
            
            {/* REQ-AE-03, REQ-AE-04: Pending evaluations */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Pending Evaluations</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', margin: '0.5rem 0', lineHeight: 1 }}>
                {loading ? '-' : stats.notStarted + stats.inProgress}
              </p>
              <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Awaiting completion</span>
              {stats.overdue > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(220, 38, 38, 0.3)', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
                  ⚠️ {stats.overdue} overdue
                </div>
              )}
              <button 
                onClick={() => router.push('/dashboard/manager/performance-dashboard?filter=pending')}
                style={{ 
                  marginTop: '1rem', 
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Complete Now
              </button>
            </div>
            
            {/* REQ-PP-02: Active cycles */}
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Active Cycles</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', margin: '0.5rem 0', lineHeight: 1 }}>
                {loading ? '-' : stats.activeCycles}
              </p>
              <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Ongoing appraisal cycles</span>
              {isHRManager && (
                <button 
                  onClick={handleManageCycles}
                  style={{ 
                    marginTop: '1rem', 
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Manage Cycles
                </button>
              )}
            </div>
            
            {/* REQ-PP-13: Direct reports */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Direct Reports</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', margin: '0.5rem 0', lineHeight: 1 }}>
                {loading ? '-' : stats.directReports}
              </p>
              <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Team members</span>
              <button 
                onClick={handleViewTeam}
                style={{ 
                  marginTop: '1rem', 
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                View Team
              </button>
            </div>

            {/* REQ-020: Pending Leave Requests */}
            <div style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Leave Requests</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', margin: '0.5rem 0', lineHeight: 1 }}>
                {loading ? '-' : stats.pendingLeaveRequests}
              </p>
              <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Pending approval</span>
              {stats.pendingLeaveRequests > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(245, 158, 11, 0.3)', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
                  📋 {stats.pendingLeaveRequests} awaiting review
                </div>
              )}
              <button 
                onClick={() => router.push('/dashboard/manager/leave-requests')}
                style={{ 
                  marginTop: '1rem', 
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Review Requests
              </button>
            </div>
          </div>

          {/* REQ-PP-01, REQ-PP-02, REQ-AE-03: Quick Actions */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
            }}>
              <h2 style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: '#111827', 
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                ⚡ Quick Actions
              </h2>
              <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                Access frequently used management tools and features
              </p>
              
              {notifications && notifications.some(n => (n.title || '').toLowerCase().includes('missed punch') || (n.message || '').toLowerCase().includes('missed')) && (
                <div style={{ 
                  background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', 
                  border: '2px solid #f59e0b', 
                  padding: '1rem 1.25rem', 
                  borderRadius: 12, 
                  marginBottom: '1.5rem', 
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' 
                }}>
                  <strong style={{ color: '#92400e', fontSize: '1.05rem' }}>⚠️ Missed punch alerts</strong>
                  <div style={{ fontSize: '0.95rem', color: '#92400e', marginTop: '0.25rem' }}>
                    You have missed-punch notifications in your inbox. <button onClick={() => router.push('/dashboard/manager/inbox')} style={{ textDecoration: 'underline', background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: '600' }}>Open inbox</button>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Testing: Trigger missed-punch notification for an employee */}
              <button
                onClick={async () => {
                  if (!confirm('Trigger missed-punch scanning for today across attendance records?')) return;
                  try {
                    const res = await axios.post('/time-management/attendance/trigger-missed');
                    alert((res.data?.processed != null ? `Processed: ${res.data.processed}` : '') + ' ' + (res.data?.message || 'Trigger sent'));
                    fetchNotifications();
                  } catch (err: any) {
                    console.error('Trigger missed-punch failed', err);
                    alert('Failed: ' + (err.response?.data?.message || err.message || 'Unknown'));
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Trigger Missed-Punch Scan (Test)
              </button>
              
              {/* REQ-PP-13, REQ-AE-03: Manager evaluation */}
              <button 
                onClick={handlePerformanceDashboard}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📊 Performance Dashboard
              </button>
              
              {/* REQ-020, REQ-021, REQ-022: Leave Request Management */}
              <button 
                onClick={() => router.push('/dashboard/manager/leave-requests')}
                style={{
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🏖️ Leave Requests
              </button>
              
              {/* REQ-034, REQ-035: Team Leave Balances & Management */}
              <button 
                onClick={() => router.push('/dashboard/manager/team-leaves')}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📅 Team Leave Balances
              </button>
              
              {/* REQ-AE-03: Team management */}
              <button 
                onClick={handleViewTeam}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                👥 View Team
              </button>

              {/* Time Exception Approval */}
              <button 
                onClick={() => router.push('/dashboard/manager/time-exceptions')}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                ⏰ Review Time Exceptions
              </button>

              {/* Correction Requests (Manager) */}
              <button 
                onClick={() => router.push('/dashboard/manager/correction-requests')}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                ✏️ Correction Requests
              </button>

              {/* Repeated Lateness Alerts (Department Head) */}
              <button 
                onClick={() => router.push('/dashboard/manager/repeated-lateness')}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🚨 Repeated Lateness Alerts
              </button>

              {/* Team Appraisals: consolidated view for dept-head ratings */}
              <button 
                onClick={() => router.push('/dashboard/manager/team-appraisals')}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📝 Team Appraisals
              </button>

              {/* US-6: Manual Attendance Correction (Department Head only) */}
              {isDeptHead && (
                <button 
                  onClick={() => router.push('/dashboard/manager/attendance-corrections')}
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔧 Manual Attendance Correction
                </button>
              )}
              
              {/* REQ-AE-06: Monitor progress (HR Manager only) */}
              {isHRManager && (
                <button 
                  onClick={handleMonitorProgress}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📈 Monitor Progress
                </button>
              )}
              
              {/* REQ-AE-06: Send reminders (HR Manager only) */}
              {isHRManager && stats.overdue > 0 && (
                <button 
                  onClick={handleSendReminders}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔔 Send Reminders ({stats.overdue} overdue)
                </button>
              )}
              
              {/* REQ-OD-07: Dispute resolution (HR Manager only) */}
              {isHRManager && stats.disputes > 0 && (
                <button 
                  onClick={handleDisputes}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ⚖️ Resolve Disputes ({stats.disputes})
                </button>
              )}
              
              {/* REQ-OD-08: Reports and analytics */}
              <button 
                onClick={handleReports}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📊 Reports & Analytics
              </button>

              {/* Post Announcement / Leader Composer */}
              <button 
                onClick={() => router.push('/dashboard/leader/notifications')}
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📢 Post Announcement
              </button>

              {/* Manager Inbox */}
              <button 
                onClick={() => router.push('/dashboard/manager/inbox')}
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📬 Inbox
              </button>
            </div>
            </div>
          </div>

          {/* REQ-PP-01, REQ-PP-02: HR Manager specific actions */}
          {isHRManager && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>HR Management</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* REQ-PP-01: Template configuration */}
                <button 
                  onClick={handleCreateTemplate}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📄 Create Template
                </button>
                
                {/* REQ-PP-02: Cycle creation */}
                <button 
                  onClick={handleCreateCycle}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔄 Create Cycle
                </button>
                
                {/* REQ-PP-02, REQ-PP-05: Cycle and assignment management */}
                <button 
                  onClick={handleManageCycles}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ⚙️ Manage Cycles
                </button>
                
                {/* REQ-AE-10: Consolidated view */}
                <button 
                  onClick={handleConsolidatedView}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📊 Consolidated Dashboard
                </button>
                
                {/* REQ-OD-05: View archived records */}
                <button 
                  onClick={handleViewArchived}
                  style={{
                    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📦 View Archived Records
                </button>
              </div>
            </div>
          )}

          {/* REQ-AE-03, REQ-AE-04: Overdue alerts */}
          {!loading && stats.overdue > 0 && (
            <div style={{ 
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
              border: '2px solid #dc2626',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
            }}>
              <h2 style={{ color: '#dc2626', fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.75rem' }}>⚠️ Attention Required</h2>
              <p style={{ marginBottom: '1.5rem', color: '#991b1b', fontSize: '1.05rem' }}>
                You have {stats.overdue} overdue performance appraisal{stats.overdue > 1 ? 's' : ''} that need immediate attention.
              </p>
              <button 
                onClick={() => router.push('/dashboard/manager/performance-dashboard?filter=overdue')}
                style={{ 
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem 2rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🚨 Review Overdue Items
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
