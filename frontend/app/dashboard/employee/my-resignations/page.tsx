/**
 * My Resignations Status Page
 * View status of submitted resignation requests
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './myResignations.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function MyResignationsPage() {
  const router = useRouter();
  const [resignations, setResignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResignations();
  }, []);

  const fetchResignations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/recruitment/termination/my-resignations');
      setResignations(response.data);
    } catch (err: any) {
      console.error('Failed to fetch resignations:', err);
      setError(err.response?.data?.message || 'Failed to load resignation requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      under_review: '#3b82f6',
      approved: '#10b981',
      rejected: '#ef4444',
    };

    return (
      <span
        className={styles.badge}
        style={{ background: colors[status] || '#6b7280' }}
      >
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="My Resignation Requests" role="Employee">
          <Spinner message="Loading resignation requests..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My Resignation Requests" role="Employee">
        <button
          onClick={() => router.back()}
          className={styles.backButton}
        >
          ← Back
        </button>

        <div className={styles.container}>
          <div className={styles.header}>
            <h1>My Resignation Requests</h1>
            <button
              onClick={() => router.push('/dashboard/employee/resignation')}
              className={styles.newButton}
            >
              + Submit New Resignation
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {resignations.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}></div>
              <h2>No Resignation Requests</h2>
              <p>You haven't submitted any resignation requests yet.</p>
              <button
                onClick={() => router.push('/dashboard/employee/resignation')}
                className={styles.emptyButton}
              >
                Submit Resignation Request
              </button>
            </div>
          ) : (
            <div className={styles.list}>
              {resignations.map((resignation) => (
                <div key={resignation._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3>Resignation Request</h3>
                      <span className={styles.date}>
                        Submitted: {new Date(resignation.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {getStatusBadge(resignation.status)}
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.detail}>
                      <strong>Reason:</strong>
                      <span>{resignation.reason}</span>
                    </div>

                    {resignation.employeeComments && (
                      <div className={styles.detail}>
                        <strong>Comments:</strong>
                        <span>{resignation.employeeComments}</span>
                      </div>
                    )}

                    {resignation.terminationDate && (
                      <div className={styles.detail}>
                        <strong>Proposed Last Day:</strong>
                        <span>
                          {new Date(resignation.terminationDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {resignation.hrComments && (
                      <div className={styles.detail}>
                        <strong>HR Comments:</strong>
                        <span className={styles.hrComments}>
                          {resignation.hrComments}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <small>
                      Last Updated: {new Date(resignation.updatedAt).toLocaleString()}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}