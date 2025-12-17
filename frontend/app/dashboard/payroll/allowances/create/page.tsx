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
export default function CreateAllowancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post('/payroll-configuration/allowances', formData);
      router.push('/dashboard/payroll/allowances');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Allowance" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/allowances" className={styles.backLink}>
            ← Back to Allowances
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>🎁 Create Allowance</h1>
            <p className={styles.formSubtitle}>
              Define a new employee allowance. It will require HR Manager approval.
            </p>

            {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Allowance Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className={styles.formInput}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Housing Allowance, Transport Allowance, Meal Allowance"
                  required
                />
                <span className={styles.formHint}>The name of the allowance</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Amount (EGP) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  className={styles.formInput}
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Enter allowance amount in EGP"
                  min="0"
                  step="100"
                  required
                />
                <span className={styles.formHint}>The allowance amount in Egyptian Pounds</span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/allowances')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '🎁 Create Allowance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
