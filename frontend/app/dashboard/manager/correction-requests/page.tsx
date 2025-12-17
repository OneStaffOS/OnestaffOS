"use client";

import { useEffect, useState } from 'react';
import axios from '@/lib/axios-config';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '../../../components/Spinner';
import styles from '../../hr/time-management.module.css';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function ManagerCorrectionRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Server will scope results to the manager's team based on authentication
      const res = await axios.get('/time-management/correction-requests');
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to fetch correction requests', err);
    } finally {
      setLoading(false);
    }
  };

  const process = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const action = status === 'APPROVED' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${action} this correction request?`)) return;
    
    try {
      setProcessingId(id);
      await axios.put(`/time-management/correction-requests/${id}/process`, { status });
      await fetchData();
    } catch (err) {
      console.error('Process failed', err);
      alert('Failed to update request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(rq => {
    if (filter === 'ALL') return true;
    return rq.status === filter;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED': return styles.badgeSuccess;
      case 'REJECTED': return styles.badgeDanger;
      case 'PENDING': return styles.badgePending;
      default: return styles.badge;
    }
  };

  const getEmployeeName = (rq: any) => {
    if (rq.employeeId && typeof rq.employeeId === 'object') {
      return `${rq.employeeId.firstName || ''} ${rq.employeeId.lastName || ''}`.trim() || 'Unknown';
    }
    return rq.employeeId || 'Unknown';
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN]}>
      <DashboardLayout title="Correction Requests" role="Manager">
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📋 Attendance Correction Requests</h1>
              <p className={styles.pageSubtitle}>
                Review and process attendance correction requests from your team
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            <button 
              className={filter === 'ALL' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setFilter('ALL')}
            >
              All ({requests.length})
            </button>
            <button 
              className={filter === 'PENDING' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setFilter('PENDING')}
            >
              Pending ({requests.filter(r => r.status === 'PENDING').length})
            </button>
            <button 
              className={filter === 'APPROVED' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setFilter('APPROVED')}
            >
              Approved ({requests.filter(r => r.status === 'APPROVED').length})
            </button>
            <button 
              className={filter === 'REJECTED' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setFilter('REJECTED')}
            >
              Rejected ({requests.filter(r => r.status === 'REJECTED').length})
            </button>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{requests.filter(r => r.status === 'PENDING').length}</span>
              <span className={styles.statLabel}>Pending Requests</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{requests.filter(r => r.status === 'APPROVED').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{requests.filter(r => r.status === 'REJECTED').length}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <Spinner message="Loading correction requests..." />
          ) : filteredRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <h3>No {filter !== 'ALL' ? filter.toLowerCase() : ''} requests found</h3>
              <p>
                {filter === 'PENDING' 
                  ? 'All correction requests have been processed.' 
                  : 'No correction requests match the selected filter.'}
              </p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {filteredRequests.map((rq: any) => (
                <div key={rq._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>{getEmployeeName(rq)}</h3>
                      <p className={styles.cardSubtitle}>
                        {new Date(rq.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className={`${styles.badge} ${getStatusBadgeClass(rq.status)}`}>
                      {rq.status}
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Reason:</span>
                      <span>{rq.reason || 'No reason provided'}</span>
                    </div>
                    {rq.attendanceRecordId && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Record ID:</span>
                        <span className={styles.truncate}>{rq.attendanceRecordId._id || rq.attendanceRecordId}</span>
                      </div>
                    )}
                    {rq.requestedPunches && rq.requestedPunches.length > 0 && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Requested Punches:</span>
                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {rq.requestedPunches.map((p: any, i: number) => (
                            <div key={i}>
                              {p.type}: {new Date(p.time).toLocaleString()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {rq.status === 'PENDING' && (
                    <div className={styles.cardActions}>
                      <button 
                        className={`${styles.btnSuccess} ${styles.btnSmall}`}
                        onClick={() => process(rq._id, 'APPROVED')}
                        disabled={processingId === rq._id}
                      >
                        {processingId === rq._id ? 'Processing...' : '✓ Approve'}
                      </button>
                      <button 
                        className={`${styles.btnDanger} ${styles.btnSmall}`}
                        onClick={() => process(rq._id, 'REJECTED')}
                        disabled={processingId === rq._id}
                      >
                        {processingId === rq._id ? 'Processing...' : '✕ Reject'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
