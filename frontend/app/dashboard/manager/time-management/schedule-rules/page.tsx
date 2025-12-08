"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../hr/time-management.module.css';

export default function ManagerScheduleRulesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/time-management/schedule-rules');
      setItems(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggleActive(id: string, current: boolean) {
    if (!confirm(`${current ? 'Deactivate' : 'Activate'} this schedule rule?`)) return;
    setError(null);
    try {
      await axios.put(`/time-management/schedule-rules/${id}`, { active: !current });
      setSuccess(`Rule ${current ? 'deactivated' : 'activated'} successfully`);
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || String(err));
    }
  }

  const activeCount = items.filter(i => i.active).length;
  const inactiveCount = items.filter(i => !i.active).length;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Schedule Rules" role="Time Management">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📅 Scheduling Rules</h1>
              <p className={styles.pageSubtitle}>
                Manage scheduling patterns and rules for your team
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.btnPrimary}
                onClick={() => router.push('/dashboard/manager/time-management/schedule-rules/create')}
              >
                ➕ Create Rule
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{items.length}</span>
              <span className={styles.statLabel}>Total Rules</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{activeCount}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{inactiveCount}</span>
              <span className={styles.statLabel}>Inactive</span>
            </div>
          </div>

          {loading ? (
            <Spinner message="Loading rules..." />
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📅</span>
              <h3>No Scheduling Rules</h3>
              <p>Create your first scheduling rule to get started.</p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {items.map((it: any) => (
                <div key={it._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>{it.name}</h3>
                    </div>
                    <span className={`${styles.badge} ${it.active ? styles.badgeActive : styles.badgeInactive}`}>
                      {it.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Pattern:</span>
                      <span>{it.pattern || '—'}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button 
                      className={`${it.active ? styles.btnWarning : styles.btnSuccess} ${styles.btnSmall}`}
                      onClick={() => handleToggleActive(it._id, it.active)}
                    >
                      {it.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
