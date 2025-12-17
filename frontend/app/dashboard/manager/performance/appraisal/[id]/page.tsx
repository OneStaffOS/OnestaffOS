/**
 * Manager Appraisal Form Page
 * REQ-AE-03, REQ-AE-04: Complete structured appraisal ratings with comments and recommendations
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import { useAuth } from '../../../../../context/AuthContext';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import styles from './appraisal-form.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface RatingScale {
  type: string;
  min: number;
  max: number;
  step: number;
  labels: string[];
}
interface Criterion {
  key: string;
  title: string;
  details?: string;
  weight?: number;
  maxScore?: number;
  required: boolean;
}
interface Template {
  _id: string;
  name: string;
  ratingScale: RatingScale;
  criteria: Criterion[];
  instructions?: string;
}

interface Assignment {
  _id: string;
  cycleId: any;
  employeeProfileId: any;
  templateId: Template;
  status: string;
  dueDate?: string;
  latestAppraisalId?: string;
}

interface RatingEntry {
  key: string;
  title: string;
  ratingValue: number;
  ratingLabel?: string;
  comments?: string;
}

interface AppraisalData {
  ratings: RatingEntry[];
}

export default function ManagerAppraisalFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const assignmentId = params.id as string;

  // State for employee selection
  const [departmentEmployees, setDepartmentEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [appraisalData, setAppraisalData] = useState<AppraisalData>({
    ratings: [],
  });

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const { user } = useAuth();

  const isDeptHead = !!user?.roles?.includes(SystemRole.DEPARTMENT_HEAD);
  const isHRManager = !!user?.roles?.includes(SystemRole.HR_MANAGER);

  // If employee selection changes, reload assignment for that employee
  useEffect(() => {
    if (selectedEmployeeId && assignment && assignment.employeeProfileId?._id !== selectedEmployeeId) {
      // Find assignment for this employee in the same cycle
      // (Assume backend provides a way to get assignment by cycle and employee)
      router.push(`/dashboard/manager/performance/appraisal/${assignment.cycleId?._id}?employeeId=${selectedEmployeeId}`);
    }
    // eslint-disable-next-line
  }, [selectedEmployeeId]);

  // Fetch employees in the manager's department for this cycle
  const fetchDepartmentEmployees = async () => {
    try {
      if (!assignment) return;
      // Get departmentId from assignment.employeeProfileId.departmentId or similar
      const departmentId = assignment.employeeProfileId?.departmentId?._id || assignment.employeeProfileId?.departmentId;
      if (!departmentId) return;
      // Fetch employees in department
      const resp = await axios.get(`/organization-structure/departments/${departmentId}/employees`);
      setDepartmentEmployees(resp.data || []);
    } catch (err) {
      setDepartmentEmployees([]);
    }
  };

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/performance/assignments/${assignmentId}`);
      setAssignment(response.data);

      // Initialize ratings if not loaded
      if (response.data.latestAppraisalId) {
        const recordResponse = await axios.get(`/performance/ratings/${response.data.latestAppraisalId}`);
        setAppraisalData({
          ratings: recordResponse.data.ratings || [],
        });
      } else {
        // Initialize empty ratings based on template criteria
        const initialRatings = response.data.templateId.criteria.map((c: Criterion) => ({
          key: c.key,
          title: c.title,
          ratingValue: response.data.templateId.ratingScale.min,
          comments: '',
        }));
        setAppraisalData(prev => ({ ...prev, ratings: initialRatings }));
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (key: string, value: number) => {
    setAppraisalData(prev => ({
      ...prev,
      ratings: prev.ratings.map(r =>
        r.key === key ? { ...r, ratingValue: value } : r
      ),
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      if (assignment?.latestAppraisalId) {
        await axios.put(`/performance/ratings/${assignment.latestAppraisalId}`, appraisalData);
      } else {
        const response = await axios.post('/performance/ratings', {
          assignmentId,
          ...appraisalData,
        });
        setAssignment(prev => prev ? { ...prev, latestAppraisalId: response.data._id } : null);
      }
      alert('Draft saved successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Submit this appraisal? You will not be able to edit it after submission.')) {
      return;
    }

    try {
      setSaving(true);
      // Save or update first
      let recordId = assignment?.latestAppraisalId;
      if (recordId) {
        await axios.put(`/performance/ratings/${recordId}`, appraisalData);
      } else {
        const response = await axios.post('/performance/ratings', {
          assignmentId,
          ...appraisalData,
        });
        recordId = response.data._id;
      }

      // Then submit
      await axios.post(`/performance/ratings/${recordId}/submit`);
      alert('Appraisal submitted successfully');
      router.push('/dashboard/manager/performance-dashboard');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit appraisal');
    } finally {
      setSaving(false);
    }
  };

  const getRatingLabel = (value: number, scale: RatingScale) => {
    if (!scale.labels || scale.labels.length === 0) return value.toString();
    const index = Math.round((value - scale.min) / scale.step);
    return scale.labels[index] || value.toString();
  };

  const computeAverageOutOfFive = (ratings: RatingEntry[] | undefined, scale?: RatingScale) => {
    if (!ratings || ratings.length === 0) return null;
    const min = scale?.min ?? 1;
    const max = scale?.max ?? 5;
    const range = Math.max(1, max - min);
    const normalized = ratings.map(r => (r.ratingValue - min) / range);
    const avgNorm = normalized.reduce((s, v) => s + v, 0) / normalized.length;
    const outOf5 = Math.round((avgNorm * 5) * 100) / 100;
    return outOf5;
  };

  const isReadOnly = assignment?.status === 'SUBMITTED' || assignment?.status === 'MANAGER_SUBMITTED' || assignment?.status === 'HR_PUBLISHED';

  // Permissions: Department Head may only provide ratings and per-criterion comments.
  // HR Manager (or other HR roles) can edit full appraisal fields.
  const canEditRatings = !isReadOnly && (isHRManager || isDeptHead);
  const canEditManagerFields = !isReadOnly && isHRManager;
  const canEditDeptHeadFields = !isReadOnly && (isDeptHead || isHRManager);

  const averageScore = computeAverageOutOfFive(appraisalData.ratings, assignment?.templateId?.ratingScale);

  // Employee selection dropdown (if multiple employees)
  const showEmployeeDropdown = departmentEmployees.length > 1;
  const currentEmployeeId = assignment && assignment.employeeProfileId?._id;

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
        <Spinner message="Loading appraisal form..." />
      </ProtectedRoute>
    );
  }

  if (!assignment) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
        <div className={styles.error}>Assignment not found</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
      <div className={styles.container}>
        {showEmployeeDropdown && (
          <div className={styles.inputGroup} style={{ marginBottom: 24 }}>
            <label className={styles.inputLabel} htmlFor="employeeSelect">Select Employee:</label>
            <select
              id="employeeSelect"
              value={currentEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              disabled={isReadOnly}
              className={styles.select}
            >
              {departmentEmployees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back
          </button>
          <div>
            <h1 className={styles.title}>Performance Appraisal</h1>
            <p className={styles.subtitle}>
              {assignment.employeeProfileId?.firstName} {assignment.employeeProfileId?.lastName} -{' '}
              {assignment.cycleId?.name}
            </p>
            {/* Average score hidden on this manager ratings-only page */}
          </div>
          <span className={`${styles.statusBadge} ${styles[assignment.status.toLowerCase().replace('_', '')]}`}>
            {assignment.status.replace(/_/g, ' ')}
          </span>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {assignment.templateId.instructions && (
          <div className={styles.instructions}>
            <h3>Instructions</h3>
            <p>{assignment.templateId.instructions}</p>
          </div>
        )}

        {isDeptHead && (
          <div className={styles.notice} style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7ed', borderLeft: '4px solid #f59e0b' }}>
            Provide ratings only for each criterion on this page.
          </div>
        )}

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Rating Criteria</h2>
          <p className={styles.scaleInfo}>
            Rating Scale: {assignment.templateId.ratingScale.min} to {assignment.templateId.ratingScale.max}
            {assignment.templateId.ratingScale.labels && ` (${assignment.templateId.ratingScale.labels.join(', ')})`}
          </p>

          {appraisalData.ratings.map((rating, index) => {
            const criterion = assignment.templateId.criteria.find(c => c.key === rating.key);
            if (!criterion) return null;

            return (
              <div key={rating.key} className={styles.criterionCard}>
                <div className={styles.criterionHeader}>
                  <h3 className={styles.criterionTitle}>
                    {index + 1}. {criterion.title}
                    {criterion.required && <span className={styles.required}>*</span>}
                  </h3>
                  {criterion.weight && (
                    <span className={styles.weight}>Weight: {criterion.weight}%</span>
                  )}
                </div>

                {criterion.details && (
                  <p className={styles.criterionDetails}>{criterion.details}</p>
                )}

                <div className={styles.ratingInput}>
                  <label className={styles.ratingLabel}>Rating:</label>
                  <div className={styles.ratingControl}>
                    <input
                      type="range"
                      min={assignment.templateId.ratingScale.min}
                      max={assignment.templateId.ratingScale.max}
                      step={assignment.templateId.ratingScale.step || 1}
                      value={rating.ratingValue}
                      onChange={(e) => handleRatingChange(rating.key, Number(e.target.value))}
                      disabled={!canEditRatings}
                      className={styles.slider}
                    />
                    <div className={styles.ratingDisplay}>
                      <span className={styles.ratingValue}>{rating.ratingValue}</span>
                      <span className={styles.ratingLabel}>
                        {getRatingLabel(rating.ratingValue, assignment.templateId.ratingScale)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isReadOnly && (
          <div className={styles.actions}>
            <button
              className={styles.secondaryButton}
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              className={styles.primaryButton}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Submitting...' : 'Submit Appraisal'}
            </button>
          </div>
        )}

        {isReadOnly && (
          <div className={styles.readOnlyNotice}>
            This appraisal has been {assignment.status === 'HR_PUBLISHED' ? 'published' : 'submitted'} and cannot be edited.
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
