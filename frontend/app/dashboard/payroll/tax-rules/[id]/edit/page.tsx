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
export default function EditTaxRulePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rate: 0,
  });

  useEffect(() => {
    async function loadTaxRule() {
      try {
        const response = await axios.get(`/payroll-configuration/tax-rules/${id}`);
        const rule = response.data;
        
        if (rule.status !== 'draft') {
          setError('Only draft tax rules can be edited.');
          return;
        }

        setFormData({
          name: rule.name || '',
          description: rule.description || '',
          rate: rule.rate || 0,
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    if (id) loadTaxRule();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rate' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await axios.put(`/payroll-configuration/tax-rules/${id}`, formData);
      router.push('/dashboard/payroll/tax-rules');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.LEGAL_POLICY_ADMIN, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Edit Tax Rule" role="Payroll">
          <Spinner message="Loading tax rule..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.LEGAL_POLICY_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Edit Tax Rule" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/tax-rules" className={styles.backLink}>
            ← Back to Tax Rules
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}> Edit Tax Rule</h1>
            <p className={styles.formSubtitle}>
              Update the tax rule details. Only draft entries can be edited.
            </p>

            {error && <div className={styles.errorMessage}> {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Tax Rule Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text" name="name" className={styles.formInput}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Income Tax" required
                />
                <span className={styles.formHint}>A unique name for the tax rule</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Tax Rate (%) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number" name="rate" className={styles.formInput}
                  value={formData.rate}
                  onChange={handleChange}
                  min="0" max="100" step="0.01" required
                />
                <span className={styles.formHint}>Tax rate as a percentage (0-100)</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Description
                </label>
                <textarea
                  name="description" className={styles.formTextarea}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the tax rule..."
                />
                <span className={styles.formHint}>Optional: Provide details about this tax rule</span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button" className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/tax-rules')}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit" className={styles.btnPrimary}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}