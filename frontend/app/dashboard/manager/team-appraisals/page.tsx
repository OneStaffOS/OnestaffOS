/**
 * Team Appraisals - consolidated view for Department Heads/Managers
 * Shows each direct report and allows Dept Head to assign an overall rating (1-5)
 * and leave a comment. Uses existing /performance/dashboard/manager and
 * /performance/ratings endpoints to fetch and save data.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './team-appraisals.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface AssignmentRow {
  _id: string;
  employeeProfileId: any;
  cycleId: any;
  templateId: any;
  status: string;
  latestAppraisalId?: string;
}

interface TeamRow {
  employee: any;
  assignment?: AssignmentRow | null;
}

export default function TeamAppraisalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [error, setError] = useState('');

  // editing state keyed by assignmentId
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [deptValues, setDeptValues] = useState<Record<string, { rating?: number; comments?: string; loading?: boolean; managerSummary?: string; strengths?: string; improvementAreas?: string; status?: string }>>({});

  useEffect(() => {
    fetchTeamAndAssignments();
  }, []);

  const fetchTeamAndAssignments = async () => {
    try {
      setLoading(true);
      const teamResp = await axios.get('/employee-profile/team/assigned');

      const employees = teamResp.data || [];

      // Map backend response (profile with nested `appraisal`) into the assignment shape
      const assignmentsList: AssignmentRow[] = employees.map((emp: any) => {
        const app = emp.appraisal || null;
        const assignmentId = app?.assignmentId || null;
        const appraisalId = app?.appraisalId || null;
        return {
          _id: assignmentId || appraisalId || String(emp._id),
          employeeProfileId: emp._id,
          cycleId: app?.cycleId || null,
          templateId: app?.templateId || null,
          status: app?.status || '',
          latestAppraisalId: appraisalId || undefined,
        } as any;
      });

      setAssignments(assignmentsList);

      const assignByEmp = new Map<string, AssignmentRow>();
      assignmentsList.forEach(a => {
        const empId = a.employeeProfileId;
        if (empId) assignByEmp.set(String(empId), a);
      });

      const combined: TeamRow[] = employees.map((emp: any) => ({
        employee: emp,
        assignment: assignByEmp.get(String(emp._id)) || null,
      }));

      setRows(combined);
      setError('');
    } catch (err: any) {
      console.error('Failed to load team appraisals', err);
      setError(err.response?.data?.message || 'Failed to load team appraisals');
    } finally {
      setLoading(false);
    }
  };

  const computeAverage = (ratings: any[]) => {
    if (!ratings || ratings.length === 0) return null;
    const sum = ratings.reduce((s, r) => s + (Number(r.ratingValue || 0)), 0);
    return +(sum / ratings.length).toFixed(2);
  };

  const openEditor = async (assignment: AssignmentRow) => {
    const id = assignment._id;
    setEditing(prev => ({ ...prev, [id]: true }));
    setDeptValues(prev => ({ ...prev, [id]: { loading: true } }));
    if (assignment.latestAppraisalId) {
      try {
        const r = await axios.get(`/performance/ratings/${assignment.latestAppraisalId}`);
        const existing = r.data || {};
        const score = existing.overallScore ?? computeAverage(existing.ratings);
        // Prefill manager narrative fields if present (read-only here)
        setDeptValues(prev => ({
          ...prev,
          [id]: {
            rating: score ?? undefined,
            comments: '',
            managerSummary: existing.managerSummary || '',
            strengths: existing.strengths || '',
            improvementAreas: existing.improvementAreas || '',
            status: existing.status || '',
          }
        }));
      } catch (err) {
        setDeptValues(prev => ({ ...prev, [id]: { rating: undefined, comments: '' } }));
      }
    } else {
      // no record yet - init empty comments and narrative fields
      setDeptValues(prev => ({ ...prev, [id]: { rating: undefined, comments: '', managerSummary: '', strengths: '', improvementAreas: '', status: '' } }));
    }

    setDeptValues(prev => ({ ...prev, [id]: { ...(prev[id] || {}), loading: false } }));
  };

  const closeEditor = (assignmentId: string) => {
    setEditing(prev => ({ ...prev, [assignmentId]: false }));
  };

  const handleSave = async (assignment: AssignmentRow) => {
    const id = assignment._id;
    const vals = deptValues[id] || {};
    if (!vals) return alert('Nothing to save');

      try {
      setDeptValues(prev => ({ ...prev, [id]: { ...(prev[id] || {}), loading: true } }));
      if (assignment.latestAppraisalId) {
        // Save manager narrative fields via appraisal update endpoint
        const payload: any = {
          managerSummary: vals.managerSummary,
          strengths: vals.strengths,
          improvementAreas: vals.improvementAreas,
        };
        await axios.put(`/performance/ratings/${assignment.latestAppraisalId}`, payload);
        alert('Saved department head details');
      } else {
        // create minimal ratings record and include narrative fields
        const ratings = (assignment.templateId?.criteria || []).map((c: any) => ({ key: c.key, title: c.title, ratingValue: assignment.templateId?.ratingScale?.min || 1, comments: '' }));
        const payload: any = {
          assignmentId: assignment._id,
          ratings,
          managerSummary: vals.managerSummary,
          strengths: vals.strengths,
          improvementAreas: vals.improvementAreas,
        };
        const newRec = await axios.post('/performance/ratings', payload);
        const newId = newRec.data._id;
        // update local rows/assignments
        setAssignments(prev => prev.map(a => a._id === assignment._id ? { ...a, latestAppraisalId: newId } : a));
        setRows(prev => prev.map(r => (r.assignment?._id === assignment._id ? { ...r, assignment: { ...(r.assignment || {}), latestAppraisalId: newId } } : r)));
        alert('Created appraisal record and saved details');
      }
      closeEditor(id);
    } catch (err: any) {
      console.error('Failed to save dept head comments', err);
      alert(err.response?.data?.message || 'Failed to save department head comments');
    } finally {
      setDeptValues(prev => ({ ...prev, [id]: { ...(prev[id] || {}), loading: false } }));
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.DEPARTMENT_HEAD, Role.HR_MANAGER]}>
        <Spinner message="Loading team appraisals..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.DEPARTMENT_HEAD, Role.HR_MANAGER]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Team Appraisals</h1>
            <p className={styles.subtitle}>View employees, their cycle assignments and set Department Head rating & comments.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.refreshButton} onClick={fetchTeamAndAssignments}>Refresh</button>
            <button className={styles.secondaryButton} onClick={() => router.back()}>Back</button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div style={{ marginTop: 16 }}>
          {rows.length === 0 ? (
            <div className={styles.emptyState}>No team members found</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {rows.map(r => {
                const a = r.assignment;
                const key = a?._id || `emp-${r.employee._id}`;
                return (
                  <div key={key} className={styles.assignmentCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{r.employee?.firstName} {r.employee?.lastName}</strong>
                        <div style={{ color: '#6b7280' }}>{a ? `${a.cycleId?.name || ''} • ${a.templateId?.name || ''}` : 'No assignment'}</div>
                      </div>
                      <div className={styles.actionGroup}>
                        {a ? (
                          <>
                            <button className={styles.infoButton} onClick={() => router.push(a.latestAppraisalId ? `/dashboard/manager/performance/record/${a.latestAppraisalId}` : `/dashboard/manager/performance/appraisal/${a._id}`)}>Open Appraisal</button>
                            <button className={styles.primaryButton} onClick={() => openEditor(a)}>Edit Dept Head Comment</button>
                          </>
                        ) : (
                          <div style={{ color: '#9ca3af', fontSize: 13 }}>No assignment</div>
                        )}
                      </div>
                    </div>

                    {a && editing[a._id] && (
                      <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <label style={{ minWidth: 160 }}>Existing Score</label>
                          <div style={{ color: '#111827', fontWeight: 600 }}>{deptValues[a._id]?.rating ?? (r.employee?.appraisal?.totalScore ?? '—')}</div>
                        </div>

                                        <div style={{ marginTop: 8 }}>
                                          <label style={{ display: 'block', marginBottom: 6 }}>Manager Summary</label>
                                          <textarea
                                            rows={3}
                                            style={{ width: '100%', padding: 8, borderRadius: 6 }}
                                            value={deptValues[a._id]?.managerSummary ?? (r.employee?.appraisal?.managerSummary || '')}
                                            onChange={(e) => setDeptValues(prev => ({ ...prev, [a._id]: { ...(prev[a._id] || {}), managerSummary: e.target.value } }))}
                                          />
                                        </div>

                        <div style={{ marginTop: 8 }}>
                          <label style={{ display: 'block', marginBottom: 6 }}>Key Strengths</label>
                          <textarea
                            rows={2}
                            style={{ width: '100%', padding: 8, borderRadius: 6 }}
                            value={deptValues[a._id]?.strengths ?? (r.employee?.appraisal?.strengths || '')}
                            onChange={(e) => setDeptValues(prev => ({ ...prev, [a._id]: { ...(prev[a._id] || {}), strengths: e.target.value } }))}
                          />
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <label style={{ display: 'block', marginBottom: 6 }}>Areas for Improvement</label>
                          <textarea
                            rows={2}
                            style={{ width: '100%', padding: 8, borderRadius: 6 }}
                            value={deptValues[a._id]?.improvementAreas ?? (r.employee?.appraisal?.improvementAreas || '')}
                            onChange={(e) => setDeptValues(prev => ({ ...prev, [a._id]: { ...(prev[a._id] || {}), improvementAreas: e.target.value } }))}
                          />
                        </div>

                        <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                          <label style={{ minWidth: 160 }}>Status</label>
                          <div style={{ fontWeight: 600 }}>{deptValues[a._id]?.status || r.employee?.appraisal?.status || a.status || '—'}</div>
                        </div>

                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button className={styles.primaryButton} onClick={() => handleSave(a)} disabled={deptValues[a._id]?.loading}>Save</button>
                          <button className={styles.secondaryButton} onClick={() => closeEditor(a._id)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
