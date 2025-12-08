/**
 * Manager Team View Page (Route: /team)
 * US-E4-01: View team members' profiles (excluding sensitive info)
 * US-E4-02: See summary of team's job titles and departments
 * BR 41b: Direct Managers see their team only
 * BR 18b: Privacy restrictions applied for Department Managers
 * Phase II: Manager Insight
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { TeamMemberSummary, EmployeeStatus } from '@/lib/types/employee-profile.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './team.module.css';

export default function TeamViewPage() {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/employee-profile/team/profiles');
      setTeamMembers(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueDepartments = () => {
    const departments = teamMembers.map(member => member.department);
    return Array.from(new Set(departments)).filter(Boolean);
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || member.status === filterStatus;
    const matchesDepartment = filterDepartment === 'ALL' || member.department === filterDepartment;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const getStatusClass = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return styles.statusActive;
      case EmployeeStatus.ON_LEAVE:
        return styles.statusOnLeave;
      default:
        return styles.statusInactive;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewProfile = (memberId: string) => {
    router.push(`/team/${memberId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[
        Role.DEPARTMENT_HEAD,
        Role.DEPARTMENT_HEAD,
        Role.DEPARTMENT_HEAD,
        Role.HR_MANAGER,
        Role.SYSTEM_ADMIN
      ]}>
        <Spinner fullScreen message="Loading team members..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[
      Role.DEPARTMENT_HEAD,
      Role.DEPARTMENT_HEAD,
      Role.DEPARTMENT_HEAD,
      Role.HR_MANAGER,
      Role.SYSTEM_ADMIN
    ]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>My Team</h1>
            <p className={styles.subtitle}>
              {filteredMembers.length} team member{filteredMembers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Filters and Search */}
        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search by name, email, or position..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.filters}>
            <select
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value={EmployeeStatus.ACTIVE}>Active</option>
              <option value={EmployeeStatus.ON_LEAVE}>On Leave</option>
              <option value={EmployeeStatus.SUSPENDED}>Suspended</option>
            </select>

            <select
              className={styles.filterSelect}
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {getUniqueDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Summary Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{teamMembers.length}</div>
            <div className={styles.statLabel}>Total Team Members</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {teamMembers.filter(m => m.status === EmployeeStatus.ACTIVE).length}
            </div>
            <div className={styles.statLabel}>Active</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {teamMembers.filter(m => m.status === EmployeeStatus.ON_LEAVE).length}
            </div>
            <div className={styles.statLabel}>On Leave</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {getUniqueDepartments().length}
            </div>
            <div className={styles.statLabel}>Departments</div>
          </div>
        </div>

        {/* Team Members Grid */}
        {filteredMembers.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No team members found matching your criteria</p>
          </div>
        ) : (
          <div className={styles.teamGrid}>
            {filteredMembers.map((member) => (
              <div key={member._id} className={styles.memberCard}>
                <div className={styles.memberHeader}>
                  <div className={styles.memberAvatar}>
                    {member.profilePicture ? (
                      <img src={member.profilePicture} alt={member.firstName} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div className={`${styles.statusBadge} ${getStatusClass(member.status)}`}>
                    {member.status.replace('_', ' ')}
                  </div>
                </div>

                <div className={styles.memberInfo}>
                  <h3 className={styles.memberName}>
                    {member.firstName} {member.lastName}
                  </h3>
                  <p className={styles.memberPosition}>{member.position}</p>
                  <p className={styles.memberDepartment}>{member.department}</p>
                  <p className={styles.memberEmail}>{member.email}</p>
                  <p className={styles.memberDate}>
                    Joined {formatDate(member.dateOfHire)}
                  </p>
                </div>

                <button
                  className={styles.viewButton}
                  onClick={() => handleViewProfile(member._id)}
                >
                  View Profile →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
