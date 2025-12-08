"use client";

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../components/DashboardLayout';
import axios from '@/lib/axios-config';
import { useAuth } from '../../../../context/AuthContext';
import styles from '../../../dashboard.module.css';
import { SystemRole } from '@/lib/roles';

export default function HRManualAttendanceCorrectionPage() {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedPunches, setEditedPunches] = useState<Array<{ type: string; time: string }>>([]);
  const [reason, setReason] = useState('');

  // Fetch all employees (HR has access to all employees)
  const fetchEmployees = async () => {
    try {
      const res = await axios.get('/employee-profile');
      setEmployees(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch employees', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchRecords = async () => {
    if (!employeeId) return alert('Please select an employee');
    try {
      setLoading(true);
      const res = await axios.get('/time-management/attendance/records', {
        params: { employeeId },
      });
      setRecords(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch records', err);
      alert('Failed to fetch records: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    const punches = (records[idx].punches || []).map((p: any) => ({ type: p.type, time: toLocalInput(p.time) }));
    setEditedPunches(punches);
    setReason('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditedPunches([]);
    setReason('');
  };

  const submitCorrection = async (idx: number) => {
    try {
      const rec = records[idx];
      const dto = {
        employeeId: rec.employeeId,
        attendanceRecordId: rec._id,
        punches: editedPunches.map((p) => ({ type: p.type, time: new Date(p.time).toISOString() })),
        reason: reason || undefined,
      };

      await axios.post('/time-management/attendance/manual-correction', dto);
      alert('Attendance corrected successfully');
      cancelEdit();
      fetchRecords();
    } catch (err: any) {
      console.error('Failed to submit correction', err);
      alert('Failed to submit correction: ' + (err.response?.data?.message || err.message));
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

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Manual Attendance Correction" role="HR">
        <div className={styles.section}>
          <h2>Manual Attendance Correction</h2>
          <p>Search for an employee's attendance record and correct punches as needed.</p>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ padding: '0.5rem', flex: '0 0 320px' }}>
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeNumber || emp._id})
                </option>
              ))}
            </select>
            <button className={styles.viewButton} onClick={fetchRecords} style={{ alignSelf: 'stretch' }}>
              {loading ? 'Loading...' : 'Fetch Records'}
            </button>
          </div>

          {records.length === 0 && <p>No records found for the selected employee.</p>}

          {records.map((rec, idx) => (
            <div key={rec._id} style={{ border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>Record ID:</strong> {rec._id}<br />
                  <strong>Employee:</strong> {rec.employeeId}<br />
                  <strong>Total Minutes:</strong> {rec.totalWorkMinutes}<br />
                  <strong>Has Missed Punch:</strong> {rec.hasMissedPunch ? 'Yes' : 'No'}
                </div>
                <div>
                  {editingIndex === idx ? (
                    <>
                      <button className={styles.viewButton} onClick={() => submitCorrection(idx)}>Save</button>
                      <button className={styles.viewButton} onClick={cancelEdit} style={{ marginLeft: '0.5rem' }}>Cancel</button>
                    </>
                  ) : (
                    <button className={styles.viewButton} onClick={() => startEdit(idx)}>Edit Punches</button>
                  )}
                </div>
              </div>

              {editingIndex === idx && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem' }}>Punches</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {editedPunches.map((p, pi) => (
                          <div key={pi} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select value={p.type} onChange={(e) => updatePunch(pi, 'type', e.target.value)} style={{ padding: '0.5rem' }}>
                              <option value="IN">IN</option>
                              <option value="OUT">OUT</option>
                            </select>
                            <input type="datetime-local" value={p.time} onChange={(e) => updatePunch(pi, 'time', e.target.value)} style={{ padding: '0.5rem', flex: 1 }} />
                            <button className={styles.viewButton} onClick={() => removePunch(pi)} style={{ marginLeft: '0.25rem' }}>Remove</button>
                          </div>
                        ))}
                        <button className={styles.viewButton} onClick={addPunch}>Add Punch</button>
                      </div>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>Reason (optional)</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                </div>
              )}

              {editingIndex !== idx && (
                <div style={{ marginTop: '0.75rem' }}>
                  <strong>Punches:</strong>
                  <ul>
                    {(rec.punches || []).map((p: any, i: number) => (
                      <li key={i}>{p.type} — {new Date(p.time).toLocaleString()}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          ))}

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
