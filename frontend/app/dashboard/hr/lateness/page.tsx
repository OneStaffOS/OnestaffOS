"use client";

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../dashboard.module.css';

function LatenessRulesManager() {
  const [rules, setRules] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', description: '', gracePeriodMinutes: '', deductionForEachMinute: '', active: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);
  const [minutesLate, setMinutesLate] = useState<number>(0);

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/time-management/lateness-rules');
      setRules(res.data || []);
    } catch (err) {
      console.error('Failed to load lateness rules', err);
      alert('Failed to load lateness rules');
    } finally { setLoading(false); }
  };

  const createRule = async () => {
    if (!newRule.name) return alert('Name is required');
    try {
      setLoading(true);
      const payload = {
        name: newRule.name,
        description: newRule.description,
        gracePeriodMinutes: Number(newRule.gracePeriodMinutes) || 0,
        deductionForEachMinute: Number(newRule.deductionForEachMinute) || 0,
        active: newRule.active,
      };
      const res = await axios.post('/time-management/lateness-rules', payload);
      setRules(prev => [res.data, ...prev]);
      setNewRule({ name: '', description: '', gracePeriodMinutes: '', deductionForEachMinute: '', active: true });
    } catch (err: any) {
      console.error('Create failed', err);
      alert('Failed to create lateness rule: ' + (err?.response?.data?.message || err.message));
    } finally { setLoading(false); }
  };

  const saveEdit = async (id: string) => {
    try {
      setLoading(true);
      const payload = {
        ...editValues,
        gracePeriodMinutes: Number(editValues.gracePeriodMinutes) || 0,
        deductionForEachMinute: Number(editValues.deductionForEachMinute) || 0,
      };
      const res = await axios.put(`/time-management/lateness-rules/${id}`, payload);
      setRules(prev => prev.map(r => (r._id === id ? res.data : r)));
      setEditingId(null);
      setEditValues(null);
    } catch (err: any) {
      console.error('Update failed', err);
      alert('Failed to update lateness rule: ' + (err?.response?.data?.message || err.message));
    } finally { setLoading(false); }
  };

  const calculatePenalty = (rule: any, minutes: number) => {
    const excess = Math.max(0, minutes - (rule?.gracePeriodMinutes || 0));
    return excess * (rule?.deductionForEachMinute || 0);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Name</label>
          <input value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }} placeholder="Rule name" />
        </div>

        <div style={{ flex: '1 1 320px' }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Description</label>
          <textarea value={newRule.description} onChange={(e) => setNewRule({ ...newRule, description: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd', minHeight: 56 }} placeholder="Short description (optional)" />
        </div>

        <div style={{ width: 160 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Grace (mins)</label>
          <input type="number" value={newRule.gracePeriodMinutes} onChange={(e) => setNewRule({ ...newRule, gracePeriodMinutes: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }} placeholder="e.g. 5" />
        </div>

        <div style={{ width: 200 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Deduction / min</label>
          <input type="number" value={newRule.deductionForEachMinute} onChange={(e) => setNewRule({ ...newRule, deductionForEachMinute: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }} placeholder="e.g. 0.5" />
        </div>

        <div>
          <label style={{ opacity: 0 }}>create</label>
          <button className={styles.viewButton} onClick={createRule} disabled={loading}>
            Create Rule
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Grace (mins)</th>
              <th>Deduction / min</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>Loading...</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={6}>No lateness rules configured yet.</td></tr>
            ) : (
              rules.map((r: any) => (
                <tr key={r._id}>
                  <td style={{ minWidth: 180 }}>
                    {editingId === r._id ? (
                      <input value={editValues?.name || ''} onChange={(e) => setEditValues({ ...editValues, name: e.target.value })} placeholder="Rule name" />
                    ) : (
                      r.name
                    )}
                  </td>
                  <td style={{ minWidth: 220 }}>
                    {editingId === r._id ? (
                      <input value={editValues?.description || ''} onChange={(e) => setEditValues({ ...editValues, description: e.target.value })} placeholder="Optional description" />
                    ) : (
                      r.description || '-'
                    )}
                  </td>
                  <td>
                    {editingId === r._id ? (
                      <input type="number" value={editValues?.gracePeriodMinutes ?? ''} onChange={(e) => setEditValues({ ...editValues, gracePeriodMinutes: e.target.value })} placeholder="e.g. 5" />
                    ) : (
                      r.gracePeriodMinutes
                    )}
                  </td>
                  <td>
                    {editingId === r._id ? (
                      <input type="number" value={editValues?.deductionForEachMinute ?? ''} onChange={(e) => setEditValues({ ...editValues, deductionForEachMinute: e.target.value })} placeholder="e.g. 0.5" />
                    ) : (
                      r.deductionForEachMinute
                    )}
                  </td>
                  <td>
                    {editingId === r._id ? (
                      <select value={editValues.active ? 'true' : 'false'} onChange={(e) => setEditValues({ ...editValues, active: e.target.value === 'true' })}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      r.active ? 'Yes' : 'No'
                    )}
                  </td>
                  <td>
                    {editingId === r._id ? (
                      <>
                        <button className={styles.viewButton} onClick={() => saveEdit(r._id)} style={{ marginRight: 8 }}>Save</button>
                        <button onClick={() => { setEditingId(null); setEditValues(null); }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className={styles.viewButton} onClick={() => { setEditingId(r._id); setEditValues({ ...r, gracePeriodMinutes: r.gracePeriodMinutes != null ? String(r.gracePeriodMinutes) : '', deductionForEachMinute: r.deductionForEachMinute != null ? String(r.deductionForEachMinute) : '' }); }} style={{ marginRight: 8 }}>Edit</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LatenessPage() {
  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER]}>
      <DashboardLayout title="Lateness Rules" role="Human Resources">
        <div style={{ padding: '1rem 0' }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Lateness & Penalty Rules</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Configure lateness thresholds, grace periods and per-minute deductions. Only HR Managers can access this page.
          </p>
          <LatenessRulesManager />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
