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
export default function ShiftTypesPage() {
  const router = useRouter();
  const [shiftTypes, setShiftTypes] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [typesRes, shiftsRes] = await Promise.all([
        axios.get('/time-management/shift-types'),
        axios.get('/time-management/shifts'),
      ]);
      setShiftTypes(typesRes.data || []);
      setShifts(shiftsRes.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDeactivate(id: string, type: 'shift-type' | 'shift') {
    if (!confirm(`Deactivate this ${type === 'shift-type' ? 'shift type' : 'shift'}?`)) return;
    setError(null);
    try {
      const endpoint = type === 'shift-type' 
        ? `/time-management/shift-types/${id}/deactivate`
        : `/time-management/shifts/${id}/deactivate`;
      await axios.put(endpoint);
      setSuccess(`${type === 'shift-type' ? 'Shift type' : 'Shift'} deactivated`);
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || String(err));
    }
  }

  const activeShiftTypes = shiftTypes.filter(t => t.active);
  const activeShifts = shifts.filter(s => s.active);

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Shift Management" role="Time Management">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>⏰ Shift Management</h1>
              <p className={styles.pageSubtitle}>
                Manage shift types and individual shifts for your organization
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.btnPrimary}
                onClick={() => router.push('/dashboard/hr/time-management/shifts/create')}
              >
                ➕ Create Shift
              </button>
              <button 
                className={styles.btnSecondary}
                onClick={() => router.push('/dashboard/hr/time-management/shift-types/create')}
              >
                ➕ Create Shift Type
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{shiftTypes.length}</span>
              <span className={styles.statLabel}>Total Shift Types</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{activeShiftTypes.length}</span>
              <span className={styles.statLabel}>Active Types</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{shifts.length}</span>
              <span className={styles.statLabel}>Total Shifts</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{activeShifts.length}</span>
              <span className={styles.statLabel}>Active Shifts</span>
            </div>
          </div>

          {loading ? (
            <Spinner message="Loading shift data..." />
          ) : (
            <>
              {/* Shift Types Section */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📋 Shift Types</h2>
                {shiftTypes.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📋</span>
                    <h3>No Shift Types</h3>
                    <p>Create your first shift type to get started.</p>
                  </div>
                ) : (
                  <div className={styles.cardsGrid}>
                    {shiftTypes.map((type: any) => (
                      <div key={type._id} className={styles.card}>
                        <div className={styles.cardHeader}>
                          <div>
                            <h3 className={styles.cardTitle}>{type.name}</h3>
                          </div>
                          <span className={`${styles.badge} ${type.active ? styles.badgeActive : styles.badgeInactive}`}>
                            {type.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.cardMeta}>
                            <span className={styles.cardMetaLabel}>Shifts:</span>
                            <span>{shifts.filter(s => s.shiftType?._id === type._id || s.shiftType === type._id).length}</span>
                          </div>
                        </div>
                        {type.active && (
                          <div className={styles.cardActions}>
                            <button 
                              className={`${styles.btnWarning} ${styles.btnSmall}`}
                              onClick={() => handleDeactivate(type._id, 'shift-type')}
                            >
                              Deactivate
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shifts Section */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>🕐 Shifts</h2>
                {shifts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🕐</span>
                    <h3>No Shifts</h3>
                    <p>Create your first shift to start scheduling.</p>
                  </div>
                ) : (
                  <div className={styles.cardsGrid}>
                    {shifts.map((shift: any) => (
                      <div key={shift._id} className={styles.card}>
                        <div className={styles.cardHeader}>
                          <div>
                            <h3 className={styles.cardTitle}>{shift.name}</h3>
                            <p className={styles.cardSubtitle}>
                              {shift.shiftType?.name || 'No Type'}
                            </p>
                          </div>
                          <span className={`${styles.badge} ${shift.active ? styles.badgeActive : styles.badgeInactive}`}>
                            {shift.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.cardMeta}>
                            <span className={styles.cardMetaLabel}>Time:</span>
                            <span>{shift.startTime} — {shift.endTime}</span>
                          </div>
                          <div className={styles.cardMeta}>
                            <span className={styles.cardMetaLabel}>Punch Policy:</span>
                            <span>{shift.punchPolicy}</span>
                          </div>
                          <div className={styles.cardMeta}>
                            <span className={styles.cardMetaLabel}>Grace Period:</span>
                            <span>In: {shift.graceInMinutes}m | Out: {shift.graceOutMinutes}m</span>
                          </div>
                          <div className={styles.cardMeta}>
                            <span className={styles.cardMetaLabel}>Overtime Approval:</span>
                            <span>{shift.requiresApprovalForOvertime ? 'Required' : 'Not Required'}</span>
                          </div>
                        </div>
                        {shift.active && (
                          <div className={styles.cardActions}>
                            <button 
                              className={`${styles.btnWarning} ${styles.btnSmall}`}
                              onClick={() => handleDeactivate(shift._id, 'shift')}
                            >
                              Deactivate
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

