/**
 * Unified Leave Management Dashboard (Route: /dashboard/hr/leaves)
 * Policy Setup, Configuration & Management
 * Accessible by: HR Admin, System Admin
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';

interface DashboardStats {
  totalCategories: number;
  totalLeaveTypes: number;
  totalPolicies: number;
  totalEntitlements: number;
  pendingRequests: number;
  approvedThisMonth: number;
  totalAdjustments: number;
  currentYear: number;
}

export default function LeaveManagementDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalCategories: 0,
    totalLeaveTypes: 0,
    totalPolicies: 0,
    totalEntitlements: 0,
    pendingRequests: 0,
    approvedThisMonth: 0,
    totalAdjustments: 0,
    currentYear: new Date().getFullYear(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all stats in parallel
      const [categoriesRes, typesRes, policiesRes, requestsRes] = await Promise.all([
        axios.get('/leaves/categories').catch(() => ({ data: [] })),
        axios.get('/leaves/types').catch(() => ({ data: [] })),
        axios.get('/leaves/policies').catch(() => ({ data: [] })),
        axios.get('/leaves/requests').catch(() => ({ data: [] })),
      ]);

      const pendingRequests = requestsRes.data.filter((r: any) => r.status === 'pending').length;
      const approvedThisMonth = requestsRes.data.filter((r: any) => {
        if (r.status !== 'approved') return false;
        const approvedDate = new Date(r.updatedAt);
        const now = new Date();
        return approvedDate.getMonth() === now.getMonth() && 
               approvedDate.getFullYear() === now.getFullYear();
      }).length;

      setStats({
        totalCategories: categoriesRes.data.length,
        totalLeaveTypes: typesRes.data.length,
        totalPolicies: policiesRes.data.length,
        totalEntitlements: 0,
        pendingRequests,
        approvedThisMonth,
        totalAdjustments: 0,
        currentYear: new Date().getFullYear(),
      });
    } catch (error) {
      console.error('Failed to fetch leave stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const featureButtons = [
    {
      title: 'Policy Configuration Initiation',
      description: 'Initiate leave configuration process, define and manage leave policies',
      route: '/dashboard/hr/leaves/policy-config',
    },
    {
      title: 'Configure Leave Settings',
      description: 'Accrual rates, carry-over, waiting periods, rounding methods',
      route: '/dashboard/hr/leaves/policies',
    },
    {
      title: 'Update Entitlement Calculations',
      description: 'Update scheduling logic and balance computation rules',
      route: '/dashboard/hr/leaves/entitlement-calc',
    },
    {
      title: 'Set Eligibility Rules',
      description: 'Minimum tenure, employee type, position-based rules',
      route: '/dashboard/hr/leaves/eligibility',
    },
    {
      title: 'Assign Personalized Entitlements',
      description: 'Individual employee or group entitlement packages',
      route: '/dashboard/hr/leaves/entitlements',
    },
    {
      title: 'Configure Leave Parameters',
      description: 'Max duration, notice periods, approval workflows',
      route: '/dashboard/hr/leaves/parameters',
    },
    {
      title: 'Configure Calendar & Blocked Days',
      description: 'Public holidays, company closures, blocked periods',
      route: '/dashboard/hr/leaves/calendar',
    },
    {
      title: 'Configure Special Absence Types',
      description: 'Bereavement, jury duty, medical quarantine',
      route: '/dashboard/hr/leaves/special-types',
    },
    {
      title: 'Define Leave Year & Reset Rules',
      description: 'Legal leave year, balance reset criteria',
      route: '/dashboard/hr/leaves/reset-rules',
    },
    {
      title: 'Manual Balance Adjustment',
      description: 'Corrections, carry-overs, one-time grants with audit trail',
      route: '/dashboard/hr/leaves/adjustments',
    },
    {
      title: 'Manage Roles & Permissions',
      description: 'Control who can request, approve, or view leave',
      route: '/dashboard/hr/leaves/roles',
    },
    {
      title: 'Manage Leave Requests',
      description: 'View, approve, or reject employee leave requests',
      route: '/dashboard/hr/leaves/requests',
    },
    {
      title: 'HR Leave Management',
      description: 'Finalize requests, override decisions, bulk processing, verify medical docs',
      route: '/dashboard/hr/leaves/hr-management',
      highlight: true,
    },
  ];

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leave Management" role="HR Admin">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div>
              <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: '700', margin: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                🏖️ Leave Management System
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', margin: 0 }}>
                Comprehensive leave policy configuration and management
              </p>
            </div>
            <button 
              onClick={() => router.push('/dashboard/hr')}
              style={{
                padding: '0.875rem 1.75rem',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
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
              ← Back to HR Dashboard
            </button>
          </div>

          {/* Statistics Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '1.5rem',
            marginBottom: '3rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📁 Leave Categories</div>
              <div style={{ color: 'white', fontSize: '3rem', fontWeight: '700', lineHeight: 1 }}>{loading ? '-' : stats.totalCategories}</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📄 Leave Types</div>
              <div style={{ color: 'white', fontSize: '3rem', fontWeight: '700', lineHeight: 1 }}>{loading ? '-' : stats.totalLeaveTypes}</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📋 Policies Configured</div>
              <div style={{ color: 'white', fontSize: '3rem', fontWeight: '700', lineHeight: 1 }}>{loading ? '-' : stats.totalPolicies}</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⏳ Pending Requests</div>
              <div style={{ color: 'white', fontSize: '3rem', fontWeight: '700', lineHeight: 1 }}>{loading ? '-' : stats.pendingRequests}</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✅ Approved This Month</div>
              <div style={{ color: 'white', fontSize: '3rem', fontWeight: '700', lineHeight: 1 }}>{loading ? '-' : stats.approvedThisMonth}</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 Current Leave Year</div>
              <div style={{ color: 'white', fontSize: '3rem', fontWeight: '700', lineHeight: 1 }}>{stats.currentYear}</div>
            </div>
          </div>

          {/* Features Section */}
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>Leave Management Features</h2>
              <p style={{ fontSize: '1.1rem', color: '#6b7280', margin: 0 }}>
                Configure and manage all aspects of employee leave
              </p>
            </div>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem'
            }}>
              {featureButtons.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => router.push(feature.route)}
                  style={{ 
                    background: (feature as any).highlight 
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '1.75rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: (feature as any).highlight 
                      ? '0 4px 12px rgba(139, 92, 246, 0.3)' 
                      : '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.5rem', color: 'white' }}>
                      {feature.title}
                    </h3>
                    <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.9)', margin: 0, lineHeight: 1.5 }}>
                      {feature.description}
                    </p>
                  </div>
                  <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.8)' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
