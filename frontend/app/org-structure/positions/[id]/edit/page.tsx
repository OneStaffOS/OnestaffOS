/**
 * Edit Position Page (Route: /org-structure/positions/[id]/edit)
 * System Admin can update existing positions
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { Position, UpdatePositionDto } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './edit.module.css';

interface Department {
  _id: string;
  code: string;
  name: string;
}

interface PositionOption {
  _id: string;
  code: string;
  title: string;
  departmentId?: {
    _id: string;
    name: string;
  };
}

export default function EditPositionPage() {
  const router = useRouter();
  const params = useParams();
  const positionId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [reportsToPositionId, setReportsToPositionId] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Reference data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  
  useEffect(() => {
    if (positionId) {
      fetchData();
    }
  }, [positionId]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [positionResponse, deptResponse, posResponse] = await Promise.all([
        axios.get(`/organization-structure/positions/${positionId}`),
        axios.get('/organization-structure/departments'),
        axios.get('/organization-structure/positions'),
      ]);
      
      const position: Position = positionResponse.data;
      setCode(position.code);
      setTitle(position.title);
      setDescription(position.description || '');
      setDepartmentId(position.departmentId?._id || '');
      setReportsToPositionId(position.reportsToPositionId?._id || '');
      setIsActive(position.isActive);
      
      setDepartments(deptResponse.data);
      setPositions(posResponse.data.filter((p: PositionOption) => p._id !== positionId));
      
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load position data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!code.trim()) {
      setError('Position code is required');
      return;
    }
    
    if (!title.trim()) {
      setError('Position title is required');
      return;
    }
    
    if (!departmentId) {
      setError('Department is required');
      return;
    }
    
    const updateDto: UpdatePositionDto = {
      code: code.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      departmentId,
      reportsToPositionId: reportsToPositionId || undefined,
      isActive,
    };
    
    setSubmitting(true);
    setError('');
    
    try {
      await axios.put(`/organization-structure/positions/${positionId}`, updateDto);
      alert('Position updated successfully!');
      router.push(`/org-structure/positions/${positionId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update position');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
        <div className={styles.container}>
          <Spinner message="Loading position data..." />
        </div>
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <button 
              onClick={() => router.push(`/org-structure/positions/${positionId}`)}
              className={styles.backButton}
            >
              ← Back to Position Details
            </button>
            <h1 className={styles.title}>Edit Position</h1>
            <p className={styles.subtitle}>
              Update the position information
            </p>
          </div>
        </div>

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorBox}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Basic Information</h2>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Position Code <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., POS-001"
                  required
                />
                <span className={styles.hint}>Unique identifier for this position</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Position Title <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
                <span className={styles.hint}>Official title for this position</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Description
                </label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter position description..."
                  rows={4}
                />
                <span className={styles.hint}>Optional description of the position</span>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Department <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.select}
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                  >
                    <option value="">Select Department</option>
                    {(departments || []).map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Reporting Structure</h2>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Reports To Position</label>
                <select
                  className={styles.select}
                  value={reportsToPositionId}
                  onChange={(e) => setReportsToPositionId(e.target.value)}
                >
                  <option value="">No Direct Report (Top Level)</option>
                  {(positions || []).map(pos => (
                    <option key={pos._id} value={pos._id}>
                      {pos.title} ({pos.code})
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>Select the position this role reports to (optional - defaults to department head)</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>Position is Active</span>
                </label>
                <span className={styles.hint}>Inactive positions cannot be assigned to employees</span>
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => router.push(`/org-structure/positions/${positionId}`)}
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
                {submitting ? 'Updating...' : 'Update Position'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
