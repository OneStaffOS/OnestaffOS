"use client";

import { useEffect, useState } from 'react';
import axios from '@/lib/axios-config';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import styles from '../../hr/time-management.module.css';
import { SystemRole } from '@/lib/roles';

export default function AttendanceRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [timeExceptions, setTimeExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFormFor, setOpenFormFor] = useState<string | null>(null);
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'corrections' | 'exceptions'>('records');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // get my profile first so we can query time-exceptions for the current user
      const profileRes = await axios.get('/employee-profile/my-profile');
      const myId = profileRes?.data?._id;

      const [recRes, reqRes, teRes] = await Promise.all([
        axios.get('/time-management/attendance/records'),
        axios.get('/time-management/correction-requests/my'),
        myId ? axios.get(`/time-management/time-exceptions?employeeId=${myId}`) : Promise.resolve({ data: [] }),
      ]);

      setRecords(recRes.data || []);
      setRequests(reqRes.data || []);
      setTimeExceptions(teRes.data || []);
    } catch (err) {
      console.error('Failed to fetch attendance records, requests or time exceptions', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitCorrection = async (attendanceRecordId: string) => {
    const reason = reasonMap[attendanceRecordId] || '';
    if (!reason.trim()) {
      setError('Please provide a reason for the correction.');
      return;
    }
    setSubmittingId(attendanceRecordId);
    setError(null);
    setSuccess(null);
    try {
      const payload = { attendanceRecordId, reason };
      const resp = await axios.post('/time-management/correction-requests', payload);
      setSuccess('Correction request submitted successfully');
      setTimeout(() => setSuccess(null), 3000);
      setOpenFormFor(null);
      setReasonMap((m) => ({ ...m, [attendanceRecordId]: '' }));
      await fetchData();
    } catch (err: any) {
      console.error('Failed to submit correction', err);
      setError(err?.response?.data?.message || err.message || 'Failed to submit request');
    } finally {
      setSubmittingId(null);
    }
  };

  // Format date as DD/MM/YYYY (safe)
  const formatDateDDMMYYYY = (value: any) => {
    if (!value) return 'Unknown date';
    let d: Date;
    try {
      d = new Date(value);
      if (isNaN(d.getTime())) return 'Unknown date';
    } catch (e) {
      return 'Unknown date';
    }

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return styles.badgePending;
      case 'APPROVED': return styles.badgeApproved;
      case 'REJECTED': return styles.badgeRejected;
      default: return styles.badgePending;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;
  const missedPunchCount = records.filter(r => r.hasMissedPunch).length;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My Attendance Records" role="Employee">
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📊 My Attendance Records</h1>
              <p className={styles.pageSubtitle}>
                View your attendance records, request corrections, and track time exceptions
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            <button 
              className={activeTab === 'records' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setActiveTab('records')}
            >
              Attendance Records ({records.length})
            </button>
            <button 
              className={activeTab === 'corrections' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setActiveTab('corrections')}
            >
              Correction Requests ({requests.length})
            </button>
            <button 
              className={activeTab === 'exceptions' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setActiveTab('exceptions')}
            >
              Time Exceptions ({timeExceptions.length})
            </button>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{records.length}</span>
              <span className={styles.statLabel}>Total Records</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{missedPunchCount}</span>
              <span className={styles.statLabel}>Missed Punches</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingCount}</span>
              <span className={styles.statLabel}>Pending Corrections</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{timeExceptions.length}</span>
              <span className={styles.statLabel}>Exception Requests</span>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>⏳</span>
              <h3>Loading data...</h3>
            </div>
          ) : (
            <>
              {/* Attendance Records Tab */}
              {activeTab === 'records' && (
                <>
                  {records.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📭</span>
                      <h3>No Attendance Records</h3>
                      <p>You don't have any attendance records yet.</p>
                    </div>
                  ) : (
                    <div className={styles.cardsGrid}>
                      {records.map((r) => (
                        <div key={r._id} className={styles.card}>
                          <div className={styles.cardHeader}>
                            <div>
                              <h3 className={styles.cardTitle}>
                                📅 {formatDateDDMMYYYY(r.createdAt ?? (r.punches?.[0]?.time ?? null))}
                              </h3>
                              <p className={styles.cardSubtitle}>
                                Total work: {r.totalWorkMinutes} minutes
                              </p>
                            </div>
                            {r.hasMissedPunch && (
                              <span className={`${styles.badge} ${styles.badgeRejected}`}>
                                Missed Punch
                              </span>
                            )}
                          </div>

                          <div className={styles.cardBody}>
                            <div className={styles.cardMeta}>
                              <strong>Punches:</strong>
                              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                {(r.punches || []).map((p: any, i: number) => (
                                  <li key={i} style={{ marginBottom: '0.25rem' }}>
                                    <span style={{ 
                                      fontWeight: '600',
                                      color: p.type === 'IN' || p.type === 'CLOCK_IN' ? '#059669' : '#dc2626',
                                      marginRight: '0.5rem'
                                    }}>
                                      {p.type}
                                    </span>
                                    {new Date(p.time).toLocaleString()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className={styles.cardActions}>
                            <button 
                              className={styles.btnPrimary}
                              onClick={() => setOpenFormFor(openFormFor === r._id ? null : r._id)}
                            >
                              {openFormFor === r._id ? 'Cancel' : 'Request Correction'}
                            </button>
                          </div>

                          {openFormFor === r._id && (
                            <div style={{
                              marginTop: '1rem',
                              padding: '1rem',
                              background: '#f9fafb',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <label style={{ 
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                                color: '#374151'
                              }}>
                                Reason for Correction
                              </label>
                              <textarea 
                                value={reasonMap[r._id] || ''} 
                                onChange={(e) => setReasonMap((m) => ({ ...m, [r._id]: e.target.value }))} 
                                rows={3}
                                placeholder="Explain why this correction is needed..."
                                style={{
                                  width: '100%',
                                  padding: '0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid #d1d5db',
                                  fontSize: '0.95rem',
                                  fontFamily: 'inherit'
                                }}
                              />
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                <button 
                                  disabled={submittingId === r._id} 
                                  onClick={() => submitCorrection(r._id)} 
                                  className={styles.btnSuccess}
                                >
                                  {submittingId === r._id ? 'Submitting…' : '✓ Submit Request'}
                                </button>
                                <button 
                                  onClick={() => setOpenFormFor(null)} 
                                  className={styles.btnSecondary}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Correction Requests Tab */}
              {activeTab === 'corrections' && (
                <>
                  {requests.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📭</span>
                      <h3>No Correction Requests</h3>
                      <p>You haven't submitted any correction requests yet.</p>
                    </div>
                  ) : (
                    <div className={styles.cardsGrid}>
                      {requests.map((rq: any) => (
                        <div key={rq._id} className={styles.card}>
                          <div className={styles.cardHeader}>
                            <div>
                              <h3 className={styles.cardTitle}>
                                {rq.employeeId && rq.employeeId.firstName 
                                  ? `${rq.employeeId.firstName} ${rq.employeeId.lastName}` 
                                  : 'You'}
                              </h3>
                              <p className={styles.cardSubtitle}>
                                {formatDateDDMMYYYY(rq.createdAt)}
                              </p>
                            </div>
                            <span className={`${styles.badge} ${getStatusBadgeClass(rq.status)}`}>
                              {rq.status}
                            </span>
                          </div>

                          <div className={styles.cardBody}>
                            <div className={styles.cardMeta}>
                              <strong>Reason:</strong>
                              <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>{rq.reason}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Time Exceptions Tab */}
              {activeTab === 'exceptions' && (
                <>
                  {timeExceptions.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📭</span>
                      <h3>No Time Exceptions</h3>
                      <p>You don't have any time exception requests.</p>
                    </div>
                  ) : (
                    <div className={styles.cardsGrid}>
                      {timeExceptions.map((te: any) => (
                        <div key={te._id} className={styles.card}>
                          <div className={styles.cardHeader}>
                            <div>
                              <h3 className={styles.cardTitle}>
                                {te.type || 'EXCEPTION'}
                              </h3>
                              <p className={styles.cardSubtitle}>
                                {formatDateDDMMYYYY(te.createdAt)}
                              </p>
                            </div>
                            <span className={`${styles.badge} ${getStatusBadgeClass(te.status)}`}>
                              {te.status}
                            </span>
                          </div>

                          <div className={styles.cardBody}>
                            <div className={styles.cardMeta}>
                              <strong>Reason:</strong>
                              <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>{te.reason}</p>
                              
                              {te.assignedTo && (
                                <>
                                  <strong style={{ marginTop: '1rem', display: 'block' }}>Assigned to:</strong>
                                  <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>
                                    {typeof te.assignedTo === 'string' 
                                      ? te.assignedTo 
                                      : (te.assignedTo?.firstName 
                                        ? `${te.assignedTo.firstName} ${te.assignedTo.lastName}` 
                                        : (te.assignedTo?.fullName || 'N/A'))}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
