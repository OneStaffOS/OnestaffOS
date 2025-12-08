"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import styles from '../dashboard.module.css';

export default function LeaderDashboard() {
  const router = useRouter();

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leader Dashboard" role="Leader">
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Department Overview</h3>
            <p className={styles.statValue}>-</p>
            <span className={styles.statLabel}>Strategic metrics</span>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Leadership Actions</h2>
          <div className={styles.actionGrid}>
            <button className={styles.actionCard} onClick={() => router.push('/dashboard/leader/notifications')}>
              <span className={styles.actionIcon}>📢</span>
              <span>Post Announcement</span>
            </button>

            <button className={styles.actionCard} onClick={() => router.push('/dashboard/leader/time-exceptions')}>
              <span className={styles.actionIcon}>⚠️</span>
              <span>Review Time Exceptions</span>
            </button>

            <button className={styles.actionCard} onClick={() => router.push('/dashboard/manager/performance-dashboard')}>
              <span className={styles.actionIcon}>📊</span>
              <span>Performance Overview</span>
            </button>

            <button className={styles.actionCard} onClick={() => router.push('/dashboard/manager/team')}>
              <span className={styles.actionIcon}>👥</span>
              <span>Department Team</span>
            </button>

            <button className={styles.actionCard} onClick={() => router.push('/dashboard/manager/leave-requests')}>
              <span className={styles.actionIcon}>📅</span>
              <span>Leave Requests</span>
            </button>

            <button className={styles.actionCard} onClick={() => router.push('/dashboard/hr/reports')}>
              <span className={styles.actionIcon}>📈</span>
              <span>Department Reports</span>
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
