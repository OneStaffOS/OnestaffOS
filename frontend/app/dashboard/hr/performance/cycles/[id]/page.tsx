/**
 * View Appraisal Cycle Details
 * Display detailed information about a specific appraisal cycle
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '../../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../templates/templates.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Template {
  _id: string;
  name: string;
  templateType: string;
}

interface Department {
  _id: string;
  name: string;
}

interface TemplateAssignment {
  templateId: Template;
  departmentIds: Department[];
}

interface Cycle {
  _id: string;
  name: string;
  description: string;
  cycleType: string;
  startDate: string;
  endDate: string;
  managerDueDate?: string;
  employeeAcknowledgementDueDate?: string;
  templateAssignments: TemplateAssignment[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function ViewCyclePage() {
  const router = useRouter();
  const params = useParams();
  const cycleId = params?.id as string;

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cycleId) {
      fetchCycle();
    }
  }, [cycleId]);

  const fetchCycle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/performance/cycles/${cycleId}`);
      setCycle(response.data);
    } catch (error: any) {
      console.error('Failed to fetch cycle:', error);
      setError(error.response?.data?.message || 'Failed to load cycle');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!confirm('Are you sure you want to activate this cycle? Participants will be notified.')) return;

    try {
      await axios.put(`/performance/cycles/${cycleId}/activate`);
      alert('Cycle activated successfully!');
      fetchCycle();
    } catch (error: any) {
      console.error('Failed to activate cycle:', error);
      alert('Failed to activate cycle: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this cycle? This action cannot be undone.')) return;

    try {
      await axios.put(`/performance/cycles/${cycleId}/close`);
      alert('Cycle closed successfully!');
      fetchCycle();
    } catch (error: any) {
      console.error('Failed to close cycle:', error);
      alert('Failed to close cycle: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      PLANNED: { label: 'Planned', color: '#6366f1' },
      ACTIVE: { label: 'Active', color: '#10b981' },
      CLOSED: { label: 'Closed', color: '#6b7280' },
      ARCHIVED: { label: 'Archived', color: '#9ca3af' },
    };
    const badge = badges[status] || { label: status, color: '#6b7280' };
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        background: badge.color,
        color: 'white',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: '500'
      }}>
        {badge.label}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ANNUAL: 'Annual Review',
      SEMI_ANNUAL: 'Semi-Annual Review',
      PROBATIONARY: 'Probationary Review',
      PROJECT: 'Project-Based Review',
      AD_HOC: 'Ad-Hoc Review',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
        <DashboardLayout title="Loading..." role="HR Manager">
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading cycle details...</div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !cycle) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
        <DashboardLayout title="Error" role="HR Manager">
          <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
            {error || 'Cycle not found'}
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Cycle Details" role="HR Manager">
        <div className={styles.container}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h1 style={{ marginBottom: '0.5rem' }}>{cycle.name}</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {getStatusBadge(cycle.status)}
                  <span style={{ color: '#666', fontSize: '0.95rem' }}>
                    {getTypeLabel(cycle.cycleType)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => router.push('/dashboard/hr/performance/cycles')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Back to List
                </button>
                {cycle.status === 'PLANNED' && (
                  <>
                    <button
                      onClick={() => router.push(`/dashboard/hr/performance/cycles/${cycleId}/edit`)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleActivate}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                      }}
                    >
                      Activate
                    </button>
                  </>
                )}
                {cycle.status === 'ACTIVE' && (
                  <button
                    onClick={handleClose}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}
                  >
                    Close Cycle
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className={styles.section}>
            <h2>Basic Information</h2>
            <div className={styles.infoGrid}>
              <div>
                <strong>Cycle Name:</strong>
                <p>{cycle.name}</p>
              </div>
              <div>
                <strong>Cycle Type:</strong>
                <p>{getTypeLabel(cycle.cycleType)}</p>
              </div>
              <div>
                <strong>Status:</strong>
                <p>{getStatusBadge(cycle.status)}</p>
              </div>
              <div>
                <strong>Description:</strong>
                <p>{cycle.description || 'No description provided'}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.section}>
            <h2>Timeline</h2>
            <div className={styles.infoGrid}>
              <div>
                <strong>Start Date:</strong>
                <p>{new Date(cycle.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <strong>End Date:</strong>
                <p>{new Date(cycle.endDate).toLocaleDateString()}</p>
              </div>
              {cycle.managerDueDate && (
                <div>
                  <strong>Manager Review Due:</strong>
                  <p>{new Date(cycle.managerDueDate).toLocaleDateString()}</p>
                </div>
              )}
              {cycle.employeeAcknowledgementDueDate && (
                <div>
                  <strong>Employee Acknowledgement Due:</strong>
                  <p>{new Date(cycle.employeeAcknowledgementDueDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Template Assignments */}
          <div className={styles.section}>
            <h2>Template Assignments ({cycle.templateAssignments?.length || 0})</h2>
            {!cycle.templateAssignments || cycle.templateAssignments.length === 0 ? (
              <p style={{ color: '#666' }}>No template assignments configured</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cycle.templateAssignments.map((assignment, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '1.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      background: '#f9fafb'
                    }}
                  >
                    <div style={{ marginBottom: '1rem' }}>
                      <strong>Template:</strong>
                      <p style={{ marginTop: '0.25rem' }}>
                        {assignment.templateId?.name || 'Unknown Template'} 
                        <span style={{ color: '#666', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                          ({assignment.templateId?.templateType})
                        </span>
                      </p>
                    </div>
                    <div>
                      <strong>Assigned to Departments:</strong>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginTop: '0.5rem'
                      }}>
                        {assignment.departmentIds && assignment.departmentIds.length > 0 ? (
                          assignment.departmentIds.map((dept: any) => (
                            <span
                              key={dept._id || dept}
                              style={{
                                padding: '0.25rem 0.75rem',
                                background: '#e0e7ff',
                                color: '#3730a3',
                                borderRadius: '12px',
                                fontSize: '0.875rem'
                              }}
                            >
                              {dept.name || dept}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#666', fontSize: '0.875rem' }}>All departments</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className={styles.section}>
            <h2>Metadata</h2>
            <div className={styles.infoGrid}>
              <div>
                <strong>Created:</strong>
                <p>{new Date(cycle.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <strong>Last Updated:</strong>
                <p>{new Date(cycle.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}