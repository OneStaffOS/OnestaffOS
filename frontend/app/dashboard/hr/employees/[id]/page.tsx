/**
 * HR Admin - View Employee Profile Page
 * Route: /hr/employees/:id
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './profile.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function ViewEmployeeProfilePage() {
  const router = useRouter();
  const params = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchEmployee();
    }
  }, [params.id]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/employee-profile/${params.id}`);
      setEmployee(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employee profile');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
        <Spinner message="Loading employee profile..." />
      </ProtectedRoute>
    );
  }

  if (error || !employee) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
        <div className={styles.container}>
          <div className={styles.error}>{error || 'Employee not found'}</div>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back to Employees
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back to Employees
          </button>
          <button 
            className={styles.editButton}
            onClick={() => router.push(`/dashboard/hr/employees/${params.id}/edit`)}
          >
            Edit Profile
          </button>
        </div>

        <div className={styles.profileCard}>
          <h1 className={styles.title}>
            {employee.firstName} {employee.lastName}
          </h1>
          <p className={styles.subtitle}>{employee.employeeNumber || employee.employeeId}</p>

          <div className={styles.sections}>
            {/* Personal Information */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Personal Information</h2>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>First Name</label>
                  <p>{employee.firstName || 'N/A'}</p>
                </div>
                <div className={styles.field}>
                  <label>Last Name</label>
                  <p>{employee.lastName || 'N/A'}</p>
                </div>
                <div className={styles.field}>
                  <label>Date of Birth</label>
                  <p>{formatDate(employee.dateOfBirth)}</p>
                </div>
                <div className={styles.field}>
                  <label>Gender</label>
                  <p>{employee.gender || 'N/A'}</p>
                </div>
                <div className={styles.field}>
                  <label>National ID</label>
                  <p>{employee.nationalId || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Contact Information</h2>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>Personal Email</label>
                  <p>{employee.personalEmail || 'N/A'}</p>
                </div>
                <div className={styles.field}>
                  <label>Work Email</label>
                  <p>{employee.workEmail || 'N/A'}</p>
                </div>
                <div className={styles.field}>
                  <label>Mobile Phone</label>
                  <p>{employee.mobilePhone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Employment Information</h2>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>Employee Number</label>
                  <p>{employee.employeeNumber || employee.employeeId || 'N/A'}</p>
                </div>
                <div className={styles.field}>
                  <label>Date of Hire</label>
                  <p>{formatDate(employee.dateOfHire)}</p>
                </div>
                <div className={styles.field}>
                  <label>Position</label>
                  <p>{employee.primaryPositionId?.title || employee.position || 'N/A'}</p>
                </div>
                <div className={styles.field}>
                  <label>Department</label>
                  <p>{employee.primaryDepartmentId?.name || employee.department || 'N/A'}</p>
                </div>
                <div className={styles.field}>
                  <label>Employment Status</label>
                  <p>
                    <span className={`${styles.statusBadge} ${styles[employee.status?.toLowerCase()]}`}>
                      {employee.status || 'N/A'}
                    </span>
                  </p>
                </div>
                <div className={styles.field}>
                  <label>Contract Type</label>
                  <p>{employee.contractType || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
