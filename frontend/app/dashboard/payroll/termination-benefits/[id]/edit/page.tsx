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

export default function EditTerminationBenefitPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    terms: '',
  });

  useEffect(() => {
    async function loadBenefit() {
      try {
        const response = await axios.get(`/payroll-configuration/termination-benefits/${id}`);
        const benefit = response.data;
        
        if (benefit.status !== 'draft') {
          setError('Only draft termination benefits can be edited.');
          return;
        }

        setFormData({
          name: benefit.name || '',
          amount: benefit.amount || 0,
          terms: benefit.terms || '',
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    if (id) loadBenefit();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      await axios.put(`/payroll-configuration/termination-benefits/${id}`, formData);
      router.push('/dashboard/payroll/termination-benefits');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Edit Termination Benefit" role="Payroll">
          <Spinner message="Loading termination benefit..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Edit Termination Benefit" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/termination-benefits" className={styles.backLink}>
            ← Back to Termination Benefits
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>✏️ Edit Termination Benefit</h1>
            <p className={styles.formSubtitle}>
              Update the termination benefit details. Only draft entries can be edited.
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
                  placeholder="e.g., End of Service Gratuity"
                  required
                />
                <span className={styles.formHint}>The name of the termination benefit</span>
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
                  placeholder="Specify the terms and conditions for this benefit"
                />
                <span className={styles.formHint}>Optional: Describe the eligibility and calculation terms</span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/termination-benefits')}
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
