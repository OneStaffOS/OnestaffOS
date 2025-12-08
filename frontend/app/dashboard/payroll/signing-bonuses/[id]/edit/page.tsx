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

export default function EditSigningBonusPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    positionName: '',
    amount: 0,
  });

  useEffect(() => {
    async function loadBonus() {
      try {
        const response = await axios.get(`/payroll-configuration/signing-bonuses/${id}`);
        const bonus = response.data;
        
        if (bonus.status !== 'draft') {
          setError('Only draft signing bonuses can be edited.');
          return;
        }

        setFormData({
          positionName: bonus.positionName || '',
          amount: bonus.amount || 0,
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    if (id) loadBonus();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await axios.put(`/payroll-configuration/signing-bonuses/${id}`, formData);
      router.push('/dashboard/payroll/signing-bonuses');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Edit Signing Bonus" role="Payroll">
          <Spinner message="Loading signing bonus..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Edit Signing Bonus" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/signing-bonuses" className={styles.backLink}>
            ← Back to Signing Bonuses
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>✏️ Edit Signing Bonus</h1>
            <p className={styles.formSubtitle}>
              Update the signing bonus details. Only draft entries can be edited.
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
                  placeholder="e.g., Junior Developer, Senior Manager"
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
                  min="0"
                  step="1000"
                  required
                />
                <span className={styles.formHint}>One-time signing bonus for new hires</span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/signing-bonuses')}
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
