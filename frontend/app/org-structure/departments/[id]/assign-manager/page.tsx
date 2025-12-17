'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { Department, Position } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './assign-manager.module.css';

export default function AssignManagerPage() {
  const router = useRouter();
  const params = useParams();
  const departmentId = params.id as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (departmentId) {
      fetchData();
    }
  }, [departmentId]);

  const fetchData = async () => {
    try {
      const [deptResponse, posResponse] = await Promise.all([
        axios.get(`/organization-structure/departments/${departmentId}`),
        axios.get('/organization-structure/positions')
      ]);
      
      setDepartment(deptResponse.data);
      setPositions(posResponse.data);
      
      if (deptResponse.data.headPositionId) {
        setSelectedPositionId(deptResponse.data.headPositionId._id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPositionId) {
      setError('Please select a position');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await axios.patch(`/organization-structure/departments/${departmentId}/assign-manager`, {
        headPositionId: selectedPositionId
      });
      alert('Department manager assigned successfully');
      router.push('/org-structure/departments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign manager');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner message="Loading..." />;
  if (!department) return <div className={styles.error}>Department not found</div>;

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.back()}
          >
            ← Back
          </button>
          <h1 className={styles.title}>Assign Department Manager</h1>
          <p className={styles.subtitle}>
            Select a position to lead the {department.name} department
          </p>
        </div>

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorBox}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className={styles.departmentInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Department Code:</span>
                <span className={styles.value}>{department.code}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Department Name:</span>
                <span className={styles.value}>{department.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Current Manager:</span>
                <span className={styles.value}>
                  {department.headPositionId ? department.headPositionId.title : 'Not Assigned'}
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Manager Position <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                required
              >
                <option value="">-- Select Position --</option>
                {(positions || []).map((pos) => (
                  <option key={pos._id} value={pos._id}>
                    {pos.title} ({pos.code}) - {pos.departmentId?.name || 'Unknown Dept'}
                  </option>
                ))}
              </select>
              <span className={styles.hint}>
                Select the position that will serve as the Head of Department
              </span>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => router.back()}
                className={styles.cancelButton}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Assign Manager'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
