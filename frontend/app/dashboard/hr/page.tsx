/**
 * Unified HR Dashboard (Route: /dashboard/hr)
 * Comprehensive HR management for all HR roles
 * Combines employee management, organization structure, and performance management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../dashboard.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface DashboardStats {
  // Employee stats
  totalEmployees: number;
  activeEmployees: number;
  pendingChangeRequests: number;
  recentHires: number;
  totalDepartments: number;
  suspendedEmployees: number;
  onLeaveEmployees: number;
  terminatedEmployees: number;
  // Performance stats
  activeCycles: number;
  totalAppraisals: number;
  pendingAppraisals: number;
  submittedAppraisals: number;
  overdueAppraisals: number;
  pendingDisputes: number;
  completionRate: number;
  activeTemplates: number;
  // Payroll stats
  pendingInsuranceBrackets: number;
}

export default function UnifiedHRDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingChangeRequests: 0,
    recentHires: 0,
    totalDepartments: 0,
    suspendedEmployees: 0,
    onLeaveEmployees: 0,
    terminatedEmployees: 0,
    activeCycles: 0,
    totalAppraisals: 0,
    pendingAppraisals: 0,
    submittedAppraisals: 0,
    overdueAppraisals: 0,
    pendingDisputes: 0,
    completionRate: 0,
    activeTemplates: 0,
    pendingInsuranceBrackets: 0,
  });
  const [loading, setLoading] = useState(true);

  // Check if user has specific HR roles (HR Manager only)
  const isHRManager = user?.roles.includes(Role.HR_MANAGER);
  const isHREmployee = user?.roles.includes(Role.HR_EMPLOYEE);
  const isHRAdmin = user?.roles.includes(Role.HR_ADMIN);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch employee statistics (for all HR roles)
      const employeesRes = await axios.get('/employee-profile');
      const employees = Array.isArray(employeesRes.data) 
        ? employeesRes.data 
        : (employeesRes.data?.employees || employeesRes.data?.data || []);

      const activeCount = employees.filter((emp: any) => emp.status === 'Active').length;
      const suspendedCount = employees.filter((emp: any) => emp.status === 'Suspended').length;
      const onLeaveCount = employees.filter((emp: any) => emp.status === 'On Leave').length;
      const terminatedCount = employees.filter((emp: any) => emp.status === 'Terminated').length;

      // Calculate recent hires (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentHiresCount = employees.filter((emp: any) => {
        if (!emp.dateOfHire) return false;
        const hireDate = new Date(emp.dateOfHire);
        return hireDate >= thirtyDaysAgo;
      }).length;

      // Fetch departments
      const deptRes = await axios.get('/organization-structure/departments');
      const departments = Array.isArray(deptRes.data) 
        ? deptRes.data 
        : (deptRes.data?.departments || deptRes.data?.data || []);
      const activeDepts = departments.filter((dept: any) => dept.isActive).length;

      // Fetch pending change requests
      const changeRequestsRes = await axios.get('/employee-profile/change-requests');
      const changeRequests = Array.isArray(changeRequestsRes.data) 
        ? changeRequestsRes.data 
        : (changeRequestsRes.data?.requests || changeRequestsRes.data?.data || []);
      const pendingRequests = changeRequests.filter(
        (req: any) => req.status === 'PENDING'
      ).length;

      // Fetch performance stats (for HR Manager and HR Employee)
      let performanceStats = {
        activeCycles: 0,
        activeTemplates: 0,
        totalAppraisals: 0,
        pendingAppraisals: 0,
        submittedAppraisals: 0,
        overdueAppraisals: 0,
        pendingDisputes: 0,
        completionRate: 0,
      };

      if (isHRManager || isHREmployee) {
        const cyclesResponse = await axios.get('/performance/cycles');
        const activeCycles = cyclesResponse.data.filter((c: any) => c.status === 'ACTIVE').length;

        const templatesResponse = await axios.get('/performance/templates');
        const activeTemplates = templatesResponse.data.filter((t: any) => t.isActive).length;

        performanceStats = {
          activeCycles,
          activeTemplates,
          totalAppraisals: 0,
          pendingAppraisals: 0,
          submittedAppraisals: 0,
          overdueAppraisals: 0,
          pendingDisputes: 0,
          completionRate: 0,
        };
      }

      // Fetch pending insurance brackets for HR Manager approval
      let pendingInsuranceBrackets = 0;
      if (isHRManager) {
        try {
          const bracketsRes = await axios.get('/payroll-configuration/insurance-brackets', {
            params: { status: 'draft' }
          });
          pendingInsuranceBrackets = bracketsRes.data?.length || 0;
        } catch (bracketErr) {
          console.debug('Could not fetch insurance brackets:', bracketErr);
        }
      }

      setStats({
        totalEmployees: employees.length,
        activeEmployees: activeCount,
        suspendedEmployees: suspendedCount,
        onLeaveEmployees: onLeaveCount,
        terminatedEmployees: terminatedCount,
        pendingChangeRequests: pendingRequests,
        recentHires: recentHiresCount,
        totalDepartments: activeDepts,
        ...performanceStats,
        pendingInsuranceBrackets,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async () => {
    if (!confirm('Send reminders to all managers with pending appraisals?')) return;

    try {
      const response = await axios.post('/performance/reminders/send', {});
      alert(`Reminders sent successfully to ${response.data.sent} manager(s)`);
      fetchDashboardStats();
    } catch (error: any) {
      console.error('Failed to send reminders:', error);
      alert('Failed to send reminders: ' + (error.response?.data?.message || error.message));
    }
  };

  const isSystemAdmin = user?.roles.includes(Role.SYSTEM_ADMIN);

  const handleTriggerExpiry = async () => {
    if (!confirm('Trigger shift expiry check now?')) return;

    try {
      setLoading(true);
      const response = await axios.post('/time-management/shift-assignments/check-expiring?daysBeforeExpiry=7', {});
      alert(`Expiry check triggered: ${response.data?.message || JSON.stringify(response.data)}`);
      fetchDashboardStats();
    } catch (error: any) {
      console.error('Failed to trigger expiry check:', error);
      alert('Failed to trigger expiry check: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
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

  const buttonBaseStyle = {
    padding: '0.875rem 1.75rem',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    flex: '1 1 auto',
    minWidth: '200px',
    textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#ffffff',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="HR Dashboard" role="Human Resources">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
          {/* Welcome Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            color: 'white',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: '0 0 0.5rem' }}>👔 HR Management Dashboard</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
              Centralized hub for employee management, organization structure, and performance management
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ 
            ...sectionStyle,
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderLeft: '4px solid #3b82f6',
          }}>
            <h2 style={sectionTitleStyle}>⚡ Quick Actions</h2>
            <div style={gridStyle}>
              {isHRAdmin && (
                <button 
                  onClick={() => router.push('/dashboard/hr/leaves')}
                  style={{
                    ...buttonBaseStyle,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🌴 Leave Management
                </button>
              )}
              {(isHRManager || isHRAdmin) && (
                <button 
                  onClick={() => router.push('/dashboard/hr/leaves/hr-management')}
                  style={{
                    ...buttonBaseStyle,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📋 Leaves Processing
                </button>
              )}
              <button 
                onClick={() => router.push('/dashboard/hr/terminations')}
                style={{
                  ...buttonBaseStyle,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🚪 Termination Management
              </button>
            </div>
          </div>

          {/* Employee Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
              <h3 style={{ fontSize: '1.1rem', color: '#1e40af', marginBottom: '0.5rem', fontWeight: '600' }}>Total Employees</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', color: '#1e3a8a', margin: '0.5rem 0' }}>
                {loading ? '-' : stats.totalEmployees}
              </p>
              <span style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: '500' }}>All employee records</span>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
              <h3 style={{ fontSize: '1.1rem', color: '#065f46', marginBottom: '0.5rem', fontWeight: '600' }}>Active Employees</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', color: '#064e3b', margin: '0.5rem 0' }}>
                {loading ? '-' : stats.activeEmployees}
              </p>
              <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: '500' }}>Currently active</span>
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
                {loading ? '-' : stats.pendingChangeRequests}
              </p>
              <span style={{ fontSize: '0.9rem', color: '#b45309', fontWeight: '500' }}>Change requests to review</span>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎆</div>
              <h3 style={{ fontSize: '1.1rem', color: '#581c87', marginBottom: '0.5rem', fontWeight: '600' }}>Recent Hires</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', color: '#4c1d95', margin: '0.5rem 0' }}>
                {loading ? '-' : stats.recentHires}
              </p>
              <span style={{ fontSize: '0.9rem', color: '#7c3aed', fontWeight: '500' }}>Last 30 days</span>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.15)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
              <h3 style={{ fontSize: '1.1rem', color: '#831843', marginBottom: '0.5rem', fontWeight: '600' }}>Departments</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', color: '#701a75', margin: '0.5rem 0' }}>
                {loading ? '-' : stats.totalDepartments}
              </p>
              <span style={{ fontSize: '0.9rem', color: '#db2777', fontWeight: '500' }}>Active departments</span>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏖️</div>
              <h3 style={{ fontSize: '1.1rem', color: '#78350f', marginBottom: '0.5rem', fontWeight: '600' }}>On Leave</h3>
              <p style={{ fontSize: '3rem', fontWeight: '700', color: '#713f12', margin: '0.5rem 0' }}>
                {loading ? '-' : stats.onLeaveEmployees}
              </p>
              <span style={{ fontSize: '0.9rem', color: '#d97706', fontWeight: '500' }}>Currently on leave</span>
            </div>

            {isHRManager && (
              <div style={{
                background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.15)',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                <h3 style={{ fontSize: '1.1rem', color: '#134e4a', marginBottom: '0.5rem', fontWeight: '600' }}>Insurance Brackets</h3>
                <p style={{ fontSize: '3rem', fontWeight: '700', color: stats.pendingInsuranceBrackets > 0 ? '#f59e0b' : '#115e59', margin: '0.5rem 0' }}>
                  {loading ? '-' : stats.pendingInsuranceBrackets}
                </p>
                <span style={{ fontSize: '0.9rem', color: '#0f766e', fontWeight: '500' }}>Pending approval</span>
              </div>
            )}
          </div>

          {/* Employee Management Section (All HR Roles) */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>👥 Employee Management</h2>
            <div style={gridStyle}>
              {isHRAdmin && (
                <button 
                  onClick={() => router.push('/dashboard/hr/employees/new')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ➕ Create Employee Profile
                </button>
              )}
              
              <button 
                onClick={() => router.push('/dashboard/hr/employees')}
                style={buttonBaseStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📊 View All Employees
              </button>

              {(isHRAdmin || isHRManager) && (
                <>
                  <button
                    onClick={() => router.push('/dashboard/hr/holidays')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    🎄 Holiday Configuration
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/time-exceptions')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    ⏱️ Review Time Exceptions
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/hr/change-requests')}
                    style={{ 
                      ...buttonBaseStyle, 
                      background: stats.pendingChangeRequests > 0 
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📝 Review Change Requests {stats.pendingChangeRequests > 0 && `(${stats.pendingChangeRequests})`}
                  </button>

                  <button
                    onClick={() => router.push('/dashboard/hr/attendance-corrections')}
                    style={buttonBaseStyle}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    ✅ View Correction Requests
                  </button>

                  <button 
                    onClick={() => router.push('/dashboard/hr/employee-status')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    🔄 Manage Employee Status
                  </button>
                </>
              )}

              {isHRAdmin && (
                <>
                  <button 
                    onClick={() => router.push('/dashboard/hr/roles')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    🔑 Assign Roles & Permissions
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/hr/time-management/shift-assignments')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📅 Shift Assignments
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Organization Management Section (All HR Roles) */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>🏢 Organization Management</h2>
            <div style={gridStyle}>
              <button 
                onClick={() => router.push('/org-structure/hierarchy')}
                style={buttonBaseStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🌳 View Hierarchy
              </button>

              {isHRManager && (
                <button
                  onClick={() => router.push('/dashboard/manager/time-management/schedule-rules')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📋 Scheduling Rules
                </button>
              )}

              {isHRManager && (
                <button
                  onClick={() => router.push('/dashboard/hr/overtime')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ⏰ Overtime & Short-Time
                </button>
              )}

              {isHRManager && (
                <button
                  onClick={() => router.push('/dashboard/hr/lateness')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ⏱️ Lateness Rules
                </button>
              )}

              {isHRManager && (
                <button
                  onClick={() => router.push('/dashboard/hr/repeated-lateness')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔔 Repeated Lateness Alerts
                </button>
              )}

              {isHRManager && (
                <button
                  onClick={() => router.push('/dashboard/hr/insurance-approvals')}
                  style={{ 
                    ...buttonBaseStyle, 
                    background: stats.pendingInsuranceBrackets > 0 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                      : 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🛡️ Insurance Bracket Approvals {stats.pendingInsuranceBrackets > 0 && `(${stats.pendingInsuranceBrackets})`}
                </button>
              )}

              {(isHRAdmin || isSystemAdmin) && (
                <button
                  onClick={handleTriggerExpiry}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ⚡ Trigger Expiry Check
                </button>
              )}

              {isHRAdmin && (
                <>
                  <button 
                    onClick={() => router.push('/org-structure/change-requests')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📋 Structure Change Requests
                  </button>

                  <button 
                    onClick={() => router.push('/dashboard/hr/audit')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📜 View Audit Trail
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Recruitment Management Section (HR Manager Only) */}
          {isHRManager && (
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>📢 Recruitment Management</h2>
              <div style={gridStyle}>
                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/monitoring')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📊 Recruitment Progress Dashboard
                </button>

                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/job-templates')}
                  style={buttonBaseStyle}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📝 Job Templates
                </button>

                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/hiring-process-templates')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔄 Hiring Process
                </button>

                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/requisitions')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📋 Job Requisitions
                </button>

                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/applications')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  👥 Track Applications
                </button>

                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/offers')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  💼 Manage Offers
                </button>

                <button 
                  onClick={() => router.push('/dashboard/hr/onboarding-management')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ✓ Onboarding Checklists
                </button>

                <button 
                  onClick={() => router.push('/dashboard/hr/signed-contracts')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📄 Signed Contracts
                </button>
              </div>
            </div>
          )}

          {/* Recruitment Section (HR Employee Only) */}
          {isHREmployee && !isHRManager && (
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>📢 Recruitment Management</h2>
              <div style={gridStyle}>
                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/applications')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  👥 Track Applications
                </button>

                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/offers')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  💼 Manage Offers
                </button>
                
                <button 
                  onClick={() => router.push('/dashboard/hr/recruitment/job-publishing')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📣 Publish Jobs
                </button>
              </div>
            </div>
          )}

          {/* Performance Management Section (HR Manager & HR Employee) */}
          {(isHRManager || isHREmployee) && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔄</div>
                  <h3 style={{ fontSize: '1.1rem', color: '#1e40af', marginBottom: '0.5rem', fontWeight: '600' }}>Active Cycles</h3>
                  <p style={{ fontSize: '3rem', fontWeight: '700', color: '#1e3a8a', margin: '0.5rem 0' }}>
                    {loading ? '-' : stats.activeCycles}
                  </p>
                  <span style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: '500' }}>Currently running</span>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                  <h3 style={{ fontSize: '1.1rem', color: '#065f46', marginBottom: '0.5rem', fontWeight: '600' }}>Active Templates</h3>
                  <p style={{ fontSize: '3rem', fontWeight: '700', color: '#064e3b', margin: '0.5rem 0' }}>
                    {loading ? '-' : stats.activeTemplates}
                  </p>
                  <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: '500' }}>Available for use</span>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                  <h3 style={{ fontSize: '1.1rem', color: '#581c87', marginBottom: '0.5rem', fontWeight: '600' }}>Completion Rate</h3>
                  <p style={{ fontSize: '3rem', fontWeight: '700', color: '#4c1d95', margin: '0.5rem 0' }}>
                    {loading ? '-' : `${stats.completionRate}%`}
                  </p>
                  <span style={{ fontSize: '0.9rem', color: '#7c3aed', fontWeight: '500' }}>Overall progress</span>
                </div>

                {isHRManager && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    borderRadius: '16px',
                    padding: '2rem',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
                    <h3 style={{ fontSize: '1.1rem', color: '#991b1b', marginBottom: '0.5rem', fontWeight: '600' }}>Pending Disputes</h3>
                    <p style={{ fontSize: '3rem', fontWeight: '700', color: '#7f1d1d', margin: '0.5rem 0' }}>
                      {loading ? '-' : stats.pendingDisputes}
                    </p>
                    <span style={{ fontSize: '0.9rem', color: '#dc2626', fontWeight: '500' }}>Awaiting resolution</span>
                  </div>
                )}
              </div>

              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>⭐ Performance Templates & Cycles</h2>
                <div style={gridStyle}>
                  {isHRManager && (
                    <>
                      <button 
                        onClick={() => router.push('/dashboard/hr/performance/templates')}
                        style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        📋 Appraisal Templates ({stats.activeTemplates})
                      </button>

                      <button 
                        onClick={() => router.push('/dashboard/hr/performance/templates/create')}
                        style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        ➕ Create Template
                      </button>
                    </>
                  )}

                  <button 
                    onClick={() => router.push('/dashboard/hr/performance/cycles')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    🔄 Manage Cycles ({stats.activeCycles})
                  </button>

                  <button 
                    onClick={() => router.push('/dashboard/hr/performance/cycles/create')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    ➕ Create Cycle
                  </button>
                </div>
              </div>

              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>🔍 Monitoring & Resolution</h2>
                <div style={gridStyle}>
                  <button 
                    onClick={() => router.push('/dashboard/hr/performance-dashboard')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📊 Progress Dashboard
                  </button>

                  {stats.overdueAppraisals > 0 && (
                    <button 
                      onClick={handleSendReminders}
                      style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      🔔 Send Reminders ({stats.overdueAppraisals})
                    </button>
                  )}

                  {isHRManager && (
                    <button 
                      onClick={() => router.push('/dashboard/hr/performance/disputes')}
                      style={{ 
                        ...buttonBaseStyle, 
                        background: stats.pendingDisputes > 0 
                          ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' 
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      ⚖️ Resolve Disputes {stats.pendingDisputes > 0 && `(${stats.pendingDisputes})`}
                    </button>
                  )}

                  <button 
                    onClick={() => router.push('/dashboard/hr/performance/archived')}
                    style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    📦 Archived Records
                  </button>
                </div>
              </div>
          </>
        )}

          {/* Reports & Analytics Section (All HR Roles) */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>📈 Reports & Analytics</h2>
            <div style={gridStyle}>
              <button 
                onClick={() => router.push('/dashboard/hr/reports')}
                style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📊 Generate Reports
              </button>

              {(isHRManager || isHREmployee) && (
                <button 
                  onClick={() => router.push('/dashboard/hr/performance/reports')}
                  style={{ ...buttonBaseStyle, background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  📉 Performance Trends
                </button>
              )}
            </div>
          </div>

          {/* Urgent Alerts */}
          {!loading && (stats.overdueAppraisals > 0 || stats.pendingDisputes > 0 || stats.pendingChangeRequests > 0) && (
            <div style={{ 
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', 
              border: '2px solid #dc2626',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
            }}>
              <h2 style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ Attention Required
              </h2>
              {stats.pendingChangeRequests > 0 && (isHRAdmin || isHRManager) && (
                <p style={{ marginBottom: '0.5rem', color: '#991b1b', fontSize: '1rem' }}>
                  • {stats.pendingChangeRequests} employee change request{stats.pendingChangeRequests > 1 ? 's' : ''} awaiting review
                </p>
              )}
              {stats.overdueAppraisals > 0 && (isHRManager || isHREmployee) && (
                <p style={{ marginBottom: '0.5rem', color: '#991b1b', fontSize: '1rem' }}>
                  • {stats.overdueAppraisals} overdue appraisal{stats.overdueAppraisals > 1 ? 's' : ''} requiring immediate action
                </p>
              )}
              {stats.pendingDisputes > 0 && isHRManager && (
                <p style={{ marginBottom: '1rem', color: '#991b1b', fontSize: '1rem' }}>
                  • {stats.pendingDisputes} pending dispute{stats.pendingDisputes > 1 ? 's' : ''} awaiting resolution
                </p>
              )}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                {stats.pendingChangeRequests > 0 && (isHRAdmin || isHRManager) && (
                  <button 
                    onClick={() => router.push('/dashboard/hr/change-requests')}
                    style={{ 
                      padding: '0.875rem 1.5rem',
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Review Change Requests
                  </button>
                )}
                {stats.overdueAppraisals > 0 && (isHRManager || isHREmployee) && (
                  <button 
                    onClick={handleSendReminders}
                    style={{ 
                      padding: '0.875rem 1.5rem',
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Send Reminders
                  </button>
                )}
                {stats.pendingDisputes > 0 && isHRManager && (
                  <button 
                    onClick={() => router.push('/dashboard/hr/performance/disputes')}
                    style={{ 
                      padding: '0.875rem 1.5rem',
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Resolve Disputes
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
