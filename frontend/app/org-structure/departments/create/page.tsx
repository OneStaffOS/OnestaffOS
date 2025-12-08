/**
 * Create Department Page (Route: /org-structure/departments/create)
 * System Admin can define and create new departments
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import axios from '@/lib/axios-config';
import { CreateDepartmentDto, Department, Position } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './create.module.css';

export default function CreateDepartmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateDepartmentDto>({
    code: '',
    name: '',
    description: '',
    headPositionId: '',
    isActive: true,
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartmentsAndPositions();
  }, []);

  const fetchDepartmentsAndPositions = async () => {
    try {
      const [deptResponse, posResponse] = await Promise.all([
        axios.get('/organization-structure/departments'),
        axios.get('/organization-structure/positions')
      ]);
      setDepartments(deptResponse.data);
      setPositions(posResponse.data);
    } catch (err: any) {
      console.error('Failed to load data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      setError('Department code is required');
      return;
    }

    if (!formData.name.trim()) {
      setError('Department name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/organization-structure/departments', formData);
      alert('Department created successfully');
      router.push('/org-structure/departments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };

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
          <div>
            <h1 className={styles.title}>Create Department</h1>
            <p className={styles.subtitle}>Define a new organizational department</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Basic Information</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Department Code <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., DEPT-HR"
                required
              />
              <span className={styles.hint}>Unique identifier for this department</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Department Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Human Resources"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the department's purpose and responsibilities"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Leadership</h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Head of Department Position
                <span className={styles.hint}>(Optional)</span>
              </label>
              <select
                className={styles.select}
                value={formData.headPositionId}
                onChange={(e) => setFormData({ ...formData, headPositionId: e.target.value })}
              >
                <option value="">-- Select Position --</option>
                {positions.map((pos) => (
                  <option key={pos._id} value={pos._id}>
                    {pos.title} - {pos.departmentId?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>Department is Active</span>
              </label>
              <span className={styles.hint}>Inactive departments are hidden from selection</span>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => router.back()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
