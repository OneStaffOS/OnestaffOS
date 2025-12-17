/**
 * Employee Resignation Request Page
 * Allows employees to submit resignation requests
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './resignation.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function ResignationPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [employeeComments, setEmployeeComments] = useState('');
  const [terminationDate, setTerminationDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const profileRes = await axios.get('/employee-profile/my-profile');
      setProfile(profileRes.data);
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
      setError('Failed to load employee information');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reason.trim()) {
      setError('Please provide a reason for resignation');
      return;
    }

    if (!profile) {
      setError('Employee profile not loaded');
      return;
    }

    try {
      setSubmitting(true);

      await axios.post('/recruitment/termination/resignation', {
        employeeId: profile._id,
        initiator: 'employee',
        reason,
        employeeComments,
        terminationDate: terminationDate || undefined,
        contractId: contract?._id || profile._id, // Fallback to profile ID if no contract
      });

      setSuccess('Resignation request submitted successfully! HR will review your request.');
      setTimeout(() => {
        router.push('/dashboard/employee/my-resignations');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to submit resignation:', err);
      setError(err.response?.data?.message || 'Failed to submit resignation request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Submit Resignation" role="Employee">
        <button
          onClick={() => router.back()}
          className={styles.backButton}
        >
          ← Back
        </button>

        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Resignation Request</h1>
            <p>Submit your resignation request to HR for review</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="reason">Reason for Resignation *</label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className={styles.select}
              >
                <option value="">Select reason...</option>
                <option value="Career Growth">Career Growth Opportunity</option>
                <option value="Personal Reasons">Personal Reasons</option>
                <option value="Relocation">Relocation</option>
                <option value="Better Compensation">Better Compensation</option>
                <option value="Work-Life Balance">Work-Life Balance</option>
                <option value="Health Reasons">Health Reasons</option>
                <option value="Further Education">Further Education</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="comments">Additional Comments</label>
              <textarea
                id="comments"
                value={employeeComments}
                onChange={(e) => setEmployeeComments(e.target.value)}
                rows={5}
                className={styles.textarea}
                placeholder="Please provide any additional details about your resignation..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="terminationDate">Proposed Last Working Day</label>
              <input
                type="date"
                id="terminationDate"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={styles.input}
              />
              <small>2 weeks notice is recommended</small>
            </div>

            <div className={styles.info}>
              <h3>📋 What happens next?</h3>
              <ul>
                <li>HR will review your resignation request</li>
                <li>You will be notified of the status via email and notifications</li>
                <li>An exit interview may be scheduled</li>
                <li>Clearance process will be initiated upon approval</li>
                <li>Final settlement will be processed</li>
              </ul>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => router.back()}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={styles.submitButton}
              >
                {submitting ? 'Submitting...' : 'Submit Resignation'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
