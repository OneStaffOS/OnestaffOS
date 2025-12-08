'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { Department } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from '../departments.module.css';

export default function DepartmentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const departmentId = params.id as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (departmentId) {
      fetchDepartment();
    }
  }, [departmentId]);

  const fetchDepartment = async () => {
    try {
      const response = await axios.get(`/organization-structure/departments/${departmentId}`);
      setDepartment(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load department details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this department?')) {
      return;
    }

    try {
      await axios.put(`/organization-structure/departments/${departmentId}/deactivate`);
      alert('Department deactivated successfully');
      fetchDepartment();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate department');
    }
  };

  const handleActivate = async () => {
    try {
      await axios.put(`/organization-structure/departments/${departmentId}/reactivate`);
      alert('Department activated successfully');
      fetchDepartment();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to activate department');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.DEPARTMENT_HEAD, Role.DEPARTMENT_EMPLOYEE]}>
        <div className={styles.container}>
          <Spinner message="Loading department details..." />
        </div>
      </ProtectedRoute>
    );
  }

  if (!department) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.DEPARTMENT_HEAD, Role.DEPARTMENT_EMPLOYEE]}>
        <div className={styles.container}>
          <div className={styles.error}>{error || 'Department not found'}</div>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back to Departments
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.DEPARTMENT_HEAD, Role.DEPARTMENT_EMPLOYEE]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <button className={styles.backButton} onClick={() => router.push('/org-structure/departments')}>
              ← Back to Departments
            </button>
            <h1 className={styles.title}>{department.name}</h1>
            <div className={styles.deptCode}>{department.code}</div>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.actionButton}
              onClick={() => router.push(`/org-structure/departments/${department._id}/assign-manager`)}
            >
              Assign Manager
            </button>
            <button
              className={styles.actionButton}
              onClick={() => router.push(`/org-structure/departments/${department._id}/edit`)}
            >
              Edit
            </button>
            {department.isActive ? (
              <button
                className={`${styles.actionButton} ${styles.danger}`}
                onClick={handleDeactivate}
              >
                Deactivate
              </button>
            ) : (
              <button
                className={`${styles.actionButton} ${styles.success}`}
                onClick={handleActivate}
              >
                Activate
              </button>
            )}
          </div>
        </div>

        <div className={styles.detailsCard}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>General Information</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label>Description</label>
                <p>{department.description || 'No description provided'}</p>
              </div>
              <div className={styles.field}>
                <label>Status</label>
                <span className={`${styles.statusBadge} ${department.isActive ? styles.active : styles.inactive}`}>
                  {department.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className={styles.field}>
                <label>Created At</label>
                <p>{new Date(department.createdAt).toLocaleDateString()}</p>
              </div>
              <div className={styles.field}>
                <label>Last Updated</label>
                <p>{new Date(department.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Management</h2>
            <div className={styles.field}>
              <label>Head of Department</label>
              {department.headPositionId ? (
                <div className={styles.managerInfo}>
                  <span className={styles.managerTitle}>{department.headPositionId.title}</span>
                  <span className={styles.deptCode}>{department.headPositionId.code}</span>
                </div>
              ) : (
                <p className={styles.unassigned}>Not Assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
