'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { Department } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from '../../departments.module.css';

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams();
  const departmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    if (departmentId) {
      fetchDepartment();
    }
  }, [departmentId]);

  const fetchDepartment = async () => {
    try {
      const response = await axios.get(`/organization-structure/departments/${departmentId}`);
      const dept = response.data;
      setFormData({
        code: dept.code,
        name: dept.name,
        description: dept.description || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load department details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await axios.put(`/organization-structure/departments/${departmentId}`, formData);
      alert('Department updated successfully');
      router.push(`/org-structure/departments/${departmentId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update department');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
        <div className={styles.container}>
          <Spinner message="Loading..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <button className={styles.backButton} onClick={() => router.back()}>
              ← Back
            </button>
            <h1 className={styles.title}>Edit Department</h1>
          </div>
        </div>

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="code">Department Code *</label>
              <input
                type="text"
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="name">Department Name *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={styles.textarea}
              />
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
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
