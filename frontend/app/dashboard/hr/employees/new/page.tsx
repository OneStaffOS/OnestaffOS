/**
 * HR Admin - Create New Employee Profile Page
 * Route: /hr/employees/new
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './new.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function NewEmployeeProfilePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    firstName: '',
    lastName: '',
    employeeNumber: '',
    nationalId: '',
    password: '',
    dateOfHire: new Date().toISOString().split('T')[0],
    personalEmail: '',
    workEmail: '',
    mobilePhone: '',
    dateOfBirth: '',
    gender: '',
    contractType: '',
    primaryDepartmentId: '',
    primaryPositionId: '',
  });

  useEffect(() => {
    fetchDepartments();
    fetchPositions();
    generateEmployeeNumber();
  }, []);

  const generateEmployeeNumber = async () => {
    try {
      // Fetch all employees to get the last employee number
      const response = await axios.get('/employee-profile');
      const employees = response.data;
      
      if (employees.length === 0) {
        // First employee
        setFormData((prev: any) => ({ ...prev, employeeNumber: 'EMP00001' }));
      } else {
        // Find the highest employee number
        let maxNumber = 0;
        employees.forEach((emp: any) => {
          if (emp.employeeNumber && emp.employeeNumber.startsWith('EMP')) {
            const numPart = parseInt(emp.employeeNumber.substring(3));
            if (!isNaN(numPart) && numPart > maxNumber) {
              maxNumber = numPart;
            }
          }
        });
        
        // Increment and format
        const nextNumber = (maxNumber + 1).toString().padStart(5, '0');
        setFormData((prev: any) => ({ ...prev, employeeNumber: `EMP${nextNumber}` }));
      }
    } catch (err) {
      console.error('Failed to generate employee number:', err);
      // Fallback to timestamp-based generation
      const timestamp = Date.now().toString().slice(-5);
      setFormData((prev: any) => ({ ...prev, employeeNumber: `EMP${timestamp}` }));
    }
  };

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
      
      const response = await axios.post('/employee-profile', submitData);
      alert('Employee profile created successfully');
      router.push(`/dashboard/hr/employees/${response.data._id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create employee profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create New Employee Profile</h1>
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
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>National ID *</label>
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
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
                  type="email"
                  name="personalEmail"
                  value={formData.personalEmail}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Work Email</label>
                <input
                  type="email"
                  name="workEmail"
                  value={formData.workEmail}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Mobile Phone</label>
                <input
                  type="tel"
                  name="mobilePhone"
                  value={formData.mobilePhone}
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
                <label>Employee Number *</label>
                <input
                  type="text"
                  name="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={handleChange}
                  required
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Date of Hire *</label>
                <input
                  type="date"
                  name="dateOfHire"
                  value={formData.dateOfHire}
                  onChange={handleChange}
                  required
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Initial Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Employee's initial password"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Department</label>
                <select
                  name="primaryDepartmentId"
                  value={formData.primaryDepartmentId}
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
                  name="primaryPositionId"
                  value={formData.primaryPositionId}
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
                  name="contractType"
                  value={formData.contractType}
                  onChange={handleChange}
                >
                  <option value="">Select Contract Type</option>
                  <option value="FULL_TIME_CONTRACT">Full Time Contract</option>
                  <option value="PART_TIME_CONTRACT">Part Time Contract</option>
                </select>
              </div>
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
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
