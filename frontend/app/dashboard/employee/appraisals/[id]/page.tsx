"use client";

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import { useParams, useRouter } from 'next/navigation';
import styles from '../page.module.css';

export default function AppraisalDetailPage() {
  // Note: next/navigation's useParams isn't available as a hook in older Next versions in app dir.
  // We'll parse from window.location as fallback.
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const params = useParams?.() as any;
  const getIdFromPath = () => {
    if (typeof window === 'undefined') return null;
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1];
  };

  const idFromParams = params?.id;
  const idFromPath = getIdFromPath();
  const id = idFromParams || idFromPath;

  const isValidObjectId = (val?: string) => typeof val === 'string' && /^[a-fA-F0-9]{24}$/.test(val);

  useEffect(() => {
    if (!id) return;
    if (!isValidObjectId(id)) {
      setError('Invalid appraisal id in URL');
      setLoading(false);
      return;
    }
    fetchRecord(id);
  }, [id]);

  const fetchRecord = async (recordId: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`/performance/records/${recordId}`);
      setRecord(res.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch appraisal record', err);
      setError(err?.response?.data?.message || 'Failed to load appraisal');
    } finally {
      setLoading(false);
    }
  };

  const submitDispute = async () => {
    if (!record) return;
    if (!reason) return alert('Please provide a short reason');
    setSubmitting(true);
    try {
      await axios.post('/performance/disputes', {
        appraisalId: record._id,
        reason,
        details,
      });
      alert('Dispute submitted successfully');
      router.push('/dashboard/employee/appraisals');
    } catch (err: any) {
      console.error('Failed to submit dispute', err);
      alert(err?.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '-');

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Appraisal Detail" role="Employee">
        <div className={styles.container}>
          <button onClick={() => router.back()} className={styles.backLink}>← Back</button>

          {loading && <p>Loading appraisal...</p>}
          {error && <div className={styles.error}>{error}</div>}

          {record && (
            <div className={styles.gridTwo}>
              <div className={styles.mainCard}>
                <div className={styles.titleRow}>
                  <div>
                    <h2 style={{ margin: 0 }}>{(record.cycleId && record.cycleId.name) || 'Appraisal'}</h2>
                    <div className={styles.muted} style={{ marginTop: 6 }}>{(record.templateId && record.templateId.name) || ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{record.totalScore ?? '-'}</div>
                    <div className={styles.muted} style={{ fontSize: 13 }}>{record.overallRatingLabel ?? ''}</div>
                    <div style={{ marginTop: 8 }}><span className={styles.statusTag}>{record.status}</span></div>
                  </div>
                </div>

                <section className={styles.ratingsHeader}>
                  <h4 style={{ marginBottom: 8 }}>Ratings</h4>
                  <div className={styles.ratingsGrid}>
                    <div style={{ fontWeight: 600 }}>Criteria</div>
                    <div style={{ fontWeight: 600, textAlign: 'center' }}>Score</div>
                    <div style={{ fontWeight: 600 }}>Comments</div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    {(record.ratings && record.ratings.length > 0 ? record.ratings : (record.templateId?.criteria || [])).map((r: any, idx: number) => (
                      <div key={idx} className={styles.ratingRow}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{r.title || r.key}</div>
                          <div className={styles.muted}>{r.details || ''}</div>
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 700 }}>{r.ratingValue ?? '-'}</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{r.comments || '-'}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ marginTop: 18 }}>
                  <h4 style={{ marginBottom: 8 }}>Manager Summary</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{record.managerSummary || 'No summary provided'}</p>

                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <div>
                      <strong>Strengths</strong>
                      <p style={{ marginTop: 6 }}>{record.strengths || '-'}</p>
                    </div>
                    <div>
                      <strong>Improvement Areas</strong>
                      <p style={{ marginTop: 6 }}>{record.improvementAreas || '-'}</p>
                    </div>
                  </div>
                </section>

                <section style={{ marginTop: 18 }} className={styles.muted}>
                  <div><strong>Manager:</strong> {record.managerProfileId ? `${record.managerProfileId.firstName || ''} ${record.managerProfileId.lastName || ''}`.trim() : '-'}</div>
                  <div><strong>Submitted:</strong> {formatDate(record.managerSubmittedAt)}</div>
                  <div><strong>Viewed:</strong> {formatDate(record.employeeViewedAt)}</div>
                </section>
              </div>

              <aside className={styles.asideCard}>
                <h4 style={{ marginTop: 0 }}>Actions</h4>

                <div style={{ marginBottom: 14 }}>
                  <button onClick={() => {
                    const ack = confirm('Acknowledge this appraisal as accurate?');
                    if (!ack) return;
                    axios.post(`/performance/records/${record._id}/acknowledge`, { comment: 'Acknowledged via portal' })
                      .then(() => { alert('Acknowledged'); fetchRecord(record._id); })
                      .catch((err) => alert(err?.response?.data?.message || 'Failed to acknowledge'));
                  }} className={styles.btnPrimary}>Acknowledge</button>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <h5 style={{ margin: '6px 0' }}>Raise Dispute</h5>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Reason (short)</label>
                  <input value={reason} onChange={e => setReason(e.target.value)} className={styles.input} />
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Details (optional)</label>
                  <textarea value={details} onChange={e => setDetails(e.target.value)} className={styles.textarea} />
                  <button onClick={submitDispute} disabled={submitting} className={styles.btnDanger}>{submitting ? 'Submitting...' : 'Submit Dispute'}</button>
                </div>

                <div style={{ marginTop: 12 }} className={styles.muted}>
                  <div><strong>Template:</strong> {record.templateId?.name || '-'}</div>
                  <div><strong>Cycle Type:</strong> {record.cycleId?.cycleType || '-'}</div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
