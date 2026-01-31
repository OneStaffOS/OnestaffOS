/**
 * Profile Change Request Page (Route: /profile/request-change)
 * US-E6-02: Request corrections of data (job title, department, etc.)
 * US-E2-06: Request changes to legal name or marital status
 * BR 20a: Only authorized roles can modify critical data
 * BR 36: All changes must be made via workflow approval
 * Phase I: Submit Request for Correction/Change
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { 
  EmployeeProfile, 
  ChangeRequestType,
  Gender,
  MaritalStatus 
} from '@/lib/types/employee-profile.types';
import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
import styles from './request-change.module.css';

interface Department {
  _id: string;
  code: string;
  name: string;
  isActive?: boolean;
}

interface Position {
  _id: string;
  code: string;
  title: string;
  departmentId?: { _id: string; name: string };
  isActive?: boolean;
}

interface PositionAssignment {
  _id: string;
  employeeProfileId: string | {
    _id: string;
    firstName: string;
    lastName: string;
  };
  positionId: {
    _id: string;
    code: string;
    title: string;
  };
  departmentId: {
    _id: string;
    code: string;
    name: string;
  };
  startDate: string;
  endDate?: string;
}

export default function RequestChangePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [requestType, setRequestType] = useState<ChangeRequestType>(ChangeRequestType.PERSONAL_INFO);
  const [fieldName, setFieldName] = useState('');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<PositionAssignment | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchDepartments();
    fetchPositions();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchCurrentAssignment();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/employee-profile/my-profile');
      setProfile(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/organization-structure/departments');
      setDepartments(response.data.filter((dept: Department) => dept.isActive !== false));
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
      // Don't throw error, just set empty array
      setDepartments([]);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get('/organization-structure/positions');
      const data = Array.isArray(response.data) ? response.data : [];
      setPositions(data.filter((pos: Position) => pos.isActive !== false));
    } catch (err: any) {
      console.error('Failed to fetch positions:', err);
      // Don't throw error, just set empty array
      setPositions([]);
    }
  };

  const fetchCurrentAssignment = async () => {
    try {
      if (!profile) return;
      // Use the employee-specific endpoint that doesn't require admin permissions
      const response = await axios.get(`/organization-structure/employees/${profile._id}/current-assignment`);
      setCurrentAssignment(response.data || null);
    } catch (err: any) {
      console.error('Failed to fetch current assignment:', err);
      // If forbidden or not found, just set to null (employee might not have a position yet)
      setCurrentAssignment(null);
    }
  };

  const getFieldOptions = () => {
    switch (requestType) {
      case ChangeRequestType.PERSONAL_INFO:
        return [
          { value: 'firstName', label: 'First Name' },
          { value: 'lastName', label: 'Last Name' },
          { value: 'middleName', label: 'Middle Name' },
          { value: 'nationalId', label: 'National ID' },
          { value: 'nationality', label: 'Nationality' },
          { value: 'maritalStatus', label: 'Marital Status' },
          { value: 'gender', label: 'Gender' },
        ];
      case ChangeRequestType.EMPLOYMENT_INFO:
        return [
          { value: 'position', label: 'Job Title/Position' },
          { value: 'department', label: 'Department' },
          { value: 'dateOfHire', label: 'Date of Hire' },
        ];
      default:
        return [];
    }
  };

  const getCurrentValue = (field: string) => {
    if (!profile) return '';
    
    // Special handling for position field
    if (field === 'position') {
      return currentAssignment?.positionId?.title || 'Not set';
    }
    
    // Special handling for department field
    if (field === 'department') {
      return currentAssignment?.departmentId?.name || 'Not set';
    }
    
    const value = (profile as any)[field];
    if (value === undefined || value === null) return '';
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB limit
    
    if (validFiles.length !== files.length) {
      setError('Some files were too large (max 10MB per file)');
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fieldName) {
      setError('Please select a field to change');
      return;
    }
    
    if (!requestedValue) {
      setError('Please enter the requested value');
      return;
    }
    
    if (!reason || reason.length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Get the label for the selected field
      const fieldOption = getFieldOptions().find(opt => opt.value === fieldName);
      const fieldLabel = fieldOption?.label || fieldName;
      
      const requestDescription = `Change request for ${fieldLabel}: from "${getCurrentValue(fieldName)}" to "${requestedValue}". Reason: ${reason}`;
      
      // Send as JSON if no attachments, otherwise use FormData
      if (attachments.length === 0) {
        await axios.post('/employee-profile/my-profile/change-request', {
          requestDescription,
          reason
        });
      } else {
        const formData = new FormData();
        formData.append('requestDescription', requestDescription);
        formData.append('reason', reason);
        
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        await axios.post('/employee-profile/my-profile/change-request', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setSuccess('Change request submitted successfully! HR will review your request.');
      
      // Reset form
      setTimeout(() => {
        router.push('/profile/requests');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit change request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Spinner fullScreen message="Loading profile data..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Request Profile Change</h1>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/profile')}
          >
            ← Back to Profile
          </button>
        </div>

        <div className={styles.infoBox}>
          <strong>📋 Note:</strong> Changes to critical information (name, national ID, job title, department) 
          require HR approval. You'll be notified once your request is reviewed.
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.card}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Request Type *</label>
              <select
                className={styles.select}
                value={requestType}
                onChange={(e) => {
                  setRequestType(e.target.value as ChangeRequestType);
                  setFieldName('');
                  setRequestedValue('');
                }}
                required
              >
                <option value={ChangeRequestType.PERSONAL_INFO}>Personal Information</option>
                <option value={ChangeRequestType.EMPLOYMENT_INFO}>Employment Information</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Field to Change *</label>
              <select
                className={styles.select}
                value={fieldName}
                onChange={(e) => {
                  setFieldName(e.target.value);
                  setRequestedValue('');
                }}
                required
              >
                <option value="">Select a field</option>
                {getFieldOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {fieldName && (
              <div className={styles.currentValueBox}>
                <strong>Current Value:</strong> {getCurrentValue(fieldName) || 'Not set'}
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Requested New Value *</label>
              {fieldName === 'maritalStatus' ? (
                <select
                  className={styles.select}
                  value={requestedValue}
                  onChange={(e) => setRequestedValue(e.target.value)}
                  required
                >
                  <option value="">Select marital status</option>
                  <option value={MaritalStatus.SINGLE}>Single</option>
                  <option value={MaritalStatus.MARRIED}>Married</option>
                  <option value={MaritalStatus.DIVORCED}>Divorced</option>
                  <option value={MaritalStatus.WIDOWED}>Widowed</option>
                </select>
              ) : fieldName === 'gender' ? (
                <select
                  className={styles.select}
                  value={requestedValue}
                  onChange={(e) => setRequestedValue(e.target.value)}
                  required
                >
                  <option value="">Select gender</option>
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                </select>
              ) : fieldName === 'department' ? (
                <select
                  className={styles.select}
                  value={requestedValue}
                  onChange={(e) => setRequestedValue(e.target.value)}
                  required
                >
                  <option value="">Select department</option>
                  {(departments || []).map(dept => (
                    <option key={dept._id} value={dept.name}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>
              ) : fieldName === 'position' ? (
                <select
                  className={styles.select}
                  value={requestedValue}
                  onChange={(e) => setRequestedValue(e.target.value)}
                  required
                >
                  <option value="">Select position</option>
                  {(positions || []).map(pos => (
                    <option key={pos._id} value={pos.title}>
                      {pos.code} - {pos.title}
                      {pos.departmentId?.name && ` (${pos.departmentId.name})`}
                    </option>
                  ))}
                </select>
              ) : fieldName === 'dateOfHire' ? (
                <input
                  type="date"
                  className={styles.input}
                  value={requestedValue}
                  onChange={(e) => setRequestedValue(e.target.value)}
                  required
                />
              ) : (
                <input
                  type="text"
                  className={styles.input}
                  value={requestedValue}
                  onChange={(e) => setRequestedValue(e.target.value)}
                  placeholder="Enter the new value"
                  required
                />
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Reason for Change *</label>
              <textarea
                className={styles.textarea}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder="Provide a detailed explanation for why this change is needed..."
                required
              />
              <small className={styles.hint}>
                Minimum 10 characters. Be specific about why this change is necessary.
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Supporting Documents (Optional)</label>
              <div className={styles.fileUploadArea}>
                <label className={styles.fileLabel}>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className={styles.fileInput}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <span className={styles.uploadButton}>+ Add Files</span>
                </label>
                <small className={styles.hint}>
                  Upload documents that support your request (max 10MB per file)
                </small>
              </div>

              {attachments.length > 0 && (
                <div className={styles.attachmentsList}>
                  {attachments.map((file, index) => (
                    <div key={index} className={styles.attachmentItem}>
                      <span className={styles.fileName}>📎 {file.name}</span>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeAttachment(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.cancelButton}`}
                onClick={() => router.push('/profile')}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.submitButton}`}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>

        <div className={styles.helpBox}>
          <h3>Need Help?</h3>
          <p>If you have questions about change requests, contact HR at hr@company.com</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}