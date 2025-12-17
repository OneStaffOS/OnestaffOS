"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './overtime-create.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function CreateOvertimeRulePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await axios.post('/time-management/overtime-rules', { name, description });
      router.push('/dashboard/hr/overtime');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER]}>
      <DashboardLayout title="Create Overtime Rule" role="HR">
        <div style={{ padding: 16 }}>
          <h2>Create Overtime Rule</h2>
          <form onSubmit={submit} className={styles.root}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <div className={styles.actions}>
              <button className={styles.actionCard} type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Create'}
              </button>
              <button type="button" className={styles.actionCard} onClick={() => router.push('/dashboard/hr/overtime')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
