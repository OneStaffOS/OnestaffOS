"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../time-management.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function ShiftAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/time-management/shift-assignments');
      setAssignments(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    try {
      await axios.put(`/time-management/shift-assignments/${id}/status`, { status });
      setSuccess(`Status updated to ${status}`);
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update status');
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED': return styles.badgeActive;
      case 'PENDING': return styles.badgePending;
      case 'CANCELLED': return styles.badgeInactive;
      case 'EXPIRED': return styles.badgeInactive;
      default: return '';
    }
  };

  const getTargetInfo = (a: any) => {
    if (a.employeeId) {
      return {
        type: 'Employee',
        name: a.employeeId.firstName 
          ? `${a.employeeId.firstName} ${a.employeeId.lastName}` 
          : (a.employeeId.name || a.employeeId._id)
      };
    }
    if (a.departmentId) {
      return { type: 'Department', name: a.departmentId.name || a.departmentId._id };
    }
    if (a.positionId) {
      return { type: 'Position', name: a.positionId.title || a.positionId._id };
    }
    return { type: 'Unknown', name: '—' };
  };

  const pendingCount = assignments.filter(a => a.status === 'PENDING').length;
  const approvedCount = assignments.filter(a => a.status === 'APPROVED').length;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Shift Assignments" role="Time Management">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Shift Assignments</h1>
              <p className={styles.pageSubtitle}>
                Manage employee, department, and position shift assignments
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.btnPrimary}
                onClick={() => router.push('/dashboard/hr/time-management/shift-assignments/create')}
              >
                 Create Assignment
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{assignments.length}</span>
              <span className={styles.statLabel}>Total Assignments</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingCount}</span>
              <span className={styles.statLabel}>Pending</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{approvedCount}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
          </div>

          {loading ? (
            <Spinner message="Loading assignments..." />
          ) : assignments.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}></span>
              <h3>No Assignments</h3>
              <p>Create your first shift assignment to get started.</p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {assignments.map((a: any) => {
                const target = getTargetInfo(a);
                return (
                  <div key={a._id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{a.shiftId?.name || 'Unknown Shift'}</h3>
                        <p className={styles.cardSubtitle}>{target.type}: {target.name}</p>
                      </div>
                      <span className={`${styles.badge} ${getStatusBadgeClass(a.status)}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Start Date:</span>
                        <span>{a.startDate ? new Date(a.startDate).toLocaleDateString() : 'Not set'}</span>
                      </div>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>End Date:</span>
                        <span>{a.endDate ? new Date(a.endDate).toLocaleDateString() : 'Ongoing'}</span>
                      </div>
                      {a.shiftId && (
                        <div className={styles.cardMeta}>
                          <span className={styles.cardMetaLabel}>Shift Time:</span>
                          <span>{a.shiftId.startTime} — {a.shiftId.endTime}</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <select
                        className={styles.statusSelect}
                        value={a.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          if (!confirm(`Change status to ${newStatus}?`)) {
                            await load();
                            return;
                          }
                          await updateStatus(a._id, newStatus);
                        }}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="EXPIRED">EXPIRED</option>
                      </select>
                    </div>
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