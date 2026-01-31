/**
 * Leave Parameters Page
 * Configure max duration, notice periods, approval workflows
 * Accessible by: HR Admin, System Admin
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './parameters.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface LeaveType {
  _id: string;
  name: string;
  code: string;
  maxDurationDays?: number;
}

interface Policy {
  _id: string;
  leaveTypeId: string | { _id: string; name: string };
  minNoticeDays?: number;
  maxConsecutiveDays?: number;
}

interface ParameterConfig {
  leaveTypeId: string;
  leaveTypeName: string;
  policyId: string | null;
  maxDurationDays: number;
  minNoticeDays: number;
  maxConsecutiveDays: number;
}

export default function LeaveParametersPage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [parameters, setParameters] = useState<ParameterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingParam, setEditingParam] = useState<ParameterConfig | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    policyId: '',
    leaveTypeId: '',
    maxDurationDays: 0,
    minNoticeDays: '',
    maxConsecutiveDays: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [typesRes, policiesRes] = await Promise.all([
        axios.get('/leaves/types').catch(() => ({ data: [] })),
        axios.get('/leaves/policies').catch(() => ({ data: [] })),
      ]);

      setLeaveTypes(typesRes.data);
      setPolicies(policiesRes.data);

      // Build parameter configs
      const configs: ParameterConfig[] = typesRes.data.map((type: LeaveType) => {
        // Policy's leaveTypeId is populated as an object
        const policy = policiesRes.data.find((p: Policy) => {
          const policyLeaveTypeId = typeof p.leaveTypeId === 'object' 
            ? p.leaveTypeId._id 
            : p.leaveTypeId;
          return policyLeaveTypeId === type._id;
        });
        return {
          leaveTypeId: type._id,
          leaveTypeName: type.name,
          policyId: policy?._id || null,
          maxDurationDays: type.maxDurationDays || 0,
          minNoticeDays: policy?.minNoticeDays || 0,
          maxConsecutiveDays: policy?.maxConsecutiveDays || 0,
        };
      });

      setParameters(configs);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load parameters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (param: ParameterConfig) => {
    setEditingParam(param);
    setFormData({
      policyId: param.policyId || '',
      leaveTypeId: param.leaveTypeId,
      maxDurationDays: param.maxDurationDays,
      minNoticeDays: param.minNoticeDays ? String(param.minNoticeDays) : '',
      maxConsecutiveDays: param.maxConsecutiveDays ? String(param.maxConsecutiveDays) : '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingParam(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError('');

      if (!formData.policyId) {
        setError('No policy found for this leave type. Please create a policy first.');
        return;
      }

      // Update the policy using the stored policyId
      await axios.put(`/leaves/policies/${formData.policyId}`, {
        minNoticeDays: formData.minNoticeDays ? parseInt(formData.minNoticeDays) : 0,
        maxConsecutiveDays: formData.maxConsecutiveDays ? parseInt(formData.maxConsecutiveDays) : 0,
      });

      setSuccess('Parameters updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      closeModal();
      fetchData();
    } catch (err: any) {
      console.error('Failed to update parameters:', err);
      setError(err.response?.data?.message || 'Failed to update parameters');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leave Parameters" role="HR Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Leave Parameters</h1>
              <p className={styles.subtitle}>
                Configure duration limits, notice periods, and approval workflows
              </p>
            </div>
            <button 
              className={styles.backButton}
              onClick={() => router.push('/dashboard/hr/leaves')}
            >
              Back to Leave Management
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {/* Parameters Table */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Leave Type Parameters</h2>

            {loading ? (
              <Spinner message="Loading parameters..." />
            ) : parameters.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No leave types configured yet.</p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => router.push('/dashboard/hr/leaves/types')}
                >
                  Create Leave Types
                </button>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Max Duration</th>
                      <th>Min Notice</th>
                      <th>Max Consecutive</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parameters.map((param) => (
                      <tr key={param.leaveTypeId}>
                        <td className={styles.typeName}>{param.leaveTypeName}</td>
                        <td>{param.maxDurationDays || 'Unlimited'} days</td>
                        <td>{param.minNoticeDays} days</td>
                        <td>{param.maxConsecutiveDays || 'Unlimited'} days</td>
                        <td>
                          <button
                            className={styles.editButton}
                            onClick={() => openModal(param)}
                            disabled={!param.policyId}
                            title={!param.policyId ? 'No policy configured for this leave type' : 'Configure parameters'}
                          >
                            {param.policyId ? 'Configure' : 'No Policy'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Parameter Descriptions</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <h3>Maximum Duration</h3>
                <p>The maximum number of days an employee can request for a single leave application.</p>
              </div>
              <div className={styles.infoCard}>
                <h3>Minimum Notice Period</h3>
                <p>How many days in advance the leave request must be submitted before the start date.</p>
              </div>
              <div className={styles.infoCard}>
                <h3>Max Consecutive Days</h3>
                <p>Maximum days that can be taken consecutively without a break.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {showModal && editingParam && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Configure: {editingParam.leaveTypeName}</h2>
                <button className={styles.closeButton} onClick={closeModal}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Max Duration (days)</label>
                      <input
                        type="number" className={styles.input}
                        value={formData.maxDurationDays}
                        onChange={(e) => setFormData({ ...formData, maxDurationDays: parseInt(e.target.value) || 0 })}
                        min="0" placeholder="0 = unlimited"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Min Notice (days)</label>
                      <input
                        type="number" className={styles.input}
                        value={formData.minNoticeDays}
                        onChange={(e) => setFormData({ ...formData, minNoticeDays: e.target.value })}
                        min="0" placeholder="Enter minimum notice days"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Max Consecutive Days</label>
                    <input
                      type="number" className={styles.input}
                      value={formData.maxConsecutiveDays}
                      onChange={(e) => setFormData({ ...formData, maxConsecutiveDays: e.target.value })}
                      min="0" placeholder="Enter max consecutive days (0 = unlimited)"
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Parameters'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}