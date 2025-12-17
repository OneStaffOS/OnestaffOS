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
export default function EditAllowancePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
  });

  useEffect(() => {
    async function loadAllowance() {
      try {
        const response = await axios.get(`/payroll-configuration/allowances/${id}`);
        const allowance = response.data;
        
        if (allowance.status !== 'draft') {
          setError('Only draft allowances can be edited.');
          return;
        }

        setFormData({
          name: allowance.name || '',
          amount: allowance.amount || 0,
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    if (id) loadAllowance();
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
      await axios.put(`/payroll-configuration/allowances/${id}`, formData);
      router.push('/dashboard/payroll/allowances');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Edit Allowance" role="Payroll">
          <Spinner message="Loading allowance..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Edit Allowance" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/allowances" className={styles.backLink}>
            ← Back to Allowances
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>✏️ Edit Allowance</h1>
            <p className={styles.formSubtitle}>
              Update the allowance details. Only draft allowances can be edited.
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
                  placeholder="e.g., Housing Allowance, Transport Allowance"
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
