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
import styles from '../execution.module.css';

interface SigningBonus {
  _id: string;
  employeeId: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  signingBonusId: {
    positionName: string;
    amount: number;
  };
  givenAmount: number;
  status: string;
  createdAt: string;
}

export default function SigningBonusesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bonuses, setBonuses] = useState<SigningBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadBonuses();
  }, []);

  async function loadBonuses() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/payroll-execution/signing-bonuses/pending');
      setBonuses(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load signing bonuses');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(bonusId: string) {
    if (!confirm('Are you sure you want to approve this signing bonus?')) return;
    setActionLoading(bonusId);
    setError(null);
    try {
      await axios.post(`/payroll-execution/signing-bonuses/${bonusId}/approve`);
      setSuccess('Signing bonus approved successfully');
      await loadBonuses();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to approve signing bonus');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(bonusId: string) {
    if (!confirm('Are you sure you want to reject this signing bonus?')) return;
    setActionLoading(bonusId);
    setError(null);
    try {
      await axios.post(`/payroll-execution/signing-bonuses/${bonusId}/reject`);
      setSuccess('Signing bonus rejected');
      await loadBonuses();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to reject signing bonus');
    } finally {
      setActionLoading(null);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Signing Bonuses Review" role="Payroll">
          <Spinner message="Loading signing bonuses..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Signing Bonuses Review" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/execution" className={styles.backLink}>
            ← Back to Payroll Execution
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>✍️ Signing Bonuses Review</h1>
              <p className={styles.pageSubtitle}>
                Review and approve signing bonuses for new hires before payroll processing
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>✅ {success}</div>}

          {/* Info */}
          <div className={styles.warningMessage}>
            ℹ️ <strong>Important:</strong> Signing bonuses must be approved before they can be included in payroll runs. 
            Only approved bonuses will be automatically added to new employees' first payroll.
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{bonuses.length}</span>
              <span className={styles.statLabel}>Pending Approvals</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {formatCurrency(bonuses.reduce((sum, b) => sum + b.givenAmount, 0))}
              </span>
              <span className={styles.statLabel}>Total Pending Amount</span>
            </div>
          </div>

          {/* Bonuses List */}
          <div className={styles.card}>
            {bonuses.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>✅</div>
                <h3 className={styles.emptyStateTitle}>All Caught Up!</h3>
                <p className={styles.emptyStateDescription}>
                  There are no pending signing bonuses to review at this time.
                </p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee Number</th>
                    <th>Position</th>
                    <th>Configured Amount</th>
                    <th>Given Amount</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bonuses.map((bonus) => (
                    <tr key={bonus._id}>
                      <td>
                        <strong>
                          {bonus.employeeId.firstName} {bonus.employeeId.lastName}
                        </strong>
                      </td>
                      <td>{bonus.employeeId.employeeNumber}</td>
                      <td>{bonus.signingBonusId?.positionName || '-'}</td>
                      <td>{formatCurrency(bonus.signingBonusId?.amount || 0)}</td>
                      <td>
                        <strong style={{ color: '#2563eb' }}>
                          {formatCurrency(bonus.givenAmount)}
                        </strong>
                      </td>
                      <td>{formatDate(bonus.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className={styles.btnSuccess}
                            onClick={() => handleApprove(bonus._id)}
                            disabled={actionLoading === bonus._id}
                          >
                            ✅ Approve
                          </button>
                          <button
                            className={styles.btnDanger}
                            onClick={() => handleReject(bonus._id)}
                            disabled={actionLoading === bonus._id}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
