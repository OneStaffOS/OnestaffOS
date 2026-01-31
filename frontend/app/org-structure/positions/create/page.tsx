/**
 * Create Position Page (Route: /org-structure/positions/create)
 * System Admin can define and create new positions
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import axios from '@/lib/axios-config';
import { CreatePositionDto, PositionStatus } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './create.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Department {
  _id: string;
  code: string;
  name: string;
}

interface Position {
  _id: string;
  code: string;
  title: string;
  departmentId?: {
    _id: string;
    name: string;
  };
}

export default function CreatePositionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  const [positions, setPositions] = useState<Position[]>([]);
  
  useEffect(() => {
    fetchReferenceData();
  }, []);
  
  const fetchReferenceData = async () => {
    try {
      const [deptResponse, posResponse] = await Promise.all([
        axios.get('/organization-structure/departments'),
        axios.get('/organization-structure/positions'),
      ]);
      
      setDepartments(Array.isArray(deptResponse.data) ? deptResponse.data : []);
      setPositions(Array.isArray(posResponse.data) ? posResponse.data : []);
    } catch (err: any) {
      console.error('Failed to fetch reference data:', err);
      setDepartments([]);
      setPositions([]);
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
    
    const createDto: CreatePositionDto = {
      code: code.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      departmentId,
      reportsToPositionId: reportsToPositionId || undefined,
      isActive,
    };
    
    setLoading(true);
    setError('');
    
    try {
      await axios.post('/organization-structure/positions', createDto);
      alert('Position created successfully!');
      router.push('/org-structure/positions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create position');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <button 
              onClick={() => router.push('/org-structure/positions')}
              className={styles.backButton}
            >
              ← Back to Positions
            </button>
            <h1 className={styles.title}>Create New Position</h1>
            <p className={styles.subtitle}>
              Define a new position in the organizational structure
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
                onClick={() => router.push('/org-structure/positions')}
                className={styles.cancelButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Position'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}