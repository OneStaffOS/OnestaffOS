"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../payroll.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function EditPayGradePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    grade: '',
    baseSalary: 6000,
    grossSalary: 6000,
  });

  useEffect(() => {
    async function loadPayGrade() {
      try {
        const response = await axios.get(`/payroll-configuration/pay-grades/${id}`);
        const payGrade = response.data;
        
        if (payGrade.status !== 'draft') {
          setError('Only draft pay grades can be edited.');
          return;
        }

        setFormData({
          grade: payGrade.grade || '',
          baseSalary: payGrade.baseSalary || 6000,
          grossSalary: payGrade.grossSalary || 6000,
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    if (id) loadPayGrade();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'grade' ? value : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await axios.put(`/payroll-configuration/pay-grades/${id}`, formData);
      router.push('/dashboard/payroll/pay-grades');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Edit Pay Grade" role="Payroll">
          <Spinner message="Loading pay grade..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Edit Pay Grade" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/pay-grades" className={styles.backLink}>
            ← Back to Pay Grades
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>✏️ Edit Pay Grade</h1>
            <p className={styles.formSubtitle}>
              Update the pay grade details. Only draft pay grades can be edited.
            </p>

            {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Grade Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="grade"
                  className={styles.formInput}
                  value={formData.grade}
                  onChange={handleChange}
                  placeholder="e.g., Junior Software Engineer, Senior Manager"
                  required
                />
                <span className={styles.formHint}>Position grade/level name</span>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Base Salary (EGP) <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    name="baseSalary"
                    className={styles.formInput}
                    value={formData.baseSalary}
                    onChange={handleChange}
                    min="6000"
                    step="100"
                    required
                  />
                  <span className={styles.formHint}>Minimum: 6,000 EGP</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Gross Salary (EGP) <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    name="grossSalary"
                    className={styles.formInput}
                    value={formData.grossSalary}
                    onChange={handleChange}
                    min="6000"
                    step="100"
                    required
                  />
                  <span className={styles.formHint}>Total salary including allowances</span>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/pay-grades')}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
