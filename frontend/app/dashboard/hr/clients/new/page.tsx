"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from '../../employees/new/new.module.css';

export default function NewClientProfilePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
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
    primaryDepartmentId: '',
  });

  useEffect(() => {
    fetchDepartments();
    generateClientNumber();
  }, []);

  const generateClientNumber = async () => {
    try {
      const response = await axios.get('/employee-profile');
      const employees = Array.isArray(response.data) ? response.data : [];

      if (employees.length === 0) {
        setFormData((prev: any) => ({ ...prev, employeeNumber: 'CL-0001' }));
        return;
      }

      let maxNumber = 0;
      employees.forEach((emp: any) => {
        const employeeNumber = String(emp.employeeNumber || '');
        const match = employeeNumber.match(/^CL-?(\d{4,})$/i);
        if (!match) return;
        const numPart = parseInt(match[1], 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      });

      const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
      setFormData((prev: any) => ({ ...prev, employeeNumber: `CL-${nextNumber}` }));
    } catch (err) {
      const timestamp = Date.now().toString().slice(-4);
      setFormData((prev: any) => ({ ...prev, employeeNumber: `CL-${timestamp}` }));
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

      const submitData = { ...formData };
      if (!submitData.primaryDepartmentId) {
        delete submitData.primaryDepartmentId;
      }

      const response = await axios.post('/employee-profile', submitData);
      await axios.post(`/employee-profile/${response.data._id}/roles`, {
        roles: ['Client'],
      });
      alert('Client account created successfully');
      router.push(`/dashboard/hr/employees/${response.data._id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create client account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create New Client Account</h1>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Information</h2>
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label>First Name *</label>
                <input
                  type="text" name="firstName" value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name *</label>
                <input
                  type="text" name="lastName" value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>National ID *</label>
                <input
                  type="text" name="nationalId" value={formData.nationalId}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Date of Birth</label>
                <input
                  type="date" name="dateOfBirth" value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Gender</label>
                <select
                  name="gender" value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Information</h2>
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label>Personal Email</label>
                <input
                  type="email" name="personalEmail" value={formData.personalEmail}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Work Email</label>
                <input
                  type="email" name="workEmail" value={formData.workEmail}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Mobile Phone</label>
                <input
                  type="tel" name="mobilePhone" value={formData.mobilePhone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Employment Information</h2>
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label>Client Number *</label>
                <input
                  type="text" name="employeeNumber" value={formData.employeeNumber}
                  onChange={handleChange}
                  required
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Start Date *</label>
                <input
                  type="date" name="dateOfHire" value={formData.dateOfHire}
                  onChange={handleChange}
                  required
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Initial Password *</label>
                <input
                  type="password" name="password" value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Client's initial password"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Department</label>
                <select
                  name="primaryDepartmentId" value={formData.primaryDepartmentId}
                  onChange={handleChange}
                >
                  <option value="">Select Department</option>
                  {(departments || []).map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button" className={styles.cancelButton}
              onClick={() => router.back()}
            >
              Cancel
            </button>
            <button
              type="submit" className={styles.submitButton}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}