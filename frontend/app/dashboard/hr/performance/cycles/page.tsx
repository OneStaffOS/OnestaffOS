/**
 * Performance Cycles Management (Route: /hr/performance/cycles)
 * REQ-PP-02: Define and schedule appraisal cycles
 * REQ-PP-05: Assign appraisal forms in bulk
 * Accessible by: HR Manager, HR Admin, HR Employee
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './cycles.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Cycle {
  _id: string;
  name: string;
  description: string;
  type: 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT_BASED';
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  templateId: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function PerformanceCyclesPage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/performance/cycles');
      setCycles(response.data);
    } catch (error: any) {
      console.error('Failed to fetch cycles:', error);
      alert('Failed to load cycles: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCycle = async (id: string) => {
    if (!confirm('Are you sure you want to activate this cycle? Employees and managers will be notified.')) return;

    try {
      await axios.put(`/performance/cycles/${id}/activate`);
      alert('Cycle activated successfully!');
      fetchCycles();
    } catch (error: any) {
      console.error('Failed to activate cycle:', error);
      alert('Failed to activate cycle: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCloseCycle = async (id: string) => {
    if (!confirm('Are you sure you want to close this cycle? This action cannot be undone.')) return;

    try {
      await axios.put(`/performance/cycles/${id}/close`);
      alert('Cycle closed successfully!');
      fetchCycles();
    } catch (error: any) {
      console.error('Failed to close cycle:', error);
      alert('Failed to close cycle: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      DRAFT: { label: 'Draft', className: styles.draft },
      ACTIVE: { label: 'Active', className: styles.active },
      CLOSED: { label: 'Closed', className: styles.closed },
      ARCHIVED: { label: 'Archived', className: styles.archived },
    };
    const badge = badges[status] || { label: status, className: '' };
    return <span className={`${styles.statusBadge} ${badge.className}`}>{badge.label}</span>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ANNUAL: 'Annual Review',
      SEMI_ANNUAL: 'Semi-Annual Review',
      PROBATIONARY: 'Probationary Review',
      PROJECT_BASED: 'Project-Based Review',
    };
    return labels[type] || type;
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Performance Appraisal Cycles" role="HR Manager">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1>Appraisal Cycles</h1>
              <p className={styles.subtitle}>
                Define, schedule and manage performance appraisal cycles (REQ-PP-02)
              </p>
            </div>
            <div className={styles.headerRight}>
              <button
                className={styles.primaryButton}
                onClick={() => router.push('/dashboard/hr/performance/cycles/create')}
              >
                + Create Cycle
              </button>
            </div>
          </div>

          {/* Cycles List */}
          {loading ? (
            <Spinner message="Loading cycles..." />
          ) : cycles.length === 0 ? (
            <div className={styles.empty}>
              <p>No appraisal cycles found</p>
              <button
                className={styles.primaryButton}
                onClick={() => router.push('/dashboard/hr/performance/cycles/create')}
              >
                Create Your First Cycle
              </button>
            </div>
          ) : (
            <div className={styles.cyclesList}>
              {cycles.map((cycle) => {
                const daysRemaining = getDaysRemaining(cycle.endDate);
                const isActive = cycle.status === 'ACTIVE';
                const isDraft = cycle.status === 'DRAFT';
                const isClosed = cycle.status === 'CLOSED';

                return (
                  <div key={cycle._id} className={styles.cycleCard}>
                    <div className={styles.cycleHeader}>
                      <div>
                        <h3>{cycle.name}</h3>
                        <span className={styles.cycleType}>{getTypeLabel(cycle.type)}</span>
                      </div>
                      {getStatusBadge(cycle.status)}
                    </div>

                    <p className={styles.description}>{cycle.description}</p>

                    <div className={styles.cycleDetails}>
                      <div className={styles.detailRow}>
                        <strong>Template:</strong> {cycle.templateId?.name || 'Not assigned'}
                      </div>
                      <div className={styles.detailRow}>
                        <strong>Period:</strong> {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                      </div>
                      {isActive && (
                        <div className={styles.detailRow}>
                          <strong>Days Remaining:</strong>
                          <span className={daysRemaining < 7 ? styles.urgent : daysRemaining < 30 ? styles.warning : styles.normal}>
                            {daysRemaining} days
                          </span>
                        </div>
                      )}
                    </div>

                    <div className={styles.cycleActions}>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => router.push(`/dashboard/hr/performance/cycles/${cycle._id}`)}
                      >
                        View Details
                      </button>
                      
                      {isDraft && (
                        <>
                          <button
                            className={styles.secondaryButton}
                            onClick={() => router.push(`/dashboard/hr/performance/cycles/${cycle._id}/edit`)}
                          >
                            Edit
                          </button>
                          <button
                            className={styles.successButton}
                            onClick={() => handleActivateCycle(cycle._id)}
                          >
                            Activate Cycle
                          </button>
                        </>
                      )}

                      {isActive && (
                        <>
                          <button
                            className={styles.primaryButton}
                            onClick={() => router.push(`/dashboard/hr/performance/cycles/${cycle._id}/assign`)}
                          >
                            Manage Assignments
                          </button>
                          <button
                            className={styles.warningButton}
                            onClick={() => handleCloseCycle(cycle._id)}
                          >
                            Close Cycle
                          </button>
                        </>
                      )}

                      {isClosed && (
                        <button
                          className={styles.secondaryButton}
                          onClick={() => router.push(`/dashboard/hr/performance/cycles/${cycle._id}/report`)}
                        >
                          View Report
                        </button>
                      )}
                    </div>

                    <div className={styles.cycleFooter}>
                      <small>
                        Created {new Date(cycle.createdAt).toLocaleDateString()} | 
                        Updated {new Date(cycle.updatedAt).toLocaleDateString()}
                      </small>
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
