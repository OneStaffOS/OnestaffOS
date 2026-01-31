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
export default function CreatePayTypePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    type: '',
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
      await axios.post('/payroll-configuration/pay-types', formData);
      router.push('/dashboard/payroll/pay-types');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Pay Type" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/pay-types" className={styles.backLink}>
            ← Back to Pay Types
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}> Create Pay Type</h1>
            <p className={styles.formSubtitle}>
              Define a new payment type. It will require HR Manager approval.
            </p>

            {error && <div className={styles.errorMessage}> {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Pay Type Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text" name="type" className={styles.formInput}
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="e.g., Monthly, Hourly, Daily, Weekly" required
                />
                <span className={styles.formHint}>The type of payment schedule</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Amount (EGP) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number" name="amount" className={styles.formInput}
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Enter amount (min 6,000 EGP)" min="6000" step="100" required
                />
                <span className={styles.formHint}>Base amount for this pay type</span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button" className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/pay-types')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit" className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Pay Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}