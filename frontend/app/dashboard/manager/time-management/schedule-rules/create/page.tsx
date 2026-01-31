"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../../hr/time-management.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function CreateScheduleRulePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pattern.trim()) return setError('Please provide both name and pattern');
    setLoading(true);
    setError(null);
    try {
      await axios.post('/time-management/schedule-rules', { name: name.trim(), pattern: pattern.trim() });
      setSuccess('Rule created successfully!');
      setTimeout(() => router.push('/dashboard/manager/time-management/schedule-rules'), 1000);
    } catch (err: any) {
      setError(err?.response?.data?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Schedule Rule" role="Time Management">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Create Scheduling Rule</h1>
              <p className={styles.pageSubtitle}>
                Define a new scheduling pattern for your team
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          <div className={styles.formCard}>
            <form onSubmit={handleCreate} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Rule Name *</label>
                  <input 
                    className={styles.formInput} 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. 4-on/3-off, Standard Week"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Pattern *</label>
                  <input 
                    className={styles.formInput} 
                    value={pattern} 
                    onChange={(e) => setPattern(e.target.value)} 
                    placeholder="e.g. 4443 or Mon-Fri: 09:00-17:00"
                  />
                  <p className={styles.formHint}>
                    Define the scheduling pattern expression
                  </p>
                </div>
              </div>

              <div className={styles.formActions}>
                <button 
                  className={styles.btnPrimary} 
                  type="submit" disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Rule'}
                </button>
                <button 
                  type="button" className={styles.btnSecondary} 
                  onClick={() => router.push('/dashboard/manager/time-management/schedule-rules')}
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