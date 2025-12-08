"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../payroll.module.css';

export default function CreateTaxRulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rate: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rate' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post('/payroll-configuration/tax-rules', formData);
      router.push('/dashboard/payroll/tax-rules');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Tax Rule" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/tax-rules" className={styles.backLink}>
            ← Back to Tax Rules
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>🏛️ Create Tax Rule</h1>
            <p className={styles.formSubtitle}>
              Define a new tax rule for payroll deductions. It will require HR Manager approval.
            </p>

            {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Tax Rule Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className={styles.formInput}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Income Tax, Social Security Tax"
                  required
                />
                <span className={styles.formHint}>A unique name for the tax rule</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Tax Rate (%) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="rate"
                  className={styles.formInput}
                  value={formData.rate}
                  onChange={handleChange}
                  placeholder="Enter tax rate (0-100)"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
                <span className={styles.formHint}>Tax rate as a percentage (0-100)</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Description
                </label>
                <textarea
                  name="description"
                  className={styles.formTextarea}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the tax rule and when it applies..."
                />
                <span className={styles.formHint}>Optional: Provide details about this tax rule</span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/tax-rules')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '🏛️ Create Tax Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
