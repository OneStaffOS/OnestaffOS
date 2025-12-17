"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../payroll.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function CreatePayGradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    grade: '',
    baseSalary: '',
    grossSalary: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'grade' ? value : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post('/payroll-configuration/pay-grades', formData);
      router.push('/dashboard/payroll/pay-grades');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Pay Grade" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/pay-grades" className={styles.backLink}>
            ← Back to Pay Grades
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>💰 Create Pay Grade</h1>
            <p className={styles.formSubtitle}>
              Define a new pay grade with base and gross salary. It will require HR Manager approval.
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
                    placeholder="Enter base salary (min 6,000 EGP)"
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
                    placeholder="Enter gross salary (min 6,000 EGP)"
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
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '💰 Create Pay Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
