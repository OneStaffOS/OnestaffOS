/**
 * Employee Dashboard (Route: /dashboard/employee)
 * Standard employee portal - US-E2-04, US-E2-05, US-E2-12, US-E6-02
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import styles from '../dashboard.module.css';
import axios from '@/lib/axios-config';

interface EmployeeStats {
  leaveBalance: number;
  pendingRequests: number;
  upcomingAppraisals: number;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<EmployeeStats>({
    leaveBalance: 0,
    pendingRequests: 0,
    upcomingAppraisals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [hasClockedInToday, setHasClockedInToday] = useState(false);
  const [hasClockedOutToday, setHasClockedOutToday] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    checkAttendanceStatus();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications/my');
      const notes = res.data || [];
      setNotifications(notes);
    } catch (err) {
      console.debug('Failed to fetch notifications:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch employee profile
      const profileRes = await axios.get('/employee-profile/my-profile');
      const profile = profileRes.data;
      setEmployeeName(`${profile.firstName} ${profile.lastName}`);
      setEmployeeId(profile._id || profile._id?.toString?.() || '');

      // Fetch change requests
      const requestsRes = await axios.get('/employee-profile/my-profile/change-requests');
      const pendingRequests = requestsRes.data.filter((req: any) => req.status === 'PENDING').length;

      // Fetch leave balances
      let totalLeaveBalance = 0;
      try {
        const balancesRes = await axios.get(`/leaves/balances/employee/${profile._id}`);
        const balances = Array.isArray(balancesRes.data) ? balancesRes.data : [balancesRes.data];
        // Sum up all remaining leave days
        totalLeaveBalance = balances.reduce((sum: number, b: any) => sum + (b.remaining || 0), 0);
      } catch {
        // Leave balances not available yet
        totalLeaveBalance = 0;
      }

      setStats({
        leaveBalance: totalLeaveBalance,
        pendingRequests,
        upcomingAppraisals: 0, // Will be connected to performance module
      });
      // Fetch unread notifications count for inbox badge
      fetchUnreadCount(profile._id || profile._id?.toString?.());
      setError('');
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      // Handle authentication errors gracefully
      if (error.response?.status === 404) {
        setError('Employee profile not found. Please contact HR to set up your profile.');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Access denied. Please ensure you have the correct permissions.');
      } else {
        setError('Failed to load dashboard data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isoDate = (d: Date) => d.toISOString().split('T')[0];

  const checkAttendanceStatus = async () => {
    try {
      setAttendanceLoading(true);
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      const startDateStr = startOfDay.toISOString();
      const endDateStr = endOfDay.toISOString();
      
      const res = await axios.get(`/time-management/attendance/records?startDate=${startDateStr}&endDate=${endDateStr}`);
      const records = res.data || [];
      
      const punches: any[] = [];
      if (Array.isArray(records)) {
        records.forEach((r: any) => {
          if (Array.isArray(r.punches)) {
            punches.push(...r.punches);
          }
        });
      } else if (records && records.punches) {
        punches.push(...records.punches);
      }

      const sortedPunches = punches.sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      );
      
      if (sortedPunches.length > 0) {
        const lastPunch = sortedPunches[0];
        const lastPunchType = lastPunch.type;
        
        const wasIn = lastPunchType === 'IN' || lastPunchType === 'CLOCK_IN' || lastPunchType === 'PUNCH_IN';
        const wasOut = lastPunchType === 'OUT' || lastPunchType === 'CLOCK_OUT' || lastPunchType === 'PUNCH_OUT';
        
        setHasClockedInToday(wasIn);
        setHasClockedOutToday(wasOut);
      } else {
        setHasClockedInToday(false);
        setHasClockedOutToday(true);
      }
    } catch (err: any) {
      console.error('Attendance status check failed:', err);
      setHasClockedInToday(false);
      setHasClockedOutToday(true);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleClock = async (type: 'IN' | 'OUT') => {
    const label = type === 'IN' ? 'Clock In' : 'Clock Out';
    if (!confirm(`Are you sure you want to ${label} now?`)) return;
    try {
      setAttendanceLoading(true);
      setAttendanceMessage(null);
      const res = await axios.post('/time-management/attendance/clock', { type });
      const data = res.data || {};
      setAttendanceMessage(data.message || `${label} successful`);
      
      if (type === 'IN') {
        setHasClockedInToday(true);
        setHasClockedOutToday(false);
      } else {
        setHasClockedInToday(false);
        setHasClockedOutToday(true);
      }
    } catch (err: any) {
      console.error('Attendance clock failed', err);
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      setAttendanceMessage(`Failed: ${msg}`);
      
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('cannot clock in twice') || msgLower.includes('clock in twice in a row')) {
        setHasClockedInToday(true);
        setHasClockedOutToday(false);
      } else if (msgLower.includes('cannot clock out twice') || msgLower.includes('clock out twice in a row')) {
        setHasClockedInToday(false);
        setHasClockedOutToday(true);
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchUnreadCount = async (empId?: string) => {
    try {
      const res = await axios.get('/notifications/my');
      const notes = res.data || [];
      let count = 0;
      if (empId) {
        count = notes.filter((n: any) => {
          const readBy = n.readBy || [];
          return !readBy.some((r: any) => {
            // r may be string id or object
            if (!r) return false;
            if (typeof r === 'string') return r === empId;
            if (r._id) return r._id === empId || r._id?.toString() === empId;
            return r.toString && r.toString() === empId;
          });
        }).length;
      } else {
        count = notes.filter((n: any) => !n.readBy || n.readBy.length === 0).length;
      }
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications for badge', err);
    }
  };

  // Poll unread count every 60s after employeeId is known
  useEffect(() => {
    if (!employeeId) return;
    const id = setInterval(() => fetchUnreadCount(employeeId), 60000);
    return () => clearInterval(id);
  }, [employeeId]);

  const buttonStyle = {
    base: {
      padding: '0.875rem 1.75rem',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '0.95rem',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      flex: '1 1 auto',
      minWidth: '180px',
      textAlign: 'center' as const,
    },
    primary: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: '#ffffff',
    },
    success: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#ffffff',
    },
    warning: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: '#ffffff',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
    },
    purple: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      color: '#ffffff',
    },
    indigo: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
    },
    gray: {
      background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      color: '#ffffff',
    },
    disabled: {
      background: '#e5e7eb',
      color: '#9ca3af',
      cursor: 'not-allowed',
    }
  };

  const sectionStyle = {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  };

  const sectionTitleStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Employee Dashboard" role="Employee">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '2px solid #ef4444',
              color: '#dc2626',
              padding: '2rem',
              borderRadius: '16px',
              marginBottom: '2rem',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
            }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: '700' }}>⚠️ Profile Not Found</h3>
              <p style={{ margin: '0 0 1rem', lineHeight: '1.6' }}>{error}</p>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>
                <strong>Note:</strong> User accounts created through registration need an employee profile created by HR Admin. 
                Please contact your HR administrator to create your employee profile through the HR Admin dashboard.
              </p>
            </div>
          )}

          {!error && (
            <>
              {/* Quick Actions */}
              <div style={{ 
                ...sectionStyle,
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderLeft: '4px solid #3b82f6',
              }}>
                <h2 style={sectionTitleStyle}>⚡ Quick Actions</h2>
                <div style={gridStyle}>
                  <button 
                    onClick={() => router.push('/dashboard/employee/id-card')}
                    style={{ ...buttonStyle.base, ...buttonStyle.indigo }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    🆔 View ID Card
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/resignation')}
                    style={{ ...buttonStyle.base, ...buttonStyle.warning }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📝 Submit Resignation
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/my-resignations')}
                    style={{ ...buttonStyle.base, ...buttonStyle.success }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📊 Track Resignation
                  </button>
                </div>
              </div>

              {/* Employee Statistics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏖️</div>
                  <h3 style={{ fontSize: '1.1rem', color: '#1e40af', marginBottom: '0.5rem', fontWeight: '600' }}>Leave Balance</h3>
                  <p style={{ fontSize: '3rem', fontWeight: '700', color: '#1e3a8a', margin: '0.5rem 0' }}>
                    {loading ? '-' : stats.leaveBalance}
                  </p>
                  <span style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: '500' }}>Days remaining</span>
                </div>
                
                <div style={{
                  background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                  <h3 style={{ fontSize: '1.1rem', color: '#92400e', marginBottom: '0.5rem', fontWeight: '600' }}>Pending Requests</h3>
                  <p style={{ fontSize: '3rem', fontWeight: '700', color: '#78350f', margin: '0.5rem 0' }}>
                    {loading ? '-' : stats.pendingRequests}
                  </p>
                  <span style={{ fontSize: '0.9rem', color: '#b45309', fontWeight: '500' }}>Change requests</span>
                </div>
                
                <div style={{
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⭐</div>
                  <h3 style={{ fontSize: '1.1rem', color: '#065f46', marginBottom: '0.5rem', fontWeight: '600' }}>Upcoming Appraisals</h3>
                  <p style={{ fontSize: '3rem', fontWeight: '700', color: '#064e3b', margin: '0.5rem 0' }}>
                    {loading ? '-' : stats.upcomingAppraisals}
                  </p>
                  <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: '500' }}>Scheduled reviews</span>
                </div>
              </div>

              {/* Profile Management */}
              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>👤 My Profile</h2>
                <div style={gridStyle}>
                  <button 
                    onClick={() => router.push('/profile')}
                    style={{ ...buttonStyle.base, ...buttonStyle.primary }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    View Profile
                  </button>
                  <button 
                    onClick={() => router.push('/profile/edit')}
                    style={{ ...buttonStyle.base, ...buttonStyle.primary }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Edit Contact Info
                  </button>
                  <button 
                    onClick={() => router.push('/profile/request-change')}
                    style={{ ...buttonStyle.base, ...buttonStyle.primary }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Request Change
                  </button>
                  <button 
                    onClick={() => router.push('/profile/requests')}
                    style={{ 
                      ...buttonStyle.base, 
                      ...(stats.pendingRequests > 0 ? buttonStyle.warning : buttonStyle.success),
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    My Requests
                    {stats.pendingRequests > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#dc2626',
                        color: '#ffffff',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                      }}>
                        {stats.pendingRequests}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/appraisals')}
                    style={{ ...buttonStyle.base, ...buttonStyle.success }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    My Appraisals
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/disputes')}
                    style={{ ...buttonStyle.base, ...buttonStyle.danger }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    My Disputes
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/inbox')}
                    style={{ 
                      ...buttonStyle.base, 
                      ...buttonStyle.gray,
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📬 Inbox
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Leave & Time Management */}
              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>🕐 Leave & Time Management</h2>
                
                {notifications && notifications.some(n => (n.title || '').toLowerCase().includes('missed punch') || (n.message || '').toLowerCase().includes('missed')) && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', 
                    border: '2px solid #f59e0b', 
                    padding: '1rem 1.5rem', 
                    borderRadius: '12px', 
                    marginBottom: '1.5rem',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)',
                  }}>
                    <strong style={{ color: '#92400e', fontSize: '1rem' }}>⚠️ Missed punch detected</strong>
                    <div style={{ fontSize: '0.9rem', color: '#92400e', marginTop: '0.5rem' }}>
                      You have an unresolved missed-punch notification — please contact your line manager or correct your punches.
                    </div>
                  </div>
                )}

                <div style={gridStyle}>
                  <button 
                    onClick={() => router.push('/dashboard/employee/leaves')}
                    style={{ ...buttonStyle.base, ...buttonStyle.primary }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    🏖️ Leave Requests
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/attendance-records')}
                    style={{ ...buttonStyle.base, ...buttonStyle.primary }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📊 Attendance Records
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/employee/attendance-records?view=corrections')}
                    style={{ ...buttonStyle.base, ...buttonStyle.success }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    ✅ Correction Requests
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/employee/time-exception-request')}
                    style={{ ...buttonStyle.base, ...buttonStyle.warning }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    ⏰ Request Exception
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/employee/attendance-records?view=time-exceptions')}
                    style={{ ...buttonStyle.base, ...buttonStyle.warning }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📋 View Exceptions
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/employee/csv-attendance')}
                    style={{ ...buttonStyle.base, ...buttonStyle.purple }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📄 CSV Attendance
                  </button>
                </div>

                {/* Clock In/Out Controls */}
                <div style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>⏱️ Clock In/Out</h3>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <button
                      onClick={() => handleClock('IN')}
                      disabled={attendanceLoading || hasClockedInToday}
                      style={{
                        ...buttonStyle.base,
                        ...(attendanceLoading || hasClockedInToday ? buttonStyle.disabled : buttonStyle.success),
                        flex: '1',
                        minWidth: '150px',
                      }}
                      onMouseEnter={(e) => {
                        if (!attendanceLoading && !hasClockedInToday) {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                        }
                      }}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      ▶️ Clock In
                    </button>
                    <button
                      onClick={() => handleClock('OUT')}
                      disabled={attendanceLoading || hasClockedOutToday}
                      style={{
                        ...buttonStyle.base,
                        ...(attendanceLoading || hasClockedOutToday ? buttonStyle.disabled : buttonStyle.danger),
                        flex: '1',
                        minWidth: '150px',
                      }}
                      onMouseEnter={(e) => {
                        if (!attendanceLoading && !hasClockedOutToday) {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                        }
                      }}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      ⏹️ Clock Out
                    </button>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'center', fontWeight: '500' }}>
                    {attendanceLoading ? '⏳ Processing…' :
                     hasClockedInToday ? '✅ Clocked In (clock out to continue)' : 
                     hasClockedOutToday ? '🔴 Clocked Out (clock in to start new session)' : 
                     '🟢 Ready to clock in'}
                  </div>
                  {attendanceMessage && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: attendanceMessage.startsWith('Failed') ? '#fee2e2' : '#d1fae5',
                      color: attendanceMessage.startsWith('Failed') ? '#dc2626' : '#059669',
                      fontWeight: '500',
                      textAlign: 'center',
                    }}>
                      {attendanceMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents & Payroll */}
              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>💼 Payroll</h2>
                <div style={gridStyle}>
                  <button 
                    onClick={() => router.push('/dashboard/employee/payroll/my-payslips')}
                    style={{ ...buttonStyle.base, ...buttonStyle.success }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    💰 View Payslips
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/payroll/salary-history')}
                    style={{ ...buttonStyle.base, ...buttonStyle.primary }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📊 Salary History
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/payroll/my-disputes')}
                    style={{ ...buttonStyle.base, ...buttonStyle.danger }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    ⚠️ My Disputes
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/employee/payroll/my-claims')}
                    style={{ ...buttonStyle.base, ...buttonStyle.purple }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    💼 My Claims
                  </button>
                </div>
              </div>

              {/* Organization */}
              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>🏢 Organization</h2>
                <div style={gridStyle}>
                  <button 
                    onClick={() => router.push('/org-structure/hierarchy')}
                    style={{ ...buttonStyle.base, ...buttonStyle.indigo }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    🌳 Organizational Hierarchy
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
