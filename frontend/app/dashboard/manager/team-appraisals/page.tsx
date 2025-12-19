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
        <Spinner fullScreen message="Loading team appraisals..." />
      </ProtectedRoute>
    );
  }

  // Calculate stats
  const totalMembers = rows.length;
  const withAssignment = rows.filter(r => r.assignment).length;
  const completed = rows.filter(r => r.assignment?.status === 'PUBLISHED' || r.assignment?.status === 'COMPLETED').length;
  const pending = withAssignment - completed;

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (s === 'PUBLISHED' || s === 'COMPLETED') {
      return { bg: '#d1fae5', color: '#065f46', text: 'Completed' };
    } else if (s === 'IN_PROGRESS' || s === 'DRAFT') {
      return { bg: '#dbeafe', color: '#1e40af', text: 'In Progress' };
    } else if (s === 'PENDING' || s === 'ASSIGNED') {
      return { bg: '#fef3c7', color: '#92400e', text: 'Pending' };
    }
    return { bg: '#f3f4f6', color: '#6b7280', text: status || 'No Status' };
  };

  return (
    <ProtectedRoute requiredRoles={[Role.DEPARTMENT_HEAD, Role.HR_MANAGER]}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>📋 Team Appraisals</h1>
            <p className={styles.subtitle}>View employees, their cycle assignments and set Department Head rating & comments.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.refreshButton} onClick={fetchTeamAndAssignments}>🔄 Refresh</button>
            <button className={styles.secondaryButton} onClick={() => router.back()}>← Back</button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statBlue}`}>
            <h3>👥 Team Members</h3>
            <p>{totalMembers}</p>
          </div>
          <div className={`${styles.statCard} ${styles.statPurple}`}>
            <h3>📋 With Assignments</h3>
            <p>{withAssignment}</p>
          </div>
          <div className={`${styles.statCard} ${styles.statGreen}`}>
            <h3>✅ Completed</h3>
            <p>{completed}</p>
          </div>
          <div className={`${styles.statCard} ${styles.statOrange}`}>
            <h3>⏳ Pending</h3>
            <p>{pending}</p>
          </div>
        </div>

        {/* Team Cards */}
        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', marginBottom: '0.75rem' }}>No Team Members Found</h2>
            <p style={{ fontSize: '1.05rem', color: '#6b7280', margin: 0 }}>No team members or appraisal assignments found.</p>
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {rows.map(r => {
              const a = r.assignment;
              const key = a?._id || `emp-${r.employee._id}`;
              const statusBadge = getStatusBadge(a?.status || '');
              const initials = `${r.employee?.firstName?.[0] || ''}${r.employee?.lastName?.[0] || ''}`;
              
              return (
                <div key={key} className={styles.assignmentCard}>
                  {/* Card Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                          {r.employee?.firstName} {r.employee?.lastName}
                        </h3>
                        <span style={{
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {statusBadge.text}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
                        {a ? `${a.cycleId?.name || 'No Cycle'} • ${a.templateId?.name || 'No Template'}` : 'No assignment'}
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '1.5rem' }}>
                    {a && r.employee?.appraisal?.totalScore !== undefined && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '12px',
                        marginBottom: '1rem'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#92400e' }}>⭐ Current Score:</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#92400e' }}>
                          {r.employee?.appraisal?.totalScore?.toFixed(1) || '—'}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={styles.actionGroup}>
                      {a ? (
                        <>
                          <button className={styles.infoButton} onClick={() => router.push(a.latestAppraisalId ? `/dashboard/manager/performance/record/${a.latestAppraisalId}` : `/dashboard/manager/performance/appraisal/${a._id}`)}>
                            📄 Open Appraisal
                          </button>
                          <button className={styles.primaryButton} onClick={() => openEditor(a)}>
                            ✏️ Edit Dept Head Comment
                          </button>
                        </>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>No assignment available</span>
                      )}
                    </div>

                    {/* Editor Section */}
                    {a && editing[a._id] && (
                      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#374151', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          📝 Department Head Comments
                        </h4>

                        {deptValues[a._id]?.loading ? (
                          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
                        ) : (
                          <>
                            {/* Existing Score Display */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              padding: '0.75rem 1rem',
                              background: '#f9fafb',
                              borderRadius: '10px',
                              marginBottom: '1rem'
                            }}>
                              <span style={{ fontSize: '0.9rem', color: '#6b7280', minWidth: '100px' }}>Existing Score:</span>
                              <span style={{ fontWeight: '700', color: '#111827', fontSize: '1.25rem' }}>
                                {deptValues[a._id]?.rating ?? (r.employee?.appraisal?.totalScore ?? '—')}
                              </span>
                            </div>

                            {/* Manager Summary */}
                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                Manager Summary
                              </label>
                              <textarea
                                rows={3}
                                placeholder="Enter overall manager summary..."
                                style={{
                                  width: '100%',
                                  padding: '0.875rem',
                                  border: '2px solid #e5e7eb',
                                  borderRadius: '10px',
                                  fontSize: '0.95rem',
                                  resize: 'vertical',
                                  fontFamily: 'inherit',
                                  transition: 'border-color 0.2s ease'
                                }}
                                value={deptValues[a._id]?.managerSummary ?? (r.employee?.appraisal?.managerSummary || '')}
                                onChange={(e) => setDeptValues(prev => ({ ...prev, [a._id]: { ...(prev[a._id] || {}), managerSummary: e.target.value } }))}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                              />
                            </div>

                            {/* Strengths */}
                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                💪 Key Strengths
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Highlight key strengths..."
                                style={{
                                  width: '100%',
                                  padding: '0.875rem',
                                  border: '2px solid #e5e7eb',
                                  borderRadius: '10px',
                                  fontSize: '0.95rem',
                                  resize: 'vertical',
                                  fontFamily: 'inherit'
                                }}
                                value={deptValues[a._id]?.strengths ?? (r.employee?.appraisal?.strengths || '')}
                                onChange={(e) => setDeptValues(prev => ({ ...prev, [a._id]: { ...(prev[a._id] || {}), strengths: e.target.value } }))}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                              />
                            </div>

                            {/* Areas for Improvement */}
                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                📈 Areas for Improvement
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Note areas for improvement..."
                                style={{
                                  width: '100%',
                                  padding: '0.875rem',
                                  border: '2px solid #e5e7eb',
                                  borderRadius: '10px',
                                  fontSize: '0.95rem',
                                  resize: 'vertical',
                                  fontFamily: 'inherit'
                                }}
                                value={deptValues[a._id]?.improvementAreas ?? (r.employee?.appraisal?.improvementAreas || '')}
                                onChange={(e) => setDeptValues(prev => ({ ...prev, [a._id]: { ...(prev[a._id] || {}), improvementAreas: e.target.value } }))}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                              />
                            </div>

                            {/* Status Display */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              padding: '0.75rem 1rem',
                              background: '#f9fafb',
                              borderRadius: '10px',
                              marginBottom: '1rem'
                            }}>
                              <span style={{ fontSize: '0.9rem', color: '#6b7280', minWidth: '100px' }}>Status:</span>
                              <span style={{ fontWeight: '600', color: '#111827' }}>
                                {deptValues[a._id]?.status || r.employee?.appraisal?.status || a.status || '—'}
                              </span>
                            </div>

                            {/* Editor Actions */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                              <button
                                onClick={() => handleSave(a)}
                                disabled={deptValues[a._id]?.loading}
                                style={{
                                  padding: '0.75rem 1.5rem',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '10px',
                                  cursor: deptValues[a._id]?.loading ? 'not-allowed' : 'pointer',
                                  fontSize: '0.95rem',
                                  fontWeight: '600',
                                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                  opacity: deptValues[a._id]?.loading ? 0.6 : 1,
                                  transition: 'all 0.3s ease'
                                }}
                              >
                                💾 Save
                              </button>
                              <button
                                onClick={() => closeEditor(a._id)}
                                style={{
                                  padding: '0.75rem 1.5rem',
                                  background: 'white',
                                  color: '#6b7280',
                                  border: '2px solid #e5e7eb',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  fontSize: '0.95rem',
                                  fontWeight: '600',
                                  transition: 'all 0.3s ease'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
