"use client";

import { useEffect, useState } from 'react';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import { useAuth } from '@/app/context/AuthContext';
import DashboardLayout from '../../../components/DashboardLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Spinner from '../../../components/Spinner';
import styles from '../../hr/time-management.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function InboxPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const employeeId = user?.sub;

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/notifications/my');
      setNotes(res.data || []);
    } catch (err) {
      console.error('Failed to load inbox', err);
      setError('Failed to load inbox messages');
    } finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      setSuccess('Message marked as read');
      setTimeout(() => setSuccess(null), 2000);
      fetchNotes();
    } catch (err) {
      console.error('mark read failed', err);
      setError('Failed to mark message as read');
    }
  };

  const filteredNotes = notes.filter(n => {
    const read = (n.readBy || []).some((r: any) => 
      r.employeeId === employeeId || r.employeeId?.toString() === employeeId
    );
    if (filter === 'UNREAD') return !read;
    if (filter === 'READ') return read;
    return true;
  });

  const unreadCount = notes.filter(n => {
    return !(n.readBy || []).some((r: any) => 
      r.employeeId === employeeId || r.employeeId?.toString() === employeeId
    );
  }).length;

  const getNotificationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'alert': return '';
      case 'info': return '';
      case 'success': return '';
      case 'warning': return '';
      default: return '';
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE,SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.NEW_HIRE, SystemRole.JOB_CANDIDATE, SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.LEGAL_POLICY_ADMIN, SystemRole.RECRUITER]}>
      <DashboardLayout title="Inbox" role="Employee">
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Inbox</h1>
              <p className={styles.pageSubtitle}>
                View your notifications and messages
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            <button 
              className={filter === 'ALL' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setFilter('ALL')}
            >
              All ({notes.length})
            </button>
            <button 
              className={filter === 'UNREAD' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setFilter('UNREAD')}
            >
              Unread ({unreadCount})
            </button>
            <button 
              className={filter === 'READ' ? styles.filterTabActive : styles.filterTab}
              onClick={() => setFilter('READ')}
            >
              Read ({notes.length - unreadCount})
            </button>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{notes.length}</span>
              <span className={styles.statLabel}>Total Messages</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{unreadCount}</span>
              <span className={styles.statLabel}>Unread</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{notes.length - unreadCount}</span>
              <span className={styles.statLabel}>Read</span>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <Spinner message="Loading messages..." />
          ) : filteredNotes.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}></span>
              <h3>No Messages</h3>
              <p>
                {filter === 'UNREAD' 
                  ? 'All messages have been read' 
                  : filter === 'READ'
                  ? 'No read messages'
                  : 'Your inbox is empty'}
              </p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {filteredNotes.map(n => {
                const read = (n.readBy || []).some((r: any) => 
                  r.employeeId === employeeId || r.employeeId?.toString() === employeeId
                );
                return (
                  <div 
                    key={n._id} 
                    className={styles.card}
                    style={read ? { backgroundColor: '#f3f4f6', opacity: 0.8 } : {}}
                  >
                    <div className={styles.cardHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{getNotificationIcon(n.type)}</span>
                        <div>
                          <h3 className={styles.cardTitle}>{n.title || 'Notification'}</h3>
                          <p className={styles.cardSubtitle}>
                            {new Date(n.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      {!read && (
                        <span className={`${styles.badge} ${styles.badgePending}`}>
                          Unread
                        </span>
                      )}
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
                          {n.message}
                        </p>
                      </div>
                    </div>

                    {!read && (
                      <div className={styles.cardActions}>
                        <button 
                          className={styles.btnPrimary}
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead(n._id);
                          }}
                        >
                           Mark as Read
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
