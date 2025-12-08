"use client";

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '../../../components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../hr/time-management.module.css';

type TimeException = {
  _id: string;
  employeeId: any;
  type: string;
  attendanceRecordId: string;
  assignedTo: any;
  status: string;
  reason?: string;
};

export default function ManagerTimeExceptionsPage() {
  const [exceptions, setExceptions] = useState<TimeException[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      // Manager sees time exceptions assigned to them or their team members
      const res = await axios.get('/time-management/time-exceptions?status=OPEN');
      setExceptions(res.data || []);
    } catch (err) {
      console.error('Failed to load time exceptions', err);
      setExceptions([]);
      setError('Failed to load time exceptions');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachApprove = async (id: string) => {
    if (!confirm('Attach and approve this time exception? This will mark it approved and attach it to the attendance record.')) return;
    try {
      setProcessingId(id);
      await axios.post(`/time-management/time-exceptions/${id}/attach`);
      setSuccess('Exception approved and attached successfully');
      await fetchExceptions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to attach/approve exception', err);
      setError('Failed to attach/approve exception: ' + ((err as any)?.response?.data?.message || (err as any)?.message));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this time exception?')) return;
    try {
      setProcessingId(id);
      await axios.put(`/time-management/time-exceptions/${id}/process`, { status: 'REJECTED' });
      setSuccess('Exception rejected');
      await fetchExceptions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to reject exception', err);
      setError('Failed to reject exception: ' + ((err as any)?.response?.data?.message || (err as any)?.message));
    } finally {
      setProcessingId(null);
    }
  };

  const getEmployeeName = (ex: TimeException) => {
    if (ex.employeeId && (ex.employeeId.firstName || ex.employeeId._id)) {
      return `${ex.employeeId.firstName || ''} ${ex.employeeId.lastName || ''}`.trim() || ex.employeeId._id;
    }
    return ex.employeeId?._id || 'Unknown';
  };

  return (
    <ProtectedRoute requiredRoles={[Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Time Exceptions" role="Manager">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>⚠️ Pending Time Exceptions</h1>
              <p className={styles.pageSubtitle}>
                Review and process time exception requests from your team
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{exceptions.length}</span>
              <span className={styles.statLabel}>Pending Exceptions</span>
            </div>
          </div>

          {loading ? (
            <Spinner message="Loading exceptions..." />
          ) : exceptions.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✓</span>
              <h3>No Pending Exceptions</h3>
              <p>All time exceptions have been processed.</p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {exceptions.map((ex) => (
                <div key={ex._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>{getEmployeeName(ex)}</h3>
                      <p className={styles.cardSubtitle}>{ex.type}</p>
                    </div>
                    <span className={`${styles.badge} ${styles.badgePending}`}>
                      {ex.status}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Reason:</span>
                      <span>{ex.reason || 'No reason provided'}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Record ID:</span>
                      <span className={styles.truncate}>{ex.attendanceRecordId}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button 
                      className={`${styles.btnSuccess} ${styles.btnSmall}`}
                      disabled={processingId === ex._id}
                      onClick={() => handleAttachApprove(ex._id)}
                    >
                      {processingId === ex._id ? 'Processing...' : '✓ Approve'}
                    </button>
                    <button 
                      className={`${styles.btnDanger} ${styles.btnSmall}`}
                      disabled={processingId === ex._id}
                      onClick={() => handleReject(ex._id)}
                    >
                      {processingId === ex._id ? 'Processing...' : '✕ Reject'}
                    </button>
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
