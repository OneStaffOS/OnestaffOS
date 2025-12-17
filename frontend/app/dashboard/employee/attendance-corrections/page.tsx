"use client";

import { useEffect, useState } from 'react';
import axios from '@/lib/axios-config';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import styles from './attendance-corrections.module.css';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function AttendanceCorrectionsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceRecordId, setAttendanceRecordId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, reqRes] = await Promise.all([
        axios.get('/time-management/attendance/records'),
        axios.get('/time-management/correction-requests/my'),
      ]);
      setRecords(recRes.data || []);
      setRequests(reqRes.data || []);
    } catch (err) {
      console.error('Failed to load attendance correction data', err);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async (e: any) => {
    e.preventDefault();
    if (!attendanceRecordId) {
      setMessage('Please select the attendance record you want to correct.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await axios.post('/time-management/correction-requests', {
        attendanceRecordId,
        reason,
      });
      setMessage('Correction request submitted');
      setReason('');
      setAttendanceRecordId(null);
      await fetchData();
    } catch (err: any) {
      console.error('Submit failed', err);
      setMessage(err?.response?.data?.message || err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Attendance Corrections" role="Employee">
        <div className={styles.section}>
          <h2>Submit Attendance Correction</h2>
          <form onSubmit={submitRequest} style={{ maxWidth: 700 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>Select Attendance Record</label>
            <select
              value={attendanceRecordId || ''}
              onChange={(e) => setAttendanceRecordId(e.target.value || null)}
              style={{ width: '100%', padding: 8, marginBottom: 12 }}
            >
              <option value="">-- Choose record --</option>
              {records.map((r: any) => {
                // Safe date rendering: prefer createdAt, fall back to first punch time, else show 'Unknown date'
                let displayDate = 'Unknown date';
                try {
                  if (r.createdAt) displayDate = new Date(r.createdAt).toLocaleDateString();
                  else if (r.punches && r.punches.length > 0 && r.punches[0].time) displayDate = new Date(r.punches[0].time).toLocaleDateString();
                } catch (e) {
                  displayDate = 'Unknown date';
                }

                return (
                  <option key={r._id} value={r._id}>{displayDate}</option>
                );
              })}
            </select>

            <label style={{ display: 'block', marginBottom: 8 }}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: 8, marginBottom: 12 }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={submitting} style={{ padding: '0.6rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>
                {submitting ? 'Submitting…' : 'Submit Correction Request'}
              </button>
              <button type="button" onClick={() => { setReason(''); setAttendanceRecordId(null); }} style={{ padding: '0.6rem 1rem', borderRadius: 6 }}>
                Reset
              </button>
            </div>

            {message && <div style={{ marginTop: 12 }}>{message}</div>}
          </form>
        </div>

        <div className={styles.section}>
          <h2>My Correction Requests</h2>
          {loading ? (
            <div>Loading…</div>
          ) : requests.length === 0 ? (
            <div>No correction requests submitted yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {requests.map((rq: any) => (
                <div key={rq._id} style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600 }}>{rq.status}</div>
                  <div style={{ fontSize: 12, color: '#374151' }}>{new Date(rq.createdAt).toLocaleString()}</div>
                  <div style={{ marginTop: 8 }}>{rq.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
