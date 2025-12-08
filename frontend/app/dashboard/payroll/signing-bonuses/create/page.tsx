"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../payroll.module.css';

export default function CreateSigningBonusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    positionName: '',
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
      await axios.post('/payroll-configuration/signing-bonuses', formData);
      router.push('/dashboard/payroll/signing-bonuses');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Signing Bonus" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/signing-bonuses" className={styles.backLink}>
            ← Back to Signing Bonuses
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>✍️ Create Signing Bonus</h1>
            <p className={styles.formSubtitle}>
              Define a signing bonus for a position. It will require HR Manager approval.
            </p>

            {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Position Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="positionName"
                  className={styles.formInput}
                  value={formData.positionName}
                  onChange={handleChange}
                  placeholder="e.g., Junior Developer, Senior Manager, Team Lead"
                  required
                />
                <span className={styles.formHint}>The position that qualifies for this signing bonus</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Bonus Amount (EGP) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  className={styles.formInput}
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Enter signing bonus amount in EGP"
                  min="0"
                  step="1000"
                  required
                />
                <span className={styles.formHint}>One-time signing bonus for new hires in this position</span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/signing-bonuses')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '✍️ Create Signing Bonus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
