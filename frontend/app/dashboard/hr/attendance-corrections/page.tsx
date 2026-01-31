"use client";

import { useEffect, useState } from 'react';
import axios from '@/lib/axios-config';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '../../../components/Spinner';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function HrAttendanceCorrectionsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/time-management/correction-requests');
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to fetch correction requests', err);
    } finally {
      setLoading(false);
    }
  };

  const process = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await axios.put(`/time-management/correction-requests/${id}/process`, { status });
      await fetchData();
    } catch (err) {
      console.error('Process failed', err);
      alert('Failed to update request');
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { gradient: string; label: string }> = {
      PENDING: { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', label: 'Pending' },
      APPROVED: { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', label: 'Approved' },
      REJECTED: { gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', label: 'Rejected' },
    };
    const config = configs[status] || { gradient: '#6b7280', label: status };
    return (
      <span style={{
        padding: '0.5rem 1rem',
        background: config.gradient,
        color: 'white',
        borderRadius: '8px',
        fontSize: '0.8rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
      }}>
        {config.label}
      </span>
    );
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER, SystemRole.HR_ADMIN]}>
      <DashboardLayout title="Attendance Corrections (HR)" role="HR">
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
               Attendance Correction Requests
            </h1>
          </div>

          {loading ? <Spinner message="Loading correction requests..." /> : (
            requests.length === 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', marginBottom: '0.75rem' }}>No Correction Requests</h2>
                <p style={{ fontSize: '1.05rem', color: '#6b7280', margin: 0 }}>There are no attendance correction requests at this time.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {requests.map((rq: any) => (
                  <div key={rq._id} style={{
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
                          {(rq.employeeId && (rq.employeeId.firstName || rq.employeeId._id)) ? `${rq.employeeId.firstName || ''} ${rq.employeeId.lastName || ''}`.trim() : (rq.employeeId || 'Employee')}
                        </h3>
                        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{new Date(rq.createdAt).toLocaleString()}</span>
                      </div>
                      <div>
                        {getStatusBadge(rq.status)}
                      </div>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Reason:</strong>
                        <p style={{ color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{rq.reason}</p>
                      </div>
                    </div>

                    {rq.status === 'PENDING' && (
                      <div style={{
                        padding: '1.25rem 1.5rem',
                        background: '#f9fafb',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => process(rq._id, 'APPROVED')}
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
                           Approve
                        </button>
                        <button
                          onClick={() => process(rq._id, 'REJECTED')}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                           Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}