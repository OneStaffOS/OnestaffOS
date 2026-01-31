/**
 * Employee Profile View Page (Route: /profile/[id])
 * US-E4-01: Department heads view team members' profiles (non-sensitive data)
 * BR 41b: Direct Managers see their team only
 * BR 18b: Privacy restrictions applied for Department Managers
 * Phase II: Manager View
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { EmployeeProfile, EmployeeStatus } from '@/lib/types/employee-profile.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from '../page.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface PositionAssignment {
  _id: string;
  employeeProfileId: string;
  positionId: {
    _id: string;
    title: string;
    code: string;
  };
  departmentId: {
    _id: string;
    name: string;
    code: string;
  };
  startDate: string;
  endDate?: string;
}

export default function EmployeeProfileViewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<PositionAssignment | null>(null);
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employeeId) {
      fetchProfile();
    }
  }, [employeeId]);

  useEffect(() => {
    if (profile?._id) {
      fetchCurrentAssignment();
      fetchQualifications();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/employee-profile/${employeeId}`);
      setProfile(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentAssignment = async () => {
    try {
      const response = await axios.get(`/organization-structure/employees/${profile?._id}/assignments`);
      const assignments = response.data;
      
      // Find current active assignment
      const active = assignments.find((a: PositionAssignment) => !a.endDate);
      setCurrentAssignment(active || null);
    } catch (err: any) {
      console.error('Failed to fetch assignment:', err);
    }
  };

  const fetchQualifications = async () => {
    try {
      const response = await axios.get(`/employee-profile/${employeeId}/qualifications`);
      setQualifications(response.data);
    } catch (err: any) {
      console.error('Failed to fetch qualifications:', err);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusClass = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return styles.statusActive;
      case EmployeeStatus.ON_LEAVE:
        return styles.statusOnLeave;
      case EmployeeStatus.PROBATION:
        return styles.statusProbation;
      default:
        return styles.statusInactive;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[
        Role.DEPARTMENT_HEAD,
        Role.HR_ADMIN,
        Role.HR_MANAGER,
        Role.SYSTEM_ADMIN
      ]}>
        <Spinner fullScreen message="Loading employee profile..." />
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={[
        Role.DEPARTMENT_HEAD,
        Role.HR_ADMIN,
        Role.HR_MANAGER,
        Role.SYSTEM_ADMIN
      ]}>
        <div className={styles.container}>
          <div className={styles.errorMessage}>{error}</div>
          <button onClick={() => router.back()} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute requiredRoles={[
        Role.DEPARTMENT_HEAD,
        Role.HR_ADMIN,
        Role.HR_MANAGER,
        Role.SYSTEM_ADMIN
      ]}>
        <div className={styles.container}>
          <div className={styles.errorMessage}>Employee profile not found</div>
          <button onClick={() => router.back()} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[
      Role.DEPARTMENT_HEAD,
      Role.HR_ADMIN,
      Role.HR_MANAGER,
      Role.SYSTEM_ADMIN
    ]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Back
          </button>
          <h1 className={styles.title}>Employee Profile</h1>
          <div className={`${styles.status} ${getStatusClass(profile.status)}`}>
            {profile.status}
          </div>
        </div>

        <div className={styles.profileCard}>
          {/* Profile Header */}
          <div className={styles.profileHeader}>
            <div className={styles.profileAvatar}>
              {profile.profilePictureUrl ? (
                <img src={profile.profilePictureUrl} alt={`${profile.firstName} ${profile.lastName}`} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
              )}
            </div>
            <div className={styles.profileInfo}>
              <h2 className={styles.profileName}>
                {profile.firstName} {profile.middleName} {profile.lastName}
              </h2>
              <p className={styles.profileNumber}>Employee #: {profile.employeeNumber}</p>
              {currentAssignment && (
                <>
                  <p className={styles.profilePosition}>
                    {currentAssignment.positionId?.title}
                  </p>
                  <p className={styles.profileDepartment}>
                    {currentAssignment.departmentId?.name}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Biography Section */}
          {profile.biography && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>About</h3>
              <div className={styles.sectionContent}>
                <p className={styles.biography}>{profile.biography}</p>
              </div>
            </div>
          )}

          {/* Personal Information - Non-sensitive */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Personal Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Gender</label>
                <p className={styles.infoValue}>{profile.gender || 'N/A'}</p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Nationality</label>
                <p className={styles.infoValue}>{profile.nationality || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Contact Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Work Email</label>
                <p className={styles.infoValue}>{profile.workEmail || 'N/A'}</p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Mobile Phone</label>
                <p className={styles.infoValue}>{profile.mobilePhone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Employment Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Hire Date</label>
                <p className={styles.infoValue}>{formatDate(profile.dateOfHire)}</p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Contract Type</label>
                <p className={styles.infoValue}>{profile.contractType || 'N/A'}</p>
              </div>
              {currentAssignment && (
                <>
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel}>Department</label>
                    <p className={styles.infoValue}>
                      {currentAssignment.departmentId?.name} ({currentAssignment.departmentId?.code})
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel}>Position</label>
                    <p className={styles.infoValue}>
                      {currentAssignment.positionId?.title} ({currentAssignment.positionId?.code})
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel}>Assignment Start Date</label>
                    <p className={styles.infoValue}>{formatDate(currentAssignment.startDate)}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Education Information */}
          {profile.education && profile.education.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Education</h3>
              <div className={styles.educationList}>
                {profile.education.map((edu, index) => (
                  <div key={index} className={styles.educationItem}>
                    <h4 className={styles.educationDegree}>{edu.degree}</h4>
                    <p className={styles.educationInstitution}>{edu.institution}</p>
                    <p className={styles.educationField}>
                      {edu.fieldOfStudy} • {edu.graduationYear}
                    </p>
                    {edu.gpa && <p className={styles.educationGpa}>GPA: {edu.gpa}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Qualifications */}
          {qualifications && qualifications.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Qualifications & Certifications</h3>
              <div className={styles.qualificationsList}>
                {qualifications.map((qual: any, index: number) => (
                  <div key={qual._id || index} className={styles.qualificationItem}>
                    <h4 className={styles.qualificationName}>{qual.establishmentName}</h4>
                    <p className={styles.qualificationIssuer}>{qual.graduationType}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note about Privacy */}
          <div className={styles.privacyNote}>
            <p>
              <strong>Note:</strong> Sensitive information such as salary details, national ID, 
              date of birth, and full address are restricted and not displayed to maintain privacy.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}