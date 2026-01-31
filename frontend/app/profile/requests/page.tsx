/**
 * My Change Requests Page (Route: /profile/requests)
 * View all change requests submitted by the employee
 * Phase I: View request status and history
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { ProfileChangeRequest, ChangeRequestStatus } from '@/lib/types/employee-profile.types';
import styles from './requests.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function MyRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/employee-profile/my-profile/change-requests');
      setRequests(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: ChangeRequestStatus) => {
    switch (status) {
      case ChangeRequestStatus.PENDING:
        return styles.statusPending;
      case ChangeRequestStatus.APPROVED:
        return styles.statusApproved;
      case ChangeRequestStatus.REJECTED:
        return styles.statusRejected;
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const parseRequestDescription = (description: string) => {
    // Parse: "Change request for fieldName: from "oldValue" to "newValue". Reason: ..."
    const fieldMatch = description.match(/Change request for ([^:]+):/);
    const fromMatch = description.match(/from "([^"]+)"/);
    const toMatch = description.match(/to "([^"]+)"/);
    
    return {
      field: fieldMatch ? fieldMatch[1] : 'Unknown field',
      oldValue: fromMatch ? fromMatch[1] : 'N/A',
      newValue: toMatch ? toMatch[1] : 'N/A'
    };
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Spinner fullScreen message="Loading change requests..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Change Requests</h1>
          <div className={styles.actions}>
            <button 
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={() => router.push('/profile/request-change')}
            >
              + New Request
            </button>
            <button 
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={() => router.push('/profile')}
            >
              ← Back to Profile
            </button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {requests.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h2>No Change Requests</h2>
            <p>You haven't submitted any change requests yet.</p>
            <button 
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={() => router.push('/profile/request-change')}
            >
              Submit Your First Request
            </button>
          </div>
        ) : (
          <div className={styles.requestsList}>
            {requests.map((request) => {
              const requestDesc = (request as any).requestDescription || '';
              const parsed = parseRequestDescription(requestDesc);
              
              return (
                <div key={request._id} className={styles.requestCard}>
                  <div className={styles.requestHeader}>
                    <div className={styles.requestInfo}>
                      <h3 className={styles.requestTitle}>
                        {parsed.field}
                      </h3>
                      <p className={styles.requestDate}>
                        Submitted on {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className={`${styles.statusBadge} ${getStatusClass(request.status)}`}>
                      {request.status}
                    </div>
                  </div>

                  <div className={styles.requestBody}>
                    <div className={styles.valueComparison}>
                      <div className={styles.oldValue}>
                        <span className={styles.valueLabel}>Old Value</span>
                        <div className={styles.valueBox}>
                          {parsed.oldValue}
                        </div>
                      </div>
                      <div className={styles.changeArrow}>→</div>
                      <div className={styles.newValue}>
                        <span className={styles.valueLabel}>New Value</span>
                        <div className={styles.valueBox}>
                          {parsed.newValue}
                        </div>
                      </div>
                    </div>
                    {request.reason && (
                      <div className={styles.requestReason}>
                        <strong>Reason:</strong>
                        <p>{request.reason}</p>
                      </div>
                    )}
                  </div>

                  {request.status === ChangeRequestStatus.APPROVED && request.reviewedAt && (
                    <div className={styles.requestFooter}>
                      <span className={styles.footerText}>
                        ✓ Approved on {formatDate(request.reviewedAt)}
                        {request.reviewedBy && ` by ${request.reviewedBy}`}
                      </span>
                    </div>
                  )}

                  {request.status === ChangeRequestStatus.REJECTED && request.reviewedAt && (
                    <div className={styles.requestFooter}>
                      <span className={styles.footerText}>
                        ✗ Rejected on {formatDate(request.reviewedAt)}
                        {request.reviewedBy && ` by ${request.reviewedBy}`}
                      </span>
                      {request.reviewComments && (
                        <p className={styles.rejectionReason}>{request.reviewComments}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}