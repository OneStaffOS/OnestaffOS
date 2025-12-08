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
  StructureChangeType, 
  Department, 
  Position,
  SubmitStructureChangeDto 
} from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './create-request.module.css';

export default function CreateChangeRequestPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<StructureChangeType>(StructureChangeType.CHANGE_REPORTING_LINE);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [formData, setFormData] = useState({
    targetEntity: '',
    changeDescription: '',
    justification: '',
    newReportingLine: '',
    newDepartment: '',
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
      setDepartments(deptResponse.data);
      setPositions(posResponse.data);
    } catch (err: any) {
      console.error('Failed to load data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.changeDescription.trim()) {
      setError('Change description is required');
      return;
    }

    if (!formData.justification.trim() || formData.justification.length < 20) {
      setError('Justification is required and must be at least 20 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestData: SubmitStructureChangeDto = {
        requestType,
        targetEntity: formData.targetEntity,
        changeDescription: formData.changeDescription,
        justification: formData.justification,
        proposedChanges: {}
      };

      // Add specific data based on request type
      if (requestType === StructureChangeType.CHANGE_REPORTING_LINE) {
        requestData.proposedChanges.positionData = {
          reportsToPositionId: formData.newReportingLine as any
        };
      }

      await axios.post('/organization-structure/change-requests', requestData);
      alert('Change request submitted successfully! Requires approval.');
      router.push('/org-structure/change-requests');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit change request');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (requestType) {
      case StructureChangeType.CHANGE_REPORTING_LINE:
        return (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Position <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={formData.targetEntity}
                onChange={(e) => setFormData({ ...formData, targetEntity: e.target.value })}
                required
              >
                <option value="">Select a position</option>
                {positions.map((pos) => (
                  <option key={pos._id} value={pos._id}>
                    {pos.title} - {pos.departmentId?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                New Reporting Line <span className={styles.required}>*</span>
                <span className={styles.hint}>(System validates for circular reporting)</span>
              </label>
              <select
                className={styles.select}
                value={formData.newReportingLine}
                onChange={(e) => setFormData({ ...formData, newReportingLine: e.target.value })}
                required
              >
                <option value="">-- Select New Manager Position --</option>
                {positions
                  .filter(pos => pos._id !== formData.targetEntity) // Prevent self-reporting
                  .map((pos) => (
                    <option key={pos._id} value={pos._id}>
                      {pos.title} - {pos.departmentId?.name || 'Unknown'}
                    </option>
                  ))}
              </select>
            </div>
          </>
        );

      case StructureChangeType.UPDATE_POSITION:
        return (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Position <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={formData.targetEntity}
                onChange={(e) => setFormData({ ...formData, targetEntity: e.target.value })}
                required
              >
                <option value="">Select a position</option>
                {positions.map((pos) => (
                  <option key={pos._id} value={pos._id}>
                    {pos.title} - {pos.departmentId?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                New Department (Optional)
              </label>
              <select
                className={styles.select}
                value={formData.newDepartment}
                onChange={(e) => setFormData({ ...formData, newDepartment: e.target.value })}
              >
                <option value="">-- Keep Current Department --</option>
                {departments.map((dept) => (
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
                onChange={(e) => setRequestType(e.target.value as StructureChangeType)}
                required
              >
                <option value={StructureChangeType.CHANGE_REPORTING_LINE}>
                  Change Reporting Line
                </option>
                <option value={StructureChangeType.UPDATE_POSITION}>
                  Update Position Details
                </option>
                <option value={StructureChangeType.UPDATE_DEPARTMENT}>
                  Update Department
                </option>
                <option value={StructureChangeType.CREATE_POSITION}>
                  Request New Position
                </option>
              </select>
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Change Details</h2>
            
            {renderFormFields()}

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Change Description <span className={styles.required}>*</span>
              </label>
              <textarea
                className={styles.textarea}
                value={formData.changeDescription}
                onChange={(e) => setFormData({ ...formData, changeDescription: e.target.value })}
                placeholder="Describe the proposed change in detail..."
                rows={4}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Business Justification <span className={styles.required}>*</span>
                <span className={styles.hint}>(Minimum 20 characters)</span>
              </label>
              <textarea
                className={styles.textarea}
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                placeholder="Explain why this change is necessary and how it benefits the organization..."
                rows={5}
                required
              />
              <div className={styles.charCount}>
                {formData.justification.length} / 20 minimum
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
