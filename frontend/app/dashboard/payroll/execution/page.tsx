"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './execution.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface PayrollStats {
  totalRuns: number;
  draftRuns: number;
  underReview: number;
  approved: number;
  pendingBonuses: number;
  pendingBenefits: number;
}

export default function PayrollExecutionDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const [runs, bonuses, benefits] = await Promise.all([
        axios.get('/payroll-execution/runs').catch(() => ({ data: [] })),
        axios.get('/payroll-execution/signing-bonuses/pending').catch(() => ({ data: [] })),
        axios.get('/payroll-execution/termination-benefits/pending').catch(() => ({ data: [] })),
      ]);

      const runsData = runs.data || [];
      
      setStats({
        totalRuns: runsData.length,
        draftRuns: runsData.filter((r: any) => r.status === 'draft').length,
        underReview: runsData.filter((r: any) => r.status === 'under review').length,
        approved: runsData.filter((r: any) => r.status === 'approved').length,
        pendingBonuses: (bonuses.data || []).length,
        pendingBenefits: (benefits.data || []).length,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Payroll Execution" role="Payroll Specialist">
          <Spinner message="Loading payroll execution dashboard..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const modules = [
    {
      id: 'payroll-runs',
      title: 'Payroll Runs',
      description: 'Create, manage, and process monthly payroll runs with automated calculations.',
      icon: '',
      path: '/dashboard/payroll/execution/runs',
      stats: [
        { label: 'Total Runs', value: stats?.totalRuns || 0 },
        { label: 'In Draft', value: stats?.draftRuns || 0 },
      ],
    },
    {
      id: 'signing-bonuses',
      title: 'Signing Bonuses',
      description: 'Review and approve signing bonuses for new hires before payroll processing.',
      icon: '',
      path: '/dashboard/payroll/execution/signing-bonuses',
      stats: [
        { label: 'Pending', value: stats?.pendingBonuses || 0 },
      ],
    },
    {
      id: 'termination-benefits',
      title: 'Termination Benefits',
      description: 'Review and approve end-of-service benefits for terminated or resigned employees.',
      icon: '',
      path: '/dashboard/payroll/execution/termination-benefits',
      stats: [
        { label: 'Pending', value: stats?.pendingBenefits || 0 },
      ],
    },
    {
      id: 'payslips',
      title: 'Payslips',
      description: 'View, generate, and distribute employee payslips for completed payroll runs.',
      icon: '',
      path: '/dashboard/payroll/execution/payslips',
      stats: [],
    },
  ];

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Payroll Execution" role="Payroll Specialist">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Payroll Execution & Processing</h1>
              <p className={styles.pageSubtitle}>
                Manage payroll runs, approve bonuses and benefits, and generate payslips
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}> {error}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats?.totalRuns || 0}</span>
              <span className={styles.statLabel}>Total Payroll Runs</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats?.underReview || 0}</span>
              <span className={styles.statLabel}>Under Review</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats?.approved || 0}</span>
              <span className={styles.statLabel}>Approved Runs</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {(stats?.pendingBonuses || 0) + (stats?.pendingBenefits || 0)}
              </span>
              <span className={styles.statLabel}>Pending Approvals</span>
            </div>
          </div>

          {/* Pending Approvals Alert */}
          {((stats?.pendingBonuses || 0) > 0 || (stats?.pendingBenefits || 0) > 0) && (
            <div className={styles.warningMessage}>
               You have {(stats?.pendingBonuses || 0) + (stats?.pendingBenefits || 0)} pending 
              approvals that need review before processing payroll
            </div>
          )}

          {/* Module Cards */}
          <div className={styles.moduleGrid}>
            {modules.map((module) => (
              <Link
                key={module.id}
                href={module.path}
                className={styles.moduleCard}
              >
                <span className={styles.moduleIcon}>{module.icon}</span>
                <h3 className={styles.moduleTitle}>{module.title}</h3>
                <p className={styles.moduleDescription}>{module.description}</p>
                {module.stats.length > 0 && (
                  <div className={styles.moduleStats}>
                    {module.stats.map((stat, idx) => (
                      <div key={idx} className={styles.moduleStat}>
                        <span className={styles.moduleStatValue}>{stat.value}</span>
                        <span className={styles.moduleStatLabel}>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Quick Actions</h2>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className={styles.btnPrimary}
                onClick={() => router.push('/dashboard/payroll/execution/runs/create')}
              >
                 Create New Payroll Run
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => router.push('/dashboard/payroll/execution/runs')}
              >
                 View All Payroll Runs
              </button>
              {((stats?.pendingBonuses || 0) > 0) && (
                <button
                  className={styles.btnWarning}
                  onClick={() => router.push('/dashboard/payroll/execution/signing-bonuses')}
                >
                   Review Signing Bonuses ({stats?.pendingBonuses})
                </button>
              )}
              {((stats?.pendingBenefits || 0) > 0) && (
                <button
                  className={styles.btnWarning}
                  onClick={() => router.push('/dashboard/payroll/execution/termination-benefits')}
                >
                   Review Termination Benefits ({stats?.pendingBenefits})
                </button>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}