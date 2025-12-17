/**
 * Employee Disputes Page (Route: /dashboard/employee/disputes)
 * REQ-AE-07: View and track disputes raised about appraisals
 * Displays all disputes submitted by the employee with status and resolution
 */

"use client";

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import { useRouter } from 'next/navigation';
import styles from './disputes.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface DisputeSummary {
  _id: string;
  appraisalId?: { _id?: string } | string;
  reason?: string;
  status?: string;
  submittedAt?: string;
  resolutionSummary?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export default function MyDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/performance/disputes/my-disputes');
      setDisputes(res.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch disputes', err);
      setError(err?.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('pending') || statusLower.includes('open')) {
      return <span className={styles.statusPending}>⏳ Pending</span>;
    }
    if (statusLower.includes('approved') || statusLower.includes('resolved')) {
      return <span className={styles.statusApproved}>✅ Resolved</span>;
    }
    if (statusLower.includes('rejected') || statusLower.includes('denied')) {
      return <span className={styles.statusRejected}>❌ Rejected</span>;
    }
    return <span className={styles.statusDefault}>{status}</span>;
  };

  const filteredDisputes = disputes.filter(d => {
    if (filter === 'all') return true;
    const statusLower = d.status?.toLowerCase() || '';
    if (filter === 'pending') return statusLower.includes('pending') || statusLower.includes('open');
    if (filter === 'resolved') return statusLower.includes('resolved') || statusLower.includes('approved') || statusLower.includes('rejected');
    return true;
  });

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="My Disputes" role="Employee">
          <Spinner fullScreen message="Loading disputes..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My Disputes" role="Employee">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>⚖️ My Disputes</h1>
              <p className={styles.subtitle}>Track appraisal disputes you've submitted</p>
            </div>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            <button
              className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({disputes.length})
            </button>
            <button
              className={`${styles.filterTab} ${filter === 'pending' ? styles.active : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending ({disputes.filter(d => d.status?.toLowerCase().includes('pending') || d.status?.toLowerCase().includes('open')).length})
            </button>
            <button
              className={`${styles.filterTab} ${filter === 'resolved' ? styles.active : ''}`}
              onClick={() => setFilter('resolved')}
            >
              Resolved ({disputes.filter(d => d.status?.toLowerCase().includes('resolved') || d.status?.toLowerCase().includes('approved') || d.status?.toLowerCase().includes('rejected')).length})
            </button>
          </div>

          {filteredDisputes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <h3>No Disputes Found</h3>
              <p>
                {filter === 'all' 
                  ? "You haven't submitted any disputes yet."
                  : `No ${filter} disputes to display.`}
              </p>
            </div>
          ) : (
            <div className={styles.disputesList}>
              {filteredDisputes.map(dispute => (
                <div key={dispute._id} className={styles.disputeCard}>
                  <div className={styles.disputeHeader}>
                    <div className={styles.disputeTitle}>
                      <h3>{dispute.reason || 'Appraisal Dispute'}</h3>
                      {getStatusBadge(dispute.status || 'UNKNOWN')}
                    </div>
                    <div className={styles.disputeMeta}>
                      <span>📅 Submitted: {dispute.submittedAt ? new Date(dispute.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                    </div>
                  </div>

                  {dispute.resolutionSummary && (
                    <div className={styles.resolutionBox}>
                      <div className={styles.resolutionHeader}>
                        <strong>📝 Resolution</strong>
                        {dispute.resolvedAt && (
                          <span className={styles.resolutionDate}>
                            {new Date(dispute.resolvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <p className={styles.resolutionText}>{dispute.resolutionSummary}</p>
                      {dispute.resolvedBy && (
                        <p className={styles.resolvedBy}>Resolved by: {dispute.resolvedBy}</p>
                      )}
                    </div>
                  )}

                  <div className={styles.disputeActions}>
                    {dispute.appraisalId && (
                      <button
                        onClick={() => {
                          const aid = typeof dispute.appraisalId === 'string' 
                            ? dispute.appraisalId 
                            : (dispute.appraisalId as any)._id;
                          if (aid) router.push(`/dashboard/employee/appraisals/${aid}`);
                        }}
                        className={styles.viewButton}
                      >
                        View Appraisal →
                      </button>
                    )}
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
