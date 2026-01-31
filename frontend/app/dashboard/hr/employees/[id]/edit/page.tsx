/**
 * HR Admin - Edit Employee Profile Page
 * Route: /hr/employees/:id/edit
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './edit.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function EditEmployeeProfilePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    firstName: '',
    lastName: '',
    personalEmail: '',
    workEmail: '',
    mobilePhone: '',
    dateOfBirth: '',
    gender: '',
    nationalId: '',
    contractType: '',
    primaryDepartmentId: '',
    primaryPositionId: '',
  });

  useEffect(() => {
    if (params.id) {
      fetchEmployee();
      fetchDepartments();
      fetchPositions();
    }
  }, [params.id]);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/organization-structure/departments');
      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to load departments:', err);
      setDepartments([]);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get('/organization-structure/positions');
      setPositions(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to load positions:', err);
      setPositions([]);
    }
  };

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/employee-profile/${params.id}`);
      setFormData({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        personalEmail: response.data.personalEmail || '',
        workEmail: response.data.workEmail || '',
        mobilePhone: response.data.mobilePhone || '',
        dateOfBirth: response.data.dateOfBirth?.split('T')[0] || '',
        gender: response.data.gender || '',
        nationalId: response.data.nationalId || '',
        contractType: response.data.contractType || '',
        primaryDepartmentId: response.data.primaryDepartmentId?._id || response.data.primaryDepartmentId || '',
        primaryPositionId: response.data.primaryPositionId?._id || response.data.primaryPositionId || '',
      });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Remove empty ObjectId fields to avoid validation errors
      const submitData = { ...formData };
      if (!submitData.primaryDepartmentId) {
        delete submitData.primaryDepartmentId;
      }
      if (!submitData.primaryPositionId) {
        delete submitData.primaryPositionId;
      }
      
      await axios.put(`/employee-profile/${params.id}`, submitData);
      alert('Employee profile updated successfully');
      router.push(`/dashboard/hr/employees/${params.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update employee profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
        <Spinner message="Loading employee profile..." />
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
        <div className={styles.container}>
          <div className={styles.error}>{error}</div>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Employee Profile</h1>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Personal Information */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Information</h2>
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label>First Name *</label>
                <input
                  type="text" name="firstName" value={formData.firstName || ''}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name *</label>
                <input
                  type="text" name="lastName" value={formData.lastName || ''}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Date of Birth</label>
                <input
                  type="date" name="dateOfBirth" value={formData.dateOfBirth || ''}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Gender</label>
                <select
                  name="gender" value={formData.gender || ''}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>National ID</label>
                <input
                  type="text" name="nationalId" value={formData.nationalId || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Information</h2>
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label>Personal Email</label>
                <input
                  type="email" name="personalEmail" value={formData.personalEmail || ''}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Work Email</label>
                <input
                  type="email" name="workEmail" value={formData.workEmail || ''}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Mobile Phone</label>
                <input
                  type="tel" name="mobilePhone" value={formData.mobilePhone || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Employment Information</h2>
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label>Department</label>
                <select
                  name="primaryDepartmentId" value={formData.primaryDepartmentId || ''}
                  onChange={handleChange}
                >
                  <option value="">Select Department</option>
                  {(departments || []).map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Position</label>
                <select
                  name="primaryPositionId" value={formData.primaryPositionId || ''}
                  onChange={handleChange}
                >
                  <option value="">Select Position</option>
                  {(positions || []).map(pos => (
                    <option key={pos._id} value={pos._id}>
                      {pos.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Contract Type</label>
                <select
                  name="contractType" value={formData.contractType || ''}
                  onChange={handleChange}
                >
                  <option value="">Select Contract Type</option>
                  <option value="FULL_TIME_CONTRACT">Full Time Contract</option>
                  <option value="PART_TIME_CONTRACT">Part Time Contract</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button" className={styles.cancelButton}
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit" className={styles.submitButton}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}