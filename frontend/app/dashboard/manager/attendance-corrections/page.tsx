'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '../../../components/Spinner';
import axios from '@/lib/axios-config';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../hr/time-management.module.css';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function AttendanceCorrectionsPage() {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedPunches, setEditedPunches] = useState<Array<{ type: string; time: string }>>([]);
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDeptHead = user?.roles?.includes(SystemRole.DEPARTMENT_HEAD);

  // Fetch department members (employees assigned to same department)
  const fetchTeamMembers = async () => {
    try {
      const res = await axios.get('/employee-profile/team/assigned');
      setEmployees(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch team members', err);
      setError('Failed to load team members');
    }
  };

  // Load team members when component mounts or when user/isDeptHead changes
  useEffect(() => {
    if (isDeptHead) fetchTeamMembers();
  }, [isDeptHead, user]);

  const fetchRecords = async () => {
    if (!employeeId) {
      setError('Please select an employee');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await axios.get('/time-management/attendance/records', {
        params: { employeeId },
      });
      setRecords(res.data || []);
      if (res.data?.length === 0) {
        setError('No attendance records found for this employee');
      }
    } catch (err: any) {
      console.error('Failed to fetch records', err);
      setError('Failed to fetch records: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    const punches = (records[idx].punches || []).map((p: any) => ({
      type: p.type,
      time: toLocalInput(p.time),
    }));
    setEditedPunches(punches);
    setReason('');
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditedPunches([]);
    setReason('');
    setError(null);
  };

  const submitCorrection = async (idx: number) => {
    try {
      const rec = records[idx];
      const dto = {
        employeeId: typeof rec.employeeId === 'object' ? rec.employeeId._id : rec.employeeId,
        attendanceRecordId: rec._id,
        punches: editedPunches.map((p) => ({ type: p.type, time: new Date(p.time).toISOString() })),
        reason: reason || undefined,
      };

      await axios.post('/time-management/attendance/manual-correction', dto);
      setSuccess('Attendance corrected successfully');
      setTimeout(() => setSuccess(null), 3000);
      cancelEdit();
      fetchRecords();
    } catch (err: any) {
      console.error('Failed to submit correction', err);
      setError('Failed to submit correction: ' + (err.response?.data?.message || err.message));
    }
  };

  function toLocalInput(isoTime: string) {
    if (!isoTime) return '';
    const d = new Date(isoTime);
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  }

  function addPunch() {
    setEditedPunches((prev) => [...prev, { type: 'IN', time: toLocalInput(new Date().toISOString()) }]);
  }

  function updatePunch(idx: number, field: 'type' | 'time', value: string) {
    setEditedPunches((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value } as any;
      return copy;
    });
  }

  function removePunch(idx: number) {
    setEditedPunches((prev) => prev.filter((_, i) => i !== idx));
  }

  const getEmployeeName = (rec: any) => {
    if (typeof rec.employeeId === 'object') {
      return `${rec.employeeId.firstName || ''} ${rec.employeeId.lastName || ''}`.trim() || 'Unknown';
    }
    return rec.employeeId || 'Unknown';
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD]}>
      <DashboardLayout title="Attendance Corrections" role="Manager">
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>✏️ Attendance Corrections</h1>
              <p className={styles.pageSubtitle}>
                View and correct attendance records for team members
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Search Section */}
          <div className={styles.filterSection}>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label>Select Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className={styles.filterSelect}
                  style={{ minWidth: '320px' }}
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({typeof emp.employeeNumber === 'string' ? emp.employeeNumber : emp._id})
                    </option>
                  ))}
                </select>
              </div>
              <button
                className={styles.btnPrimary}
                onClick={fetchRecords}
                disabled={loading || !employeeId}
              >
                {loading ? 'Loading...' : '🔍 Fetch Records'}
              </button>
            </div>
          </div>

          {/* Stats */}
          {records.length > 0 && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{records.length}</span>
                <span className={styles.statLabel}>Total Records</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {records.filter(r => r.hasMissedPunch).length}
                </span>
                <span className={styles.statLabel}>With Missed Punches</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {records.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0)}
                </span>
                <span className={styles.statLabel}>Total Minutes</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && <Spinner message="Loading attendance records..." />}

          {/* Empty State */}
          {!loading && records.length === 0 && employeeId && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <h3>No Records Found</h3>
              <p>No attendance records found for the selected employee.</p>
            </div>
          )}

          {/* Records List */}
          {!loading && records.length > 0 && (
            <div className={styles.cardsGrid}>
              {records.map((rec, idx) => (
                <div key={rec._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>{getEmployeeName(rec)}</h3>
                      <p className={styles.cardSubtitle}>
                        {rec.date ? new Date(rec.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Date not available'}
                      </p>
                    </div>
                    {rec.hasMissedPunch && (
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>
                        Missed Punch
                      </span>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Record ID:</span>
                      <span className={styles.truncate}>{rec._id}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Total Work Minutes:</span>
                      <span>{rec.totalWorkMinutes || 0} mins</span>
                    </div>

                    {editingIndex !== idx && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Punches:</span>
                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {(rec.punches || []).length === 0 ? (
                            <span className={styles.textMuted}>No punches recorded</span>
                          ) : (
                            rec.punches.map((p: any, i: number) => (
                              <div key={i}>
                                <strong>{p.type}:</strong> {new Date(p.time).toLocaleString()}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Form */}
                  {editingIndex === idx && (
                    <div className={styles.formCard} style={{ marginTop: '16px' }}>
                      <div className={styles.form}>
                        <div>
                          <label className={styles.formLabel}>Punches</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            {editedPunches.map((p, pi) => (
                              <div key={pi} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select
                                  value={p.type}
                                  onChange={(e) => updatePunch(pi, 'type', e.target.value)}
                                  className={styles.formSelect}
                                  style={{ flex: '0 0 100px' }}
                                >
                                  <option value="IN">IN</option>
                                  <option value="OUT">OUT</option>
                                </select>
                                <input
                                  type="datetime-local"
                                  value={p.time}
                                  onChange={(e) => updatePunch(pi, 'time', e.target.value)}
                                  className={styles.formInput}
                                  style={{ flex: 1 }}
                                />
                                <button
                                  className={`${styles.btnDanger} ${styles.btnSmall}`}
                                  onClick={() => removePunch(pi)}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              className={`${styles.btnSecondary} ${styles.btnSmall}`}
                              onClick={addPunch}
                            >
                              + Add Punch
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className={styles.formLabel}>Reason (optional)</label>
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className={styles.formInput}
                            placeholder="Enter reason for correction..."
                          />
                        </div>
                      </div>

                      <div className={styles.cardActions}>
                        <button
                          className={styles.btnSuccess}
                          onClick={() => submitCorrection(idx)}
                        >
                          💾 Save Correction
                        </button>
                        <button
                          className={styles.btnSecondary}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit Button */}
                  {editingIndex !== idx && (
                    <div className={styles.cardActions}>
                      <button
                        className={styles.btnPrimary}
                        onClick={() => startEdit(idx)}
                      >
                        ✏️ Edit Punches
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
