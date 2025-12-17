"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../time-management.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function CreateShiftTypePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await axios.post('/time-management/shift-types', { name: name.trim(), active });
      setSuccess('Shift type created successfully!');
      setTimeout(() => router.push('/dashboard/hr/time-management/shift-types'), 1000);
    } catch (err: any) {
      setError(err?.response?.data?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Shift Type" role="Time Management">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📋 Create Shift Type</h1>
              <p className={styles.pageSubtitle}>
                Define a new shift type category
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          <div className={styles.formCard}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Type Name *</label>
                  <input
                    className={styles.formInput}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Normal, Split, Rotating"
                  />
                </div>
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className={styles.formActions}>
                <button 
                  className={styles.btnPrimary} 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '✓ Create Type'}
                </button>
                <button 
                  type="button" 
                  className={styles.btnSecondary} 
                  onClick={() => router.back()}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
