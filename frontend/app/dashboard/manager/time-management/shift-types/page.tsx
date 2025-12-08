"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../hr/time-management.module.css';

export default function ManagerShiftTypesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/time-management/shift-types');
      setItems(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeCount = items.filter(i => i.active).length;
  const inactiveCount = items.filter(i => !i.active).length;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Shift Types" role="Time Management">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📋 Shift Types</h1>
              <p className={styles.pageSubtitle}>
                View available shift type categories
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{items.length}</span>
              <span className={styles.statLabel}>Total Types</span>
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
            <Spinner message="Loading shift types..." />
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📋</span>
              <h3>No Shift Types</h3>
              <p>No shift types have been created yet.</p>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

