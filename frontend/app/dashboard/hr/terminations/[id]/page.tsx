/**
 * HR Termination Detail Page
 * View and update specific termination request
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './detail.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Termination {
  _id: string;
  employeeId: string | {
    _id?: string;
    firstName: string;
    lastName: string;
    workEmail?: string;
    personalEmail?: string;
    primaryDepartmentId?: { _id?: string; name: string };
    primaryPositionId?: { _id?: string; title: string };
  };
  initiator: string;
  reason: string;
  employeeComments?: string;
  hrComments?: string;
  status: string;
  terminationDate?: string;
  contractId: any;
  createdAt: string;
  updatedAt: string;
}

export default function TerminationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const terminationId = params.id as string;

  const [termination, setTermination] = useState<Termination | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [hrComments, setHrComments] = useState('');
  const [status, setStatus] = useState('');
  const [terminationDate, setTerminationDate] = useState('');

  useEffect(() => {
    fetchTerminationDetails();
  }, [terminationId]);

  const fetchTerminationDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/recruitment/termination/${terminationId}`);
      setTermination(response.data);
      setHrComments(response.data.hrComments || '');
      setStatus(response.data.status || '');
      setTerminationDate(
        response.data.terminationDate 
          ? new Date(response.data.terminationDate).toISOString().split('T')[0]
          : ''
      );
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch termination:', err);
      setError('Failed to load termination details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setUpdating(true);
      setError('');
      
      const payload: any = {};
      
      if (hrComments !== termination?.hrComments) {
        payload.hrComments = hrComments;
      }
      
      if (status !== termination?.status) {
        payload.status = status;
      }
      
      if (terminationDate && terminationDate !== termination?.terminationDate) {
        payload.terminationDate = terminationDate;
      }

      await axios.put(`/recruitment/termination/${terminationId}`, payload);
      
      setSuccess('Termination updated successfully!');
      
      // Refresh data
      await fetchTerminationDetails();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Update failed:', err);
      setError(err.response?.data?.message || 'Failed to update termination');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'under_review': return '#3b82f6';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getInitiatorColor = (initiator: string) => {
    switch (initiator?.toLowerCase()) {
      case 'employee': return '#8b5cf6';
      case 'hr': return '#ef4444';
      case 'manager': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner message="Loading termination details..." />
      </div>
    );
  }

  if (error && !termination) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Go Back
        </button>
      </div>
    );
  }

  if (!termination) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Termination not found</div>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Go Back
        </button>
      </div>
    );
  }

  const getEmployeeData = () => {
    if (typeof termination?.employeeId === 'string') {
      return {
        firstName: 'Unknown',
        lastName: 'Employee',
        email: 'N/A',
        department: 'N/A',
        position: 'N/A'
      };
    }
    
    const emp = termination?.employeeId;
    return {
      firstName: emp?.firstName || 'Unknown',
      lastName: emp?.lastName || 'Employee',
      email: emp?.workEmail || emp?.personalEmail || 'N/A',
      department: emp?.primaryDepartmentId?.name || 'N/A',
      position: emp?.primaryPositionId?.title || 'N/A'
    };
  };

  const employee = getEmployeeData();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back to List
        </button>
        <h1>Termination Details</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.grid}>
        {/* Employee Information */}
        <div className={styles.card}>
          <h2>Employee Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <strong>Name:</strong>
              <span>{employee.firstName} {employee.lastName}</span>
            </div>
            <div className={styles.infoItem}>
              <strong>Email:</strong>
              <span>{employee.email}</span>
            </div>
            <div className={styles.infoItem}>
              <strong>Department:</strong>
              <span>{employee.department || 'N/A'}</span>
            </div>
            <div className={styles.infoItem}>
              <strong>Position:</strong>
              <span>{employee.position || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Termination Information */}
        <div className={styles.card}>
          <h2>Termination Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <strong>Initiator:</strong>
              <span 
                className={styles.badge}
                style={{ backgroundColor: getInitiatorColor(termination.initiator) }}
              >
                {termination.initiator}
              </span>
            </div>
            <div className={styles.infoItem}>
              <strong>Current Status:</strong>
              <span 
                className={styles.badge}
                style={{ backgroundColor: getStatusColor(termination.status) }}
              >
                {termination.status}
              </span>
            </div>
            <div className={styles.infoItem}>
              <strong>Reason:</strong>
              <span>{termination.reason}</span>
            </div>
            <div className={styles.infoItem}>
              <strong>Submitted:</strong>
              <span>{new Date(termination.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Comments */}
      {termination.employeeComments && (
        <div className={styles.card}>
          <h3>Employee Comments</h3>
          <p className={styles.comments}>{termination.employeeComments}</p>
        </div>
      )}

      {/* Update Form */}
      <form onSubmit={handleUpdate} className={styles.form}>
        <h2>Update Termination</h2>

        <div className={styles.formGroup}>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          >
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="terminationDate">Termination Date</label>
          <input
            type="date"
            id="terminationDate"
            value={terminationDate}
            onChange={(e) => setTerminationDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="hrComments">HR Comments</label>
          <textarea
            id="hrComments"
            value={hrComments}
            onChange={(e) => setHrComments(e.target.value)}
            rows={5}
            placeholder="Add comments about this termination..."
          />
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            disabled={updating}
            className={styles.submitButton}
          >
            {updating ? 'Updating...' : 'Update Termination'}
          </button>

          {status === 'approved' && (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/hr/terminations/${terminationId}/clearance`)}
              className={styles.clearanceButton}
            >
              Manage Clearance
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
