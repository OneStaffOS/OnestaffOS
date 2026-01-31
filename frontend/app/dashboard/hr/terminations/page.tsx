/**
 * HR Termination Management Page
 * View and manage all termination requests
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function TerminationsPage() {
  const router = useRouter();
  const [terminations, setTerminations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTerminations();
    fetchStatistics();
  }, [filter]);

  const fetchTerminations = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await axios.get('/recruitment/termination', { params });
      setTerminations(response.data);
    } catch (err: any) {
      console.error('Failed to fetch terminations:', err);
      setError(err.response?.data?.message || 'Failed to load terminations');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/recruitment/termination/statistics');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      under_review: '#3b82f6',
      approved: '#10b981',
      rejected: '#ef4444',
    };

    return (
      <span
        style={{ 
          padding: '0.5rem 1rem',
          background: colors[status] || '#6b7280',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
        }}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getInitiatorBadge = (initiator: string) => {
    const colors: Record<string, string> = {
      employee: '#8b5cf6',
      hr: '#3b82f6',
      manager: '#f59e0b',
    };

    return (
      <span
        style={{ 
          padding: '0.5rem 1rem',
          background: colors[initiator] || '#6b7280',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
        }}
      >
        {initiator}
      </span>
    );
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN]}>
      <DashboardLayout title="Termination Management" role="HR Manager">
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
               Termination & Offboarding Management
            </h1>
          </div>

          {/* Statistics */}
          {stats && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
              }}>
                <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}> Total Terminations</h3>
                <p style={{ color: 'white', fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{stats.total}</p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.3s ease',
              }}>
                <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}> Pending</h3>
                <p style={{ color: 'white', fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{stats.byStatus.pending}</p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.3s ease',
              }}>
                <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}> Under Review</h3>
                <p style={{ color: 'white', fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{stats.byStatus.underReview}</p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease',
              }}>
                <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}> Approved</h3>
                <p style={{ color: 'white', fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{stats.byStatus.approved}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {[
              { value: 'all', label: 'All', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' },
              { value: 'pending', label: 'Pending', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
              { value: 'under_review', label: 'Under Review', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
              { value: 'approved', label: 'Approved', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
              { value: 'rejected', label: 'Rejected', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
            ].map((btn) => (
              <button
                key={btn.value}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: filter === btn.value ? btn.gradient : 'white',
                  color: filter === btn.value ? 'white' : '#6b7280',
                  border: filter === btn.value ? 'none' : '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  boxShadow: filter === btn.value ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (filter !== btn.value) {
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.color = '#374151';
                  }
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (filter !== btn.value) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '#6b7280';
                  }
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => setFilter(btn.value)}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '2px solid #dc2626',
              borderRadius: '12px',
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              color: '#991b1b',
              fontSize: '1rem',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <Spinner message="Loading terminations..." />
          ) : terminations.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', marginBottom: '0.75rem' }}>No Termination Requests</h2>
              <p style={{ fontSize: '1.05rem', color: '#6b7280', margin: 0 }}>No termination requests match the selected filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {terminations.map((termination) => (
                <div key={termination._id} style={{
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
                        {termination.employeeId?.firstName} {termination.employeeId?.lastName}
                      </h3>
                      <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>{termination.employeeId?.email}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {getInitiatorBadge(termination.initiator)}
                      {getStatusBadge(termination.status)}
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <strong style={{ color: '#374151', minWidth: '180px' }}>Reason:</strong>
                      <span style={{ color: '#6b7280' }}>{termination.reason}</span>
                    </div>

                    {termination.employeeComments && (
                      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <strong style={{ color: '#374151', minWidth: '180px' }}>Employee Comments:</strong>
                        <span style={{ color: '#6b7280' }}>{termination.employeeComments}</span>
                      </div>
                    )}

                    {termination.terminationDate && (
                      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <strong style={{ color: '#374151', minWidth: '180px' }}>Termination Date:</strong>
                        <span style={{ color: '#6b7280' }}>
                          {new Date(termination.terminationDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <strong style={{ color: '#374151', minWidth: '180px' }}>Submitted:</strong>
                      <span style={{ color: '#6b7280' }}>{new Date(termination.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{
                    padding: '1.25rem 1.5rem',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() =>
                        router.push(`/dashboard/hr/terminations/${termination._id}`)
                      }
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      View Details
                    </button>
                    {termination.status === 'approved' && (
                      <button
                        onClick={() =>
                          router.push(`/dashboard/hr/terminations/${termination._id}/clearance`)
                        }
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        Manage Clearance
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}