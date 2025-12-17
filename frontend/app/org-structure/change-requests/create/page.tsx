/**
 * Create Structure Change Request Page (Route: /org-structure/change-requests/create)
 * Managers can submit requests for organizational structure changes
 * Process enforces validation rules (circular reporting, duplicates, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import axios from '@/lib/axios-config';
import { 
import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
  Department, 
  Position
} from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './create-request.module.css';

export default function CreateChangeRequestPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<string>('NEW_POSITION');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [formData, setFormData] = useState({
    targetDepartmentId: '',
    targetPositionId: '',
    details: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptResponse, posResponse] = await Promise.all([
        axios.get('/organization-structure/departments'),
        axios.get('/organization-structure/positions')
      ]);
      setDepartments(Array.isArray(deptResponse.data) ? deptResponse.data : []);
      setPositions(Array.isArray(posResponse.data) ? posResponse.data : []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setDepartments([]);
      setPositions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.details.trim()) {
      setError('Change details are required');
      return;
    }

    if (!formData.reason.trim() || formData.reason.length < 20) {
      setError('Reason is required and must be at least 20 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestData: any = {
        requestType,
        details: formData.details,
        reason: formData.reason,
      };

      // Add target IDs based on request type
      if (requestType === 'NEW_POSITION' || requestType === 'UPDATE_POSITION' || requestType === 'CLOSE_POSITION') {
        if (formData.targetPositionId) {
          requestData.targetPositionId = formData.targetPositionId;
        }
      }
      
      if (requestType === 'NEW_DEPARTMENT' || requestType === 'UPDATE_DEPARTMENT') {
        if (formData.targetDepartmentId) {
          requestData.targetDepartmentId = formData.targetDepartmentId;
        }
      }

      // Create the change request
      const createResponse = await axios.post('/organization-structure/change-requests', requestData);
      
      alert('Change request created successfully! Please submit it for approval from "My Change Requests" page.');
      router.push('/org-structure/my-change-requests');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit change request');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (requestType) {
      case 'NEW_POSITION':
      case 'UPDATE_POSITION':
      case 'CLOSE_POSITION':
        return (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Position {requestType === 'NEW_POSITION' ? '(Optional)' : <span className={styles.required}>*</span>}
              </label>
              <select
                className={styles.select}
                value={formData.targetPositionId}
                onChange={(e) => setFormData({ ...formData, targetPositionId: e.target.value })}
                required={requestType !== 'NEW_POSITION'}
              >
                <option value="">Select a position</option>
                {(positions || []).map((pos) => (
                  <option key={pos._id} value={pos._id}>
                    {pos.title} - {pos.departmentId?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Target Department (Optional)
              </label>
              <select
                className={styles.select}
                value={formData.targetDepartmentId}
                onChange={(e) => setFormData({ ...formData, targetDepartmentId: e.target.value })}
              >
                <option value="">Select a department</option>
                {(departments || []).map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      case 'NEW_DEPARTMENT':
      case 'UPDATE_DEPARTMENT':
        return (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Department {requestType === 'NEW_DEPARTMENT' ? '(Optional)' : <span className={styles.required}>*</span>}
              </label>
              <select
                className={styles.select}
                value={formData.targetDepartmentId}
                onChange={(e) => setFormData({ ...formData, targetDepartmentId: e.target.value })}
                required={requestType !== 'NEW_DEPARTMENT'}
              >
                <option value="">Select a department</option>
                {(departments || []).map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute requiredRoles={[
      Role.DEPARTMENT_HEAD,
      Role.DEPARTMENT_HEAD,
      Role.HR_MANAGER,
      Role.SYSTEM_ADMIN
    ]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.back()}
          >
            ← Back
          </button>
          <div>
            <h1 className={styles.title}>Request Structure Change</h1>
            <p className={styles.subtitle}>
              All organizational changes require approval workflow
            </p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Change Type</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Request Type <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                required
              >
                <option value="NEW_POSITION">Request New Position</option>
                <option value="UPDATE_POSITION">Update Position Details</option>
                <option value="CLOSE_POSITION">Close Position</option>
                <option value="NEW_DEPARTMENT">Request New Department</option>
                <option value="UPDATE_DEPARTMENT">Update Department</option>
              </select>
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Change Details</h2>
            
            {renderFormFields()}

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Change Details <span className={styles.required}>*</span>
              </label>
              <textarea
                className={styles.textarea}
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="Describe the proposed change in detail..."
                rows={4}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Business Reason <span className={styles.required}>*</span>
                <span className={styles.hint}>(Minimum 20 characters)</span>
              </label>
              <textarea
                className={styles.textarea}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Explain why this change is necessary and how it benefits the organization..."
                rows={5}
                required
              />
              <div className={styles.charCount}>
                {formData.reason.length} / 20 minimum
              </div>
            </div>
          </div>

          <div className={styles.infoBox}>
            <strong>Important Notes:</strong>
            <ul>
              <li>The system will validate for circular reporting lines</li>
              <li>Your request will be sent to System Admin for approval</li>
              <li>All changes are tracked with audit logs</li>
              <li>You will be notified when your request is processed</li>
            </ul>
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
              {loading ? 'Submitting...' : 'Submit Request for Approval'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
