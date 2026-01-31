/**
 * Manager Team Overview Page
 * US-E4-01: View team members'profiles (excluding sensitive info)
 * US-E4-02: See summary of team's job titles and departments
 * BR 41b: Direct Managers see their team only
 * BR 18b: Privacy restrictions applied (sensitive data excluded)
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';

// Team member profile (sensitive data excluded per BR 18b)
interface TeamMemberProfile {
  _id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  workEmail?: string;
  status: string;
  profilePictureUrl?: string;
  primaryPositionId?: {
    _id: string;
    title: string;
    code: string;
  };
  primaryDepartmentId?: {
    _id: string;
    name: string;
    code: string;
  };
  dateOfHire?: string;
  contractType?: string;
}

// Team summary for statistics
interface TeamSummary {
  totalMembers: number;
  byDepartment: { [key: string]: number };
  byPosition: { [key: string]: number };
  byStatus: { [key: string]: number };
}

export default function ManagerTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterPosition, setFilterPosition] = useState<string>('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError('');
      
      let profiles: TeamMemberProfile[] = [];
      
      // Try team/profiles first (uses supervisorPositionId)
      try {
        const profilesRes = await axios.get('/employee-profile/team/profiles');
        profiles = Array.isArray(profilesRes.data) ? profilesRes.data : [];
      } catch (e) {
        // Ignore and try fallback
      }
      
      // If no profiles found, try performance/team which uses department-based lookup
      if (profiles.length === 0) {
        try {
          const perfRes = await axios.get('/performance/team');
          // This returns { totalMembers, teamMembers, totalAssignments }
          if (perfRes.data?.teamMembers && Array.isArray(perfRes.data.teamMembers)) {
            // Transform performance team data to our format
            profiles = perfRes.data.teamMembers.map((tm: any) => ({
              _id: tm.employee?._id || tm.employee,
              employeeNumber: tm.employee?.employeeNumber || '',
              firstName: tm.employee?.firstName || '',
              lastName: tm.employee?.lastName || '',
              workEmail: tm.employee?.email || '',
              status: 'ACTIVE', // Performance endpoint doesn't return status
              primaryPositionId: tm.employee?.primaryPositionId,
              primaryDepartmentId: tm.employee?.primaryDepartmentId,
            }));
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Final fallback: try team/assigned endpoint
      if (profiles.length === 0) {
        try {
          const assignedRes = await axios.get('/employee-profile/team/assigned');
          if (Array.isArray(assignedRes.data)) {
            profiles = assignedRes.data;
          } else if (assignedRes.data?.results && Array.isArray(assignedRes.data.results)) {
            profiles = assignedRes.data.results;
          }
        } catch (e) {
          // Ignore
        }
      }
      
      setTeamMembers(profiles);
      
      // Calculate summary (US-E4-02)
      const summary: TeamSummary = {
        totalMembers: profiles.length,
        byDepartment: {},
        byPosition: {},
        byStatus: {},
      };
      
      profiles.forEach((member: TeamMemberProfile) => {
        // Count by department
        const deptName = member.primaryDepartmentId?.name || 'Unassigned';
        summary.byDepartment[deptName] = (summary.byDepartment[deptName] || 0) + 1;
        
        // Count by position
        const posTitle = member.primaryPositionId?.title || 'Unassigned';
        summary.byPosition[posTitle] = (summary.byPosition[posTitle] || 0) + 1;
        
        // Count by status
        const status = member.status || 'Unknown';
        summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      });
      
      setTeamSummary(summary);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments and positions for filters
  const departments = [...new Set(teamMembers.map(m => m.primaryDepartmentId?.name || 'Unassigned'))];
  const positions = [...new Set(teamMembers.map(m => m.primaryPositionId?.title || 'Unassigned'))];

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.workEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === 'ALL' || 
      (member.primaryDepartmentId?.name || 'Unassigned') === filterDepartment;
    
    const matchesPosition = filterPosition === 'ALL' || 
      (member.primaryPositionId?.title || 'Unassigned') === filterPosition;
    
    return matchesSearch && matchesDepartment && matchesPosition;
  });

  const handleViewProfile = (employeeId: string) => {
    router.push(`/team/${employeeId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return { bg: '#d1fae5', color: '#065f46', border: '#10b981' };
      case 'ON_LEAVE': return { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' };
      case 'SUSPENDED': return { bg: '#fee2e2', color: '#991b1b', border: '#ef4444' };
      case 'PROBATION': return { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' };
      default: return { bg: '#f3f4f6', color: '#374151', border: '#9ca3af' };
    }
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
               My Team
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', margin: 0 }}>
              {teamSummary?.totalMembers || 0} direct reports
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

        {/* Team Summary Stats - US-E4-02 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Total Members */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            color: 'white'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}> Team Members</h3>
            <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{teamSummary?.totalMembers || 0}</p>
          </div>

          {/* Active Members */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            color: 'white'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}> Active</h3>
            <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>
              {teamSummary?.byStatus?.['ACTIVE'] || 0}
            </p>
          </div>

          {/* Departments Count */}
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            color: 'white'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}> Departments</h3>
            <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{Object.keys(teamSummary?.byDepartment || {}).length}</p>
          </div>

          {/* Positions Count */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            color: 'white'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}> Job Titles</h3>
            <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0, lineHeight: 1 }}>{Object.keys(teamSummary?.byPosition || {}).length}</p>
          </div>
        </div>

        {/* Department and Position Summary - US-E4-02 */}
        {teamSummary && (Object.keys(teamSummary.byDepartment).length > 0 || Object.keys(teamSummary.byPosition).length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* By Department */}
            {Object.keys(teamSummary.byDepartment).length > 0 && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   By Department
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(teamSummary.byDepartment).map(([dept, count]) => (
                    <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>{dept}</span>
                      <span style={{ 
                        background: '#eef2ff', 
                        color: '#4f46e5', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Job Title */}
            {Object.keys(teamSummary.byPosition).length > 0 && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   By Job Title
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(teamSummary.byPosition).map(([pos, count]) => (
                    <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>{pos}</span>
                      <span style={{ 
                        background: '#fef3c7', 
                        color: '#92400e', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search and Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text" placeholder="Search by name, employee number, or email..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
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
          
          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            style={{
              padding: '0.875rem 1.25rem',
              fontSize: '1rem',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              outline: 'none',
              background: 'white',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="ALL">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Position Filter */}
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            style={{
              padding: '0.875rem 1.25rem',
              fontSize: '1rem',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              outline: 'none',
              background: 'white',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="ALL">All Job Titles</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          
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
             Refresh
          </button>
        </div>

        {/* Results count */}
        <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Showing {filteredMembers.length} of {teamMembers.length} team members
        </p>

        {/* Team Members Grid - US-E4-01 (sensitive data excluded per BR 18b) */}
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
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', marginBottom: '0.75rem' }}>No Team Members Found</h2>
              <p style={{ fontSize: '1.05rem', color: '#6b7280', margin: 0 }}>
                {searchTerm || filterDepartment !== 'ALL' || filterPosition !== 'ALL' 
                  ? 'No team members found matching your filters.' 
                  : 'No team members assigned to you.'}
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const statusColors = getStatusColor(member.status);
              return (
                <div key={member._id} style={{
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
                    {/* Avatar */}
                    {member.profilePictureUrl ? (
                      <img 
                        src={member.profilePictureUrl} 
                        alt={`${member.firstName} ${member.lastName}`}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    ) : (
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
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                          {member.firstName} {member.lastName}
                        </h3>
                        {/* Status Badge */}
                        <span style={{
                          background: statusColors.bg,
                          color: statusColors.color,
                          border: `1px solid ${statusColors.border}`,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {member.status?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
                        #{member.employeeNumber || member._id.slice(-8)}
                      </p>
                    </div>
                  </div>

                  {/* Member Details - US-E4-01, US-E4-02 (showing job title and department) */}
                  <div style={{ padding: '1.5rem' }}>
                    {/* Job Title */}
                    <div style={{ marginBottom: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span style={{ color: '#6b7280', minWidth: '90px', fontSize: '0.95rem' }}> Position:</span>
                      <span style={{ color: '#374151', fontWeight: '600', flex: 1, fontSize: '0.95rem' }}>
                        {member.primaryPositionId?.title || 'Unassigned'}
                      </span>
                    </div>
                    
                    {/* Department */}
                    <div style={{ marginBottom: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span style={{ color: '#6b7280', minWidth: '90px', fontSize: '0.95rem' }}> Department:</span>
                      <span style={{ color: '#374151', fontWeight: '500', flex: 1, fontSize: '0.95rem' }}>
                        {member.primaryDepartmentId?.name || 'Unassigned'}
                      </span>
                    </div>

                    {/* Work Email - Not sensitive, can be shown */}
                    {member.workEmail && (
                      <div style={{ marginBottom: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#6b7280', minWidth: '90px', fontSize: '0.95rem' }}> Email:</span>
                        <span style={{ color: '#374151', fontWeight: '500', flex: 1, wordBreak: 'break-word', fontSize: '0.95rem' }}>
                          {member.workEmail}
                        </span>
                      </div>
                    )}

                    {/* Contract Type */}
                    {member.contractType && (
                      <div style={{ marginBottom: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#6b7280', minWidth: '90px', fontSize: '0.95rem' }}> Contract:</span>
                        <span style={{ color: '#374151', fontWeight: '500', flex: 1, fontSize: '0.95rem' }}>
                          {member.contractType.replace('_', ' ')}
                        </span>
                      </div>
                    )}

                    {/* Hire Date */}
                    {member.dateOfHire && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#6b7280', minWidth: '90px', fontSize: '0.95rem' }}> Joined:</span>
                        <span style={{ color: '#374151', fontWeight: '500', flex: 1, fontSize: '0.95rem' }}>
                          {formatDate(member.dateOfHire)}
                        </span>
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
                      onClick={() => handleViewProfile(member._id)}
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
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}