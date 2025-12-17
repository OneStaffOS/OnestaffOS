/**
 * Leave Policies Management Page
 * REQ-003: Configure leave policy settings
 * REQ-009: Configure leave parameters and workflow
 * Accessible by: HR Admin, System Admin
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './policies.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface LeaveType {
  _id: string;
  code: string;
  name: string;
}

interface Position {
  _id: string;
  title: string;
  code?: string;
  isActive?: boolean;
}

interface LeavePolicy {
  _id: string;
  leaveTypeId: LeaveType | string;
  accrualMethod: 'monthly' | 'yearly' | 'per-term';
  monthlyRate: number;
  yearlyRate: number;
  carryForwardAllowed: boolean;
  maxCarryForward: number;
  expiryAfterMonths?: number;
  roundingRule: 'none' | 'round' | 'round_up' | 'round_down';
  minNoticeDays: number;
  maxConsecutiveDays?: number;
  eligibility?: {
    minTenureMonths?: number;
    positionsAllowed?: string[];
    contractTypesAllowed?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  leaveTypeId: string;
  accrualMethod: string;
  monthlyRate: string;
  yearlyRate: string;
  carryForwardAllowed: boolean;
  maxCarryForward: string;
  expiryAfterMonths: string;
  roundingRule: string;
  minNoticeDays: string;
  maxConsecutiveDays: string;
  minTenureMonths: string;
  positionsAllowed: string[];
  contractTypesAllowed: string[];
}

const initialFormData: FormData = {
  leaveTypeId: '',
  accrualMethod: 'monthly',
  monthlyRate: '1.75',
  yearlyRate: '21',
  carryForwardAllowed: false,
  maxCarryForward: '5',
  expiryAfterMonths: '',
  roundingRule: 'none',
  minNoticeDays: '3',
  maxConsecutiveDays: '',
  minTenureMonths: '',
  positionsAllowed: [],
  contractTypesAllowed: [],
};

const contractTypeOptions = [
  { value: 'FULL_TIME_CONTRACT', label: 'Full-Time Contract' },
  { value: 'PART_TIME_CONTRACT', label: 'Part-Time Contract' },
];

const accrualMethods = [
  { value: 'monthly', label: 'Monthly Accrual', description: 'Days earned each month' },
  { value: 'yearly', label: 'Yearly Grant', description: 'Full balance at start of year' },
  { value: 'per-term', label: 'Per Term', description: 'Based on employment term' },
];

const roundingRules = [
  { value: 'none', label: 'No Rounding' },
  { value: 'round', label: 'Round to nearest' },
  { value: 'round_up', label: 'Always round up' },
  { value: 'round_down', label: 'Always round down' },
];

export default function LeavePoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [policiesRes, typesRes, positionsRes] = await Promise.all([
        axios.get('/leaves/policies'),
        axios.get('/leaves/types'),
        axios.get('/organization-structure/positions').catch(() => ({ data: [] })),
      ]);
      setPolicies(policiesRes.data);
      setLeaveTypes(typesRes.data);
      setPositions(positionsRes.data.filter((p: Position) => p.isActive !== false));
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (policy?: LeavePolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      const eligibility = policy.eligibility || {};
      setFormData({
        leaveTypeId: typeof policy.leaveTypeId === 'object' ? policy.leaveTypeId._id : policy.leaveTypeId,
        accrualMethod: policy.accrualMethod,
        monthlyRate: policy.monthlyRate.toString(),
        yearlyRate: policy.yearlyRate.toString(),
        carryForwardAllowed: policy.carryForwardAllowed,
        maxCarryForward: policy.maxCarryForward.toString(),
        expiryAfterMonths: policy.expiryAfterMonths?.toString() || '',
        roundingRule: policy.roundingRule,
        minNoticeDays: policy.minNoticeDays.toString(),
        maxConsecutiveDays: policy.maxConsecutiveDays?.toString() || '',
        minTenureMonths: eligibility.minTenureMonths?.toString() || '',
        positionsAllowed: eligibility.positionsAllowed || [],
        contractTypesAllowed: eligibility.contractTypesAllowed || [],
      });
    } else {
      setEditingPolicy(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPolicy(null);
    setFormData(initialFormData);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leaveTypeId) {
      setError('Leave Type is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const eligibility: any = {};
      if (formData.minTenureMonths) {
        eligibility.minTenureMonths = parseInt(formData.minTenureMonths);
      }
      if (formData.positionsAllowed.length > 0) {
        eligibility.positionsAllowed = formData.positionsAllowed;
      }
      if (formData.contractTypesAllowed.length > 0) {
        eligibility.contractTypesAllowed = formData.contractTypesAllowed;
      }

      const payload = {
        leaveTypeId: formData.leaveTypeId,
        accrualMethod: formData.accrualMethod,
        monthlyRate: parseFloat(formData.monthlyRate) || 0,
        yearlyRate: parseFloat(formData.yearlyRate) || 0,
        carryForwardAllowed: formData.carryForwardAllowed,
        maxCarryForward: parseInt(formData.maxCarryForward) || 0,
        expiryAfterMonths: formData.expiryAfterMonths ? parseInt(formData.expiryAfterMonths) : undefined,
        roundingRule: formData.roundingRule,
        minNoticeDays: parseInt(formData.minNoticeDays) || 0,
        maxConsecutiveDays: formData.maxConsecutiveDays ? parseInt(formData.maxConsecutiveDays) : undefined,
        eligibility: Object.keys(eligibility).length > 0 ? eligibility : undefined,
      };

      if (editingPolicy) {
        await axios.put(`/leaves/policies/${editingPolicy._id}`, payload);
        setSuccess('Policy updated successfully!');
      } else {
        await axios.post('/leaves/policies', payload);
        setSuccess('Policy created successfully!');
      }

      handleCloseModal();
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save policy:', err);
      setError(err.response?.data?.message || 'Failed to save policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (policyId: string) => {
    try {
      setSubmitting(true);
      await axios.delete(`/leaves/policies/${policyId}`);
      setSuccess('Policy deleted successfully!');
      setDeleteConfirm(null);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete policy:', err);
      setError(err.response?.data?.message || 'Failed to delete policy');
    } finally {
      setSubmitting(false);
    }
  };

  const getLeaveTypeName = (leaveTypeId: LeaveType | string): string => {
    if (typeof leaveTypeId === 'object' && leaveTypeId !== null) {
      return `${leaveTypeId.code} - ${leaveTypeId.name}`;
    }
    const type = leaveTypes.find(t => t._id === leaveTypeId);
    return type ? `${type.code} - ${type.name}` : 'Unknown';
  };

  const getAccrualLabel = (method: string): string => {
    return accrualMethods.find(m => m.value === method)?.label || method;
  };

  const getRoundingLabel = (rule: string): string => {
    return roundingRules.find(r => r.value === rule)?.label || rule;
  };

  // Get leave types that don't have policies yet
  const availableLeaveTypes = editingPolicy 
    ? leaveTypes 
    : leaveTypes.filter(type => {
        const hasPolicy = policies.some(p => {
          const pTypeId = typeof p.leaveTypeId === 'object' ? p.leaveTypeId._id : p.leaveTypeId;
          return pTypeId === type._id;
        });
        return !hasPolicy;
      });

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leave Policies" role="HR Admin">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>📜 Leave Policies</h1>
              <p className={styles.subtitle}>
                Configure accrual rates, carry-forward rules, and eligibility criteria
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                ← Back
              </button>
              <button 
                className={styles.addButton}
                onClick={() => handleOpenModal()}
                disabled={availableLeaveTypes.length === 0 && !editingPolicy}
              >
                + Add Policy
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {availableLeaveTypes.length === 0 && !editingPolicy && policies.length > 0 && (
            <div className={styles.infoMessage}>
              All leave types have policies configured. Create new leave types to add more policies.
            </div>
          )}

          {/* Policies Grid */}
          <div className={styles.cardsContainer}>
            {loading ? (
              <Spinner message="Loading policies..." />
            ) : policies.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📜</span>
                <h3>No Policies Configured</h3>
                <p>Create leave policies to define accrual rules and eligibility.</p>
                {leaveTypes.length === 0 ? (
                  <button 
                    className={styles.addButton}
                    onClick={() => router.push('/dashboard/hr/leaves/types')}
                  >
                    Create Leave Types First
                  </button>
                ) : (
                  <button 
                    className={styles.addButton}
                    onClick={() => handleOpenModal()}
                  >
                    + Add Policy
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.cardsGrid}>
                {policies.map((policy) => (
                  <div key={policy._id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardTitle}>{getLeaveTypeName(policy.leaveTypeId)}</h3>
                      <span className={styles.accrualBadge}>{getAccrualLabel(policy.accrualMethod)}</span>
                    </div>
                    
                    <div className={styles.cardSection}>
                      <h4>📊 Accrual Settings</h4>
                      <div className={styles.detailGrid}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Monthly Rate</span>
                          <span className={styles.detailValue}>{policy.monthlyRate} days</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Yearly Total</span>
                          <span className={styles.detailValue}>{policy.yearlyRate} days</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Rounding</span>
                          <span className={styles.detailValue}>{getRoundingLabel(policy.roundingRule)}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.cardSection}>
                      <h4>🔄 Carry Forward</h4>
                      <div className={styles.detailGrid}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Allowed</span>
                          <span className={`${styles.detailValue} ${policy.carryForwardAllowed ? styles.valueYes : styles.valueNo}`}>
                            {policy.carryForwardAllowed ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {policy.carryForwardAllowed && (
                          <>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Max Days</span>
                              <span className={styles.detailValue}>{policy.maxCarryForward}</span>
                            </div>
                            {policy.expiryAfterMonths && (
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Expires After</span>
                                <span className={styles.detailValue}>{policy.expiryAfterMonths} months</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardSection}>
                      <h4>⏱️ Request Rules</h4>
                      <div className={styles.detailGrid}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Min Notice</span>
                          <span className={styles.detailValue}>{policy.minNoticeDays} days</span>
                        </div>
                        {policy.maxConsecutiveDays && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Max Consecutive</span>
                            <span className={styles.detailValue}>{policy.maxConsecutiveDays} days</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {policy.eligibility && Object.keys(policy.eligibility).length > 0 && (
                      <div className={styles.cardSection}>
                        <h4>✅ Eligibility</h4>
                        <div className={styles.eligibilityTags}>
                          {policy.eligibility.minTenureMonths !== undefined && policy.eligibility.minTenureMonths > 0 && (
                            <span className={styles.eligibilityTag}>
                              Min {policy.eligibility.minTenureMonths}mo tenure
                            </span>
                          )}
                          {policy.eligibility.positionsAllowed?.map(posId => {
                            const pos = positions.find(p => p._id === posId);
                            return (
                              <span key={posId} className={styles.eligibilityTag}>
                                {pos?.title || posId}
                              </span>
                            );
                          })}
                          {policy.eligibility.contractTypesAllowed?.map(ct => {
                            const option = contractTypeOptions.find(o => o.value === ct);
                            return (
                              <span key={ct} className={styles.eligibilityTag}>
                                {option?.label || ct}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className={styles.cardActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleOpenModal(policy)}
                      >
                        ✏️ Edit
                      </button>
                      {deleteConfirm === policy._id ? (
                        <div className={styles.deleteConfirm}>
                          <button
                            className={styles.confirmDeleteButton}
                            onClick={() => handleDelete(policy._id)}
                            disabled={submitting}
                          >
                            ✓
                          </button>
                          <button
                            className={styles.cancelDeleteButton}
                            onClick={() => setDeleteConfirm(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          className={styles.deleteButton}
                          onClick={() => setDeleteConfirm(policy._id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal */}
          {showModal && (
            <div className={styles.modalOverlay} onClick={handleCloseModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>{editingPolicy ? 'Edit Policy' : 'Add New Policy'}</h2>
                  <button className={styles.closeButton} onClick={handleCloseModal}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                  {/* Leave Type Selection */}
                  <div className={styles.formGroup}>
                    <label htmlFor="leaveTypeId">Leave Type *</label>
                    <select
                      id="leaveTypeId"
                      value={formData.leaveTypeId}
                      onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                      required
                      disabled={!!editingPolicy}
                    >
                      <option value="">Select a leave type</option>
                      {(editingPolicy ? leaveTypes : availableLeaveTypes).map(type => (
                        <option key={type._id} value={type._id}>{type.code} - {type.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Accrual Settings */}
                  <div className={styles.formSection}>
                    <h3>📊 Accrual Settings</h3>
                    <div className={styles.formGroup}>
                      <label htmlFor="accrualMethod">Accrual Method *</label>
                      <select
                        id="accrualMethod"
                        value={formData.accrualMethod}
                        onChange={(e) => setFormData({ ...formData, accrualMethod: e.target.value })}
                        required
                      >
                        {accrualMethods.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label} - {method.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="monthlyRate">Monthly Rate (days)</label>
                        <input
                          type="number"
                          id="monthlyRate"
                          value={formData.monthlyRate}
                          onChange={(e) => setFormData({ ...formData, monthlyRate: e.target.value })}
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="yearlyRate">Yearly Total (days)</label>
                        <input
                          type="number"
                          id="yearlyRate"
                          value={formData.yearlyRate}
                          onChange={(e) => setFormData({ ...formData, yearlyRate: e.target.value })}
                          step="0.5"
                          min="0"
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="roundingRule">Rounding Rule</label>
                      <select
                        id="roundingRule"
                        value={formData.roundingRule}
                        onChange={(e) => setFormData({ ...formData, roundingRule: e.target.value })}
                      >
                        {roundingRules.map(rule => (
                          <option key={rule.value} value={rule.value}>{rule.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Carry Forward */}
                  <div className={styles.formSection}>
                    <h3>🔄 Carry Forward</h3>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.carryForwardAllowed}
                        onChange={(e) => setFormData({ ...formData, carryForwardAllowed: e.target.checked })}
                      />
                      <span>Allow Carry Forward</span>
                    </label>
                    {formData.carryForwardAllowed && (
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor="maxCarryForward">Max Days to Carry</label>
                          <input
                            type="number"
                            id="maxCarryForward"
                            value={formData.maxCarryForward}
                            onChange={(e) => setFormData({ ...formData, maxCarryForward: e.target.value })}
                            min="0"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label htmlFor="expiryAfterMonths">Expiry (months)</label>
                          <input
                            type="number"
                            id="expiryAfterMonths"
                            value={formData.expiryAfterMonths}
                            onChange={(e) => setFormData({ ...formData, expiryAfterMonths: e.target.value })}
                            placeholder="Optional"
                            min="1"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Request Rules */}
                  <div className={styles.formSection}>
                    <h3>⏱️ Request Rules</h3>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="minNoticeDays">Min Notice (days)</label>
                        <input
                          type="number"
                          id="minNoticeDays"
                          value={formData.minNoticeDays}
                          onChange={(e) => setFormData({ ...formData, minNoticeDays: e.target.value })}
                          min="0"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="maxConsecutiveDays">Max Consecutive Days</label>
                        <input
                          type="number"
                          id="maxConsecutiveDays"
                          value={formData.maxConsecutiveDays}
                          onChange={(e) => setFormData({ ...formData, maxConsecutiveDays: e.target.value })}
                          placeholder="Optional"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Eligibility */}
                  <div className={styles.formSection}>
                    <h3>✅ Eligibility (Optional)</h3>
                    <div className={styles.formGroup}>
                      <label htmlFor="minTenureMonths">Min Tenure (months)</label>
                      <input
                        type="number"
                        id="minTenureMonths"
                        value={formData.minTenureMonths}
                        onChange={(e) => setFormData({ ...formData, minTenureMonths: e.target.value })}
                        placeholder="e.g., 6"
                        min="0"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Positions Allowed</label>
                      <p className={styles.fieldHint}>Select which positions CAN apply. Leave all unchecked to allow everyone.</p>
                      <div className={styles.checkboxGrid}>
                        {(positions || []).map((pos) => (
                          <label key={pos._id} className={styles.checkboxItem}>
                            <input
                              type="checkbox"
                              checked={formData.positionsAllowed.includes(pos._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, positionsAllowed: [...formData.positionsAllowed, pos._id] });
                                } else {
                                  setFormData({ ...formData, positionsAllowed: formData.positionsAllowed.filter(id => id !== pos._id) });
                                }
                              }}
                            />
                            <span>{pos.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Contract Types Allowed</label>
                      <p className={styles.fieldHint}>Select which contract types CAN apply. Leave all unchecked to allow everyone.</p>
                      <div className={styles.checkboxGrid}>
                        {contractTypeOptions.map((ct) => (
                          <label key={ct.value} className={styles.checkboxItem}>
                            <input
                              type="checkbox"
                              checked={formData.contractTypesAllowed.includes(ct.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, contractTypesAllowed: [...formData.contractTypesAllowed, ct.value] });
                                } else {
                                  setFormData({ ...formData, contractTypesAllowed: formData.contractTypesAllowed.filter(v => v !== ct.value) });
                                }
                              }}
                            />
                            <span>{ct.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {error && <div className={styles.formError}>{error}</div>}
                  
                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={handleCloseModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
