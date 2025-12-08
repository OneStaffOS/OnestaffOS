"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../payroll.module.css';

export default function CreateTerminationBenefitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    terms: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      await axios.post('/payroll-configuration/termination-benefits', formData);
      router.push('/dashboard/payroll/termination-benefits');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Termination Benefit" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/termination-benefits" className={styles.backLink}>
            ← Back to Termination Benefits
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>📤 Create Termination Benefit</h1>
            <p className={styles.formSubtitle}>
              Define an end-of-service benefit. It will require HR Manager approval.
            </p>

            {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Benefit Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className={styles.formInput}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., End of Service Gratuity, Severance Pay"
                  required
                />
                <span className={styles.formHint}>The name of the termination/resignation benefit</span>
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
                  placeholder="Enter benefit amount in EGP"
                  min="0"
                  step="1000"
                  required
                />
                <span className={styles.formHint}>The benefit amount in Egyptian Pounds</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Terms & Conditions
                </label>
                <textarea
                  name="terms"
                  className={styles.formTextarea}
                  value={formData.terms}
                  onChange={handleChange}
                  placeholder="Specify the terms and conditions for this benefit (e.g., eligibility criteria, calculation method)"
                />
                <span className={styles.formHint}>Optional: Describe the eligibility and calculation terms</span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/termination-benefits')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '📤 Create Benefit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
