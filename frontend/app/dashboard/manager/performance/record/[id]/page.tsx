'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import styles from '../../appraisal-form.module.css';

export default function AppraisalRecordViewer() {
  const params = useParams();
  const recordId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordId) return;
    const fetchRecord = async () => {
      try {
        setLoading(true);
        const resp = await axios.get(`/performance/records/${recordId}`);
        setRecord(resp.data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load appraisal record', err);
        setError(err.response?.data?.message || 'Failed to load appraisal record');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [recordId]);

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
        <Spinner message="Loading appraisal record..." />
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
        <div className={styles.error}>{error}</div>
      </ProtectedRoute>
    );
  }

  if (!record) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
        <div className={styles.error}>Appraisal record not found</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Appraisal Record</h1>
            <p className={styles.subtitle}>{record.employeeProfileId?.firstName} {record.employeeProfileId?.lastName} — {record.cycleId?.name}</p>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Summary</h2>
          <div style={{ marginBottom: 12 }}>
            <strong>Total Score:</strong> {record.totalScore ?? '—'}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Overall Rating:</strong> {record.overallRatingLabel ?? '—'}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Manager Summary:</strong>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{record.managerSummary || '—'}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Strengths:</strong>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{record.strengths || '—'}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Improvement Areas:</strong>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{record.improvementAreas || '—'}</div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Ratings</h2>
          {Array.isArray(record.ratings) && record.ratings.length > 0 ? (
            record.ratings.map((r: any, idx: number) => (
              <div key={r.key || idx} className={styles.criterionCard}>
                <div className={styles.criterionHeader}>
                  <h3 className={styles.criterionTitle}>{idx + 1}. {r.title}</h3>
                  <div style={{ fontWeight: 600 }}>{r.ratingValue}</div>
                </div>
                {r.comments && <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.comments}</div>}
              </div>
            ))
          ) : (
            <div>No ratings available</div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
