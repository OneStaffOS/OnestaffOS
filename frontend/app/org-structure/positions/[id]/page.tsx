/**
 * Position Details Page (Route: /org-structure/positions/[id])
 * View detailed information about a specific position
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { Position } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './view.module.css';

export default function PositionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const positionId = params.id as string;
  
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (positionId) {
      fetchPosition();
    }
  }, [positionId]);

  const fetchPosition = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/organization-structure/positions/${positionId}`);
      setPosition(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load position');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this position?')) {
      return;
    }

    try {
      await axios.put(`/organization-structure/positions/${positionId}/deactivate`);
      alert('Position deactivated successfully');
      fetchPosition();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate position');
    }
  };

  const handleActivate = async () => {
    try {
      await axios.put(`/organization-structure/positions/${positionId}`, {
        isActive: true
      });
      alert('Position activated successfully');
      fetchPosition();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to activate position');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[
        Role.DEPARTMENT_EMPLOYEE,
        Role.DEPARTMENT_HEAD,
        Role.DEPARTMENT_HEAD,
        Role.HR_ADMIN,
        Role.HR_MANAGER,
        Role.HR_EMPLOYEE,
        Role.SYSTEM_ADMIN
      ]}>
        <div className={styles.container}>
          <Spinner message="Loading position details..." />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !position) {
    return (
      <ProtectedRoute requiredRoles={[
        Role.DEPARTMENT_EMPLOYEE,
        Role.DEPARTMENT_HEAD,
        Role.DEPARTMENT_HEAD,
        Role.HR_ADMIN,
        Role.HR_MANAGER,
        Role.HR_EMPLOYEE,
        Role.SYSTEM_ADMIN
      ]}>
        <div className={styles.container}>
          <div className={styles.error}>{error || 'Position not found'}</div>
          <button
            className={styles.backButton}
            onClick={() => router.push('/org-structure/positions')}
          >
            ← Back to Positions
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[
      Role.DEPARTMENT_EMPLOYEE,
      Role.DEPARTMENT_HEAD,
      Role.DEPARTMENT_HEAD,
      Role.HR_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EMPLOYEE,
      Role.SYSTEM_ADMIN
    ]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.push('/org-structure/positions')}
          >
            ← Back
          </button>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{position.title}</h1>
            <span className={`${styles.statusBadge} ${position.isActive ? styles.active : styles.inactive}`}>
              {position.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Basic Information</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Position Code</span>
                <span className={styles.value}>{position.code}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Position Title</span>
                <span className={styles.value}>{position.title}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Department</span>
                <span className={styles.value}>
                  {position.departmentId?.name || 'Unknown'} ({position.departmentId?.code || 'N/A'})
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Status</span>
                <span className={styles.value}>
                  {position.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {position.description && (
              <div className={styles.descriptionSection}>
                <span className={styles.label}>Description</span>
                <p className={styles.description}>{position.description}</p>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Reporting Structure</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Reports To</span>
                <span className={styles.value}>
                  {position.reportsToPositionId 
                    ? `${position.reportsToPositionId.title} (${position.reportsToPositionId.code})`
                    : 'No direct report (Top Level)'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Metadata</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Created At</span>
                <span className={styles.value}>
                  {new Date(position.createdAt).toLocaleString()}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Last Updated</span>
                <span className={styles.value}>
                  {new Date(position.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.assignButton}
              onClick={() => router.push(`/org-structure/positions/${positionId}/assign`)}
            >
              Assign to Employee
            </button>
            <button
              className={styles.editButton}
              onClick={() => router.push(`/org-structure/positions/${positionId}/edit`)}
            >
              Edit Position
            </button>
            {position.isActive ? (
              <button
                className={styles.deactivateButton}
                onClick={handleDeactivate}
              >
                Deactivate Position
              </button>
            ) : (
              <button
                className={styles.activateButton}
                onClick={handleActivate}
              >
                Activate Position
              </button>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
