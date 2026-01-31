"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '../../../components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../hr/time-management.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
enum TimeExceptionType {
  MISSED_PUNCH = 'MISSED_PUNCH',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  SHORT_TIME = 'SHORT_TIME',
  OVERTIME_REQUEST = 'OVERTIME_REQUEST',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export default function TimeExceptionRequestPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceRecordId, setAttendanceRecordId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [type, setType] = useState<TimeExceptionType>(TimeExceptionType.MISSED_PUNCH);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [assignedToName, setAssignedToName] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [date, setDate] = useState<string>('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const recRes = await axios.get('/time-management/attendance/records');
      const arr = Array.isArray(recRes.data) ? recRes.data : (recRes.data ? [recRes.data] : []);
      setRecords(arr);

      try {
        const prof = await axios.get('/employee-profile/my-profile');
        const p = prof.data || {};
        setEmployeeId(p._id ? String(p._id) : null);

        const rawDept = p.primaryDepartmentId;
        const deptId = rawDept ? (rawDept._id ? String(rawDept._id) : String(rawDept)) : null;
        
        if (deptId) {
          try {
            const deptRes = await axios.get(`/organization-structure/departments/${deptId}`);
            const dept = deptRes.data || {};
            const headPosId = dept.headPositionId || null;
            if (headPosId) {
              let normalizedHeadPosId: string | null = null;
              try {
                if (typeof headPosId === 'string') {
                  normalizedHeadPosId = headPosId.trim();
                } else if (headPosId && typeof headPosId === 'object') {
                  if ((headPosId as any)._id) normalizedHeadPosId = String((headPosId as any)._id);
                  else if ((headPosId as any).id) normalizedHeadPosId = String((headPosId as any).id);
                  else if (typeof (headPosId as any).toString === 'function') {
                    const s = (headPosId as any).toString();
                    if (s && s !== '[object Object]') normalizedHeadPosId = s;
                  }
                }
              } catch (e) {
                normalizedHeadPosId = null;
              }

              if (normalizedHeadPosId) {
                try {
                  const mgrRes = await axios.get(`/employee-profile/by-position/${normalizedHeadPosId}`);
                  const mgr = mgrRes.data || null;
                  if (mgr && (mgr._id || mgr.firstName || mgr.fullName)) {
                    const name = mgr.fullName || `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim() || 'Department head';
                    setAssignedTo(String(mgr._id || normalizedHeadPosId));
                    setAssignedToName(name);
                  } else {
                    setAssignedTo(normalizedHeadPosId);
                    setAssignedToName('Department head (position)');
                  }
                } catch (e) {
                  setAssignedTo(normalizedHeadPosId);
                  setAssignedToName('Department head (position)');
                }
              }
            }
          } catch (e) {
            setError('Failed to resolve department head');
          }
        }
      } catch (e) {
        setError('Failed to fetch profile information');
      }
    } catch (err) {
      setError('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const formatRecordLabel = (r: any) => {
    const time = r?.punches?.[0]?.time || r?.createdAt || null;
    if (!time) return `Record ${r._id || r.id}`;
    try {
      const d = new Date(time);
      return `${d.toLocaleDateString()} — ${d.toLocaleTimeString()}`;
    } catch (e) {
      return `${r._id || r.id}`;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!attendanceRecordId) return setError('Please select an attendance record');
    if (!reason || reason.trim().length < 5) return setError('Reason must be at least 5 characters');
    
    const payload: any = {
      attendanceRecordId,
      reason: reason,
      type: type,
    };

    if (assignedTo) {
      let normalized: string | null = null;
      try {
        if (typeof assignedTo === 'string') {
          normalized = assignedTo.trim();
        } else if (typeof assignedTo === 'object' && assignedTo !== null) {
          if ((assignedTo as any)._id) normalized = String((assignedTo as any)._id);
          else if ((assignedTo as any).id) normalized = String((assignedTo as any).id);
          else normalized = String(assignedTo);
        } else {
          normalized = String(assignedTo);
        }
      } catch (e) {
        normalized = null;
      }

      if (normalized) {
        payload.assignedTo = normalized;
      }
    }

    try {
      setSubmitting(true);
      await axios.post('/time-management/time-exceptions', payload);
      setSuccess('Exception request submitted successfully!');
      setTimeout(() => router.push('/dashboard/employee/attendance-records'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = date ? records.filter(r => {
    const t = r?.punches?.[0]?.time || r?.createdAt || null;
    if (!t) return false;
    const d = new Date(t);
    const iso = d.toISOString().split('T')[0];
    return iso === date;
  }) : records;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Submit Time Exception" role="Employee">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Request Time Exception</h1>
              <p className={styles.pageSubtitle}>
                Submit a request to correct attendance records
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {loading ? (
            <Spinner message="Loading records..." />
          ) : (
            <div className={styles.formCard}>
              <form onSubmit={submit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Filter by Date (optional)</label>
                    <input 
                      type="date" className={styles.formInput}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Attendance Record *</label>
                    <select 
                      className={styles.formSelect} 
                      value={attendanceRecordId || ''} 
                      onChange={(e) => setAttendanceRecordId(e.target.value || null)}
                    >
                      <option value="">-- Select Record --</option>
                      {filteredRecords.map((r) => (
                        <option key={r._id || r.id} value={r._id || r.id}>
                          {formatRecordLabel(r)}
                        </option>
                      ))}
                    </select>
                    <p className={styles.formHint}>
                      Select the attendance record you want to raise an exception for
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Exception Type *</label>
                    <select 
                      className={styles.formSelect} 
                      value={type} 
                      onChange={(e) => setType(e.target.value as TimeExceptionType)}
                    >
                      {Object.values(TimeExceptionType).map((v) => (
                        <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Assigned To</label>
                    <div className={styles.infoBox}>
                      {assignedToName ? (
                        <span> {assignedToName}</span>
                      ) : (
                        <span className={styles.textMuted}>Manager not found — will be auto-resolved</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>Reason *</label>
                  <textarea
                    className={styles.formTextarea}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Provide a detailed reason for the exception request (minimum 5 characters)"
                  />
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="submit" className={styles.btnPrimary} 
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Exception'}
                  </button>
                  <button 
                    type="button" className={styles.btnSecondary} 
                    onClick={() => router.back()}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}