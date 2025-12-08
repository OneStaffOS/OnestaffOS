"use client";

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface AppraisalSummary {
  _id: string;
  assignmentId?: string;
  cycleId?: { _id?: string; name?: string; cycleType?: string } | string;
  templateId?: { _id?: string; name?: string } | string;
  totalScore?: number;
  overallRatingLabel?: string;
  hrPublishedAt?: string;
  managerProfileId?: { firstName?: string; lastName?: string } | string;
  status?: string;
  managerSubmittedAt?: string;
}

export default function MyAppraisalsPage() {
  const [appraisals, setAppraisals] = useState<AppraisalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchAppraisals();
  }, []);

  const fetchAppraisals = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/performance/results/my-results');
      setAppraisals(res.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch appraisals', err);
      setError(err?.response?.data?.message || 'Failed to load appraisals');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '-');

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My Appraisals" role="Employee">
        <div className={styles.container}>
          <h2 className={styles.heading}>My Appraisal Results</h2>

          {loading && <div className={styles.notice}>Loading appraisals...</div>}
          {error && <div className={styles.error}>{error}</div>}

          {!loading && appraisals.length === 0 && (
            <div className={styles.empty}>No appraisal results available.</div>
          )}

          <div className={styles.list}>
            {appraisals.map(a => {
              const id = (a as any)._id ? (a as any)._id.toString() : '';
              const cycleName = (a.cycleId && typeof a.cycleId === 'object') ? a.cycleId.name : (a.cycleId as any) || 'Appraisal';
              const templateName = (a.templateId && typeof a.templateId === 'object') ? a.templateId.name : (a.templateId as any) || '';
              const managerName = (a.managerProfileId && typeof a.managerProfileId === 'object') ? `${a.managerProfileId.firstName || ''} ${a.managerProfileId.lastName || ''}`.trim() : (a.managerProfileId as any) || '-';

              return (
                <div key={id || Math.random()} className={styles.card}>
                  <div className={styles.cardLeft}>
                    <div className={styles.scoreBadge}>{a.totalScore ?? '-'}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{cycleName}</div>
                      <div className={styles.meta}>{templateName}</div>
                      <div className={styles.meta} style={{ marginTop: 6 }}>Manager: {managerName}</div>
                    </div>
                  </div>

                  <div className={styles.cardRight}>
                    <div style={{ fontWeight: 700 }}>{a.overallRatingLabel || '-'}</div>
                    <div className={styles.meta}>{formatDate(a.managerSubmittedAt || a.hrPublishedAt)}</div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => router.push(`/dashboard/employee/appraisals/${id}`)} className={styles.viewBtn}>View</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
