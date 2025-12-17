/**
 * Manager Team Overview Page
 * REQ-PP-13: View all direct reports and their performance status
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  email: string;
  phoneNumber?: string;
}

interface TeamMember {
  employee: Employee;
  assignments: any[];
  latestCycle: any;
  totalAppraisals: number;
  completedAppraisals: number;
}

interface TeamData {
  totalMembers: number;
  teamMembers: TeamMember[];
  totalAssignments: number;
}

export default function ManagerTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/performance/team');
      setTeamData(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamData?.teamMembers.filter(member =>
    `${member.employee.firstName} ${member.employee.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    member.employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleViewProfile = (employeeId: string) => {
    router.push(`/profile/${employeeId}`);
  };

  const handleViewAppraisals = (employeeId: string) => {
    router.push(`/dashboard/manager/performance-dashboard?employee=${employeeId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
        <Spinner fullScreen message="Loading team data..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
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
              👥 My Team
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', margin: 0 }}>
              {teamData?.totalMembers || 0} direct reports
            </p>
          </div>
          <button 
            onClick={() => router.back()}
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
            ← Back
          </button>
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

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            color: 'white'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>👥 Team Members</h3>
            <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{teamData?.totalMembers || 0}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            color: 'white'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>📋 Total Appraisals</h3>
            <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{teamData?.totalAssignments || 0}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            color: 'white'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>✅ Completed</h3>
            <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>
              {teamData?.teamMembers.reduce((sum, m) => sum + m.completedAppraisals, 0) || 0}
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            color: 'white'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>⏳ Pending</h3>
            <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>
              {(teamData?.totalAssignments || 0) - (teamData?.teamMembers.reduce((sum, m) => sum + m.completedAppraisals, 0) || 0)}
            </p>
          </div>
        </div>

        {/* Search and Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="🔍 Search by name or employee number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '0.875rem 1.25rem',
              fontSize: '1rem',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          />
          <button
            onClick={fetchTeamData}
            style={{
              padding: '0.875rem 1.75rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Team Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredMembers.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              background: 'white',
              borderRadius: '16px',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👥</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', marginBottom: '0.75rem' }}>No Team Members Found</h2>
              <p style={{ fontSize: '1.05rem', color: '#6b7280', margin: 0 }}>
                {searchTerm ? 'No team members found matching your search.' : 'No team members assigned.'}
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div key={member.employee._id} style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                {/* Member Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  padding: '1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}>
                    {member.employee.firstName[0]}{member.employee.lastName[0]}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0, marginBottom: '0.25rem' }}>
                      {member.employee.firstName} {member.employee.lastName}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>#{typeof member.employee.employeeNumber === 'string' ? member.employee.employeeNumber : member.employee._id}</p>
                  </div>
                </div>

                {/* Member Details */}
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ color: '#6b7280', minWidth: '80px', fontSize: '0.95rem' }}>✉️ Email:</span>
                    <span style={{ color: '#374151', fontWeight: '500', flex: 1, wordBreak: 'break-word', fontSize: '0.95rem' }}>{member.employee.email}</span>
                  </div>
                  {member.employee.phoneNumber && (
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span style={{ color: '#6b7280', minWidth: '80px', fontSize: '0.95rem' }}>📞 Phone:</span>
                      <span style={{ color: '#374151', fontWeight: '500', flex: 1, fontSize: '0.95rem' }}>{member.employee.phoneNumber}</span>
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ color: '#6b7280', minWidth: '80px', fontSize: '0.95rem' }}>📋 Appraisals:</span>
                    <span style={{ color: '#374151', fontWeight: '500', flex: 1, fontSize: '0.95rem' }}>
                      {member.completedAppraisals} / {member.totalAppraisals} completed
                    </span>
                  </div>
                  {member.latestCycle && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span style={{ color: '#6b7280', minWidth: '80px', fontSize: '0.95rem' }}>🔄 Latest Cycle:</span>
                      <span style={{ color: '#374151', fontWeight: '500', flex: 1, fontSize: '0.95rem' }}>{member.latestCycle.cycleId?.name || 'N/A'}</span>
                    </div>
                  )}
                </div>

                {/* Member Actions */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  background: '#f9fafb',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => handleViewProfile(member.employee._id)}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: '#667eea',
                      border: '2px solid #667eea',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#667eea';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#667eea';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => handleViewAppraisals(member.employee._id)}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    View Appraisals
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
