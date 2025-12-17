"use client";

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import { useParams, useRouter } from 'next/navigation';
import styles from './appraisal-detail.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function AppraisalDetailPage() {
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

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
      const recordData = res.data;
      
      // Calculate total score if not present
      if (!recordData.totalScore && recordData.ratings && recordData.ratings.length > 0) {
        const total = recordData.ratings.reduce((sum: number, r: any) => sum + (r.ratingValue || 0), 0);
        recordData.totalScore = total;
      }
      
      setRecord(recordData);
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
    if (!reason.trim()) {
      alert('Please provide a reason for the dispute');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post('/performance/disputes', {
        appraisalId: record._id,
        reason,
        details,
      });
      alert('Dispute submitted successfully');
      router.push('/dashboard/employee/disputes');
    } catch (err: any) {
      console.error('Failed to submit dispute', err);
      alert(err?.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!record) return;
    if (!confirm('Acknowledge this appraisal as reviewed and accurate?')) return;
    
    setAcknowledging(true);
    try {
      await axios.post(`/performance/records/${record._id}/acknowledge`, { 
        comment: 'Acknowledged via employee portal' 
      });
      alert('Appraisal acknowledged successfully');
      fetchRecord(record._id);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to acknowledge');
    } finally {
      setAcknowledging(false);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return 'Not yet';
    return new Date(d).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'DRAFT': styles.statusDraft,
      'MANAGER_SUBMITTED': styles.statusSubmitted,
      'HR_PUBLISHED': styles.statusPublished,
      'ACKNOWLEDGED': styles.statusAcknowledged,
      'ARCHIVED': styles.statusArchived,
    };
    return statusMap[status] || styles.statusDefault;
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Appraisal Details" role="Employee">
        <div className={styles.container}>
          {loading ? (
            <Spinner message="Loading appraisal details..." />
          ) : error ? (
            <div className={styles.errorBanner}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          ) : record ? (
            <>
              <button onClick={() => router.back()} className={styles.backButton}>
                ← Back to My Appraisals
              </button>

              <div className={styles.contentGrid}>
                {/* Main Content */}
                <div className={styles.mainCard}>
                  <div className={styles.header}>
                    <div className={styles.headerInfo}>
                      <h1 className={styles.title}>
                        {(record.cycleId && record.cycleId.name) || 'Performance Appraisal'}
                      </h1>
                      <p className={styles.subtitle}>
                        {(record.templateId && record.templateId.name) || 'Standard Template'}
                      </p>
                    </div>
                    <div className={styles.headerStats}>
                      <div className={styles.scoreBox}>
                        <div className={styles.scoreValue}>{record.totalScore ?? 'N/A'}</div>
                        <div className={styles.scoreLabel}>Total Score</div>
                      </div>
                      <div className={styles.ratingBox}>
                        <div className={styles.ratingValue}>{record.overallRatingLabel || 'Not Rated'}</div>
                        <span className={`${styles.statusBadge} ${getStatusBadge(record.status)}`}>
                          {record.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ratings Section */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>📊 Performance Ratings</h2>
                    <div className={styles.ratingsContainer}>
                      {(record.ratings && record.ratings.length > 0 ? record.ratings : (record.templateId?.criteria || [])).map((r: any, idx: number) => (
                        <div key={idx} className={styles.ratingCard}>
                          <div className={styles.ratingHeader}>
                            <div>
                              <h3 className={styles.criteriaTitle}>{r.title || r.key}</h3>
                              {r.details && <p className={styles.criteriaDetails}>{r.details}</p>}
                            </div>
                            <div className={styles.scoreCircle}>
                              <span className={styles.scoreNumber}>{r.ratingValue ?? '-'}</span>
                            </div>
                          </div>
                          {r.comments && (
                            <div className={styles.commentsBox}>
                              <strong>Manager Comments:</strong>
                              <p>{r.comments}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Manager Summary */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>💬 Manager's Assessment</h2>
                    <div className={styles.summaryCard}>
                      <div className={styles.summarySection}>
                        <h4>Overall Summary</h4>
                        <p>{record.managerSummary || 'No summary provided by manager.'}</p>
                      </div>

                      <div className={styles.strengthsImprovement}>
                        <div className={styles.strengthsBox}>
                          <h4>✨ Strengths</h4>
                          <p>{record.strengths || 'Not specified'}</p>
                        </div>
                        <div className={styles.improvementBox}>
                          <h4>🎯 Areas for Improvement</h4>
                          <p>{record.improvementAreas || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Timeline */}
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>📅 Timeline</h2>
                    <div className={styles.timeline}>
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineIcon}>👤</div>
                        <div>
                          <strong>Evaluated by:</strong> {record.managerProfileId ? `${record.managerProfileId.firstName || ''} ${record.managerProfileId.lastName || ''}`.trim() : 'Unknown'}
                        </div>
                      </div>
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineIcon}>📝</div>
                        <div>
                          <strong>Submitted:</strong> {formatDate(record.managerSubmittedAt)}
                        </div>
                      </div>
                      {record.hrPublishedAt && (
                        <div className={styles.timelineItem}>
                          <div className={styles.timelineIcon}>✅</div>
                          <div>
                            <strong>Published by HR:</strong> {formatDate(record.hrPublishedAt)}
                          </div>
                        </div>
                      )}
                      {record.employeeViewedAt && (
                        <div className={styles.timelineItem}>
                          <div className={styles.timelineIcon}>👁️</div>
                          <div>
                            <strong>Viewed by you:</strong> {formatDate(record.employeeViewedAt)}
                          </div>
                        </div>
                      )}
                      {record.employeeAcknowledgedAt && (
                        <div className={styles.timelineItem}>
                          <div className={styles.timelineIcon}>✔️</div>
                          <div>
                            <strong>Acknowledged:</strong> {formatDate(record.employeeAcknowledgedAt)}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Sidebar */}
                <aside className={styles.sidebar}>
                  <div className={styles.actionCard}>
                    <h3 className={styles.actionCardTitle}>Actions</h3>

                    {record.status === 'HR_PUBLISHED' && !record.employeeAcknowledgedAt && (
                      <button 
                        onClick={handleAcknowledge} 
                        disabled={acknowledging}
                        className={styles.acknowledgeButton}
                      >
                        {acknowledging ? '⏳ Acknowledging...' : '✅ Acknowledge Appraisal'}
                      </button>
                    )}

                    {record.employeeAcknowledgedAt && (
                      <div className={styles.acknowledgedBanner}>
                        <span className={styles.checkIcon}>✓</span>
                        <span>Acknowledged on {formatDate(record.employeeAcknowledgedAt)}</span>
                      </div>
                    )}

                    <div className={styles.disputeSection}>
                      <h4 className={styles.disputeTitle}>⚖️ Raise a Dispute</h4>
                      <p className={styles.disputeHint}>
                        If you disagree with this appraisal, you can raise a dispute for HR review.
                      </p>

                      <div className={styles.formGroup}>
                        <label htmlFor="reason">Reason for Dispute</label>
                        <input
                          id="reason"
                          type="text"
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="Brief reason (required)"
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="details">Additional Details (Optional)</label>
                        <textarea
                          id="details"
                          value={details}
                          onChange={e => setDetails(e.target.value)}
                          placeholder="Provide detailed explanation..."
                          className={styles.textarea}
                          rows={4}
                        />
                      </div>

                      <button
                        onClick={submitDispute}
                        disabled={submitting || !reason.trim()}
                        className={styles.disputeButton}
                      >
                        {submitting ? '⏳ Submitting...' : '📤 Submit Dispute'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <h4 className={styles.infoTitle}>Appraisal Information</h4>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Template:</span>
                      <span className={styles.infoValue}>{record.templateId?.name || 'N/A'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Cycle:</span>
                      <span className={styles.infoValue}>{record.cycleId?.name || 'N/A'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Cycle Type:</span>
                      <span className={styles.infoValue}>{record.cycleId?.cycleType || 'N/A'}</span>
                    </div>
                    {record.cycleId?.startDate && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Period:</span>
                        <span className={styles.infoValue}>
                          {new Date(record.cycleId.startDate).toLocaleDateString()} - {new Date(record.cycleId.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
