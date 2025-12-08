/**
 * Eligibility Rules Page
 * Set minimum tenure, employee type, position-based rules
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
import styles from './eligibility.module.css';

interface LeaveType {
  _id: string;
  name: string;
  code: string;
  minTenureMonths?: number;
}

interface Policy {
  _id: string;
  leaveTypeId: LeaveType | string;
  eligibility?: {
    minTenureMonths?: number;
    positionsAllowed?: string[];
    contractTypesAllowed?: string[];
  };
}

interface EligibilityRule {
  leaveTypeId: string;
  leaveTypeName: string;
  minTenureMonths: number;
  positionsAllowed: string[];
  contractTypesAllowed: string[];
}

interface Position {
  _id: string;
  title: string;
  code?: string;
  isActive?: boolean;
}

export default function EligibilityRulesPage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rules, setRules] = useState<EligibilityRule[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<EligibilityRule | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    minTenureMonths: 0,
    positionsAllowed: [] as string[],
    contractTypesAllowed: [] as string[],
  });

  // Contract types from backend enum
  const contractTypeOptions = [
    { value: 'FULL_TIME_CONTRACT', label: 'Full-Time Contract' },
    { value: 'PART_TIME_CONTRACT', label: 'Part-Time Contract' },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [typesRes, policiesRes, positionsRes] = await Promise.all([
        axios.get('/leaves/types').catch(() => ({ data: [] })),
        axios.get('/leaves/policies').catch(() => ({ data: [] })),
        axios.get('/organization-structure/positions').catch(() => ({ data: [] })),
      ]);

      setLeaveTypes(typesRes.data);
      setPolicies(policiesRes.data);
      setPositions(positionsRes.data.filter((p: Position) => p.isActive !== false));

      // Build eligibility rules from policies
      const eligibilityRules: EligibilityRule[] = policiesRes.data.map((policy: Policy) => {
        // Handle both populated object and string ID
        const leaveTypeId = typeof policy.leaveTypeId === 'object' 
          ? policy.leaveTypeId._id 
          : policy.leaveTypeId;
        const leaveType = typeof policy.leaveTypeId === 'object'
          ? policy.leaveTypeId
          : typesRes.data.find((t: LeaveType) => t._id === policy.leaveTypeId);
        return {
          leaveTypeId: leaveTypeId,
          leaveTypeName: leaveType?.name || 'Unknown',
          minTenureMonths: policy.eligibility?.minTenureMonths || leaveType?.minTenureMonths || 0,
          positionsAllowed: policy.eligibility?.positionsAllowed || [],
          contractTypesAllowed: policy.eligibility?.contractTypesAllowed || [],
        };
      });

      setRules(eligibilityRules);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load eligibility rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (rule?: EligibilityRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        leaveTypeId: rule.leaveTypeId,
        minTenureMonths: rule.minTenureMonths,
        positionsAllowed: rule.positionsAllowed,
        contractTypesAllowed: rule.contractTypesAllowed,
      });
    } else {
      setEditingRule(null);
      setFormData({
        leaveTypeId: '',
        minTenureMonths: 0,
        positionsAllowed: [],
        contractTypesAllowed: [],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRule(null);
    setError('');
  };

  const handleArrayToggle = (field: 'positionsAllowed' | 'contractTypesAllowed', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leaveTypeId) {
      setError('Please select a leave type');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Find the policy for this leave type and update it
      const policy = policies.find(p => {
        const policyLeaveTypeId = typeof p.leaveTypeId === 'object' ? p.leaveTypeId._id : p.leaveTypeId;
        return policyLeaveTypeId === formData.leaveTypeId;
      });
      
      if (policy) {
        await axios.put(`/leaves/policies/${policy._id}`, {
          eligibility: {
            minTenureMonths: formData.minTenureMonths,
            positionsAllowed: formData.positionsAllowed,
            contractTypesAllowed: formData.contractTypesAllowed,
          },
        });
      }

      setSuccess('Eligibility rules updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      closeModal();
      fetchData();
    } catch (err: any) {
      console.error('Failed to save eligibility rules:', err);
      setError(err.response?.data?.message || 'Failed to save eligibility rules');
    } finally {
      setSubmitting(false);
    }
  };

  const getLeaveTypesWithoutRules = () => {
    const rulesLeaveTypeIds = rules.map(r => r.leaveTypeId);
    return leaveTypes.filter(t => !rulesLeaveTypeIds.includes(t._id));
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Eligibility Rules" role="HR Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Eligibility Rules</h1>
              <p className={styles.subtitle}>
                Configure who can apply for each type of leave
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                Back to Leave Management
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {/* Rules Overview */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Configured Eligibility Rules</h2>
            </div>

            {loading ? (
              <Spinner message="Loading eligibility rules..." />
            ) : rules.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No eligibility rules configured yet.</p>
                <p className={styles.emptyHint}>
                  Eligibility rules are configured through leave policies.
                </p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => router.push('/dashboard/hr/leaves/policies')}
                >
                  Configure Policies
                </button>
              </div>
            ) : (
              <div className={styles.rulesGrid}>
                {rules.map((rule) => (
                  <div key={rule.leaveTypeId} className={styles.ruleCard}>
                    <div className={styles.ruleHeader}>
                      <h3 className={styles.ruleName}>{rule.leaveTypeName}</h3>
                      <button
                        className={styles.editButton}
                        onClick={() => openModal(rule)}
                      >
                        Edit
                      </button>
                    </div>
                    <div className={styles.ruleDetails}>
                      <div className={styles.ruleRow}>
                        <span className={styles.ruleLabel}>Min Tenure:</span>
                        <span>{rule.minTenureMonths} months</span>
                      </div>
                      <div className={styles.ruleRow}>
                        <span className={styles.ruleLabel}>Contract Types:</span>
                        <span>
                          {rule.contractTypesAllowed.length > 0 
                            ? rule.contractTypesAllowed.map(ct => 
                                contractTypeOptions.find(o => o.value === ct)?.label || ct
                              ).join(', ') 
                            : 'All'}
                        </span>
                      </div>
                      <div className={styles.ruleRow}>
                        <span className={styles.ruleLabel}>Positions:</span>
                        <span>
                          {rule.positionsAllowed.length > 0 
                            ? rule.positionsAllowed.map(posId => 
                                positions.find(p => p._id === posId)?.title || posId
                              ).join(', ') 
                            : 'All'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>How Eligibility Works</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <h3>Minimum Tenure</h3>
                <p>Employee must have worked for at least this many months to be eligible for this leave type.</p>
              </div>
              <div className={styles.infoCard}>
                <h3>Contract Types</h3>
                <p>Restrict leave to specific contract types (Full-Time, Part-Time).</p>
              </div>
              <div className={styles.infoCard}>
                <h3>Positions</h3>
                <p>Control which job positions/levels can apply for this leave type.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Edit Eligibility Rules</h2>
                <button className={styles.closeButton} onClick={closeModal}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Leave Type</label>
                    <select
                      className={styles.select}
                      value={formData.leaveTypeId}
                      onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                      disabled={!!editingRule}
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map((type) => (
                        <option key={type._id} value={type._id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Minimum Tenure (months)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={formData.minTenureMonths}
                      onChange={(e) => setFormData({ ...formData, minTenureMonths: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                    <span className={styles.hint}>Set to 0 to allow all employees regardless of tenure</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Contract Types</label>
                    <span className={styles.hint}>Select which contract types CAN apply for this leave. Leave all unchecked to allow everyone.</span>
                    <div className={styles.checkboxGroup}>
                      {contractTypeOptions.map((type) => (
                        <label key={type.value} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={formData.contractTypesAllowed.includes(type.value)}
                            onChange={() => handleArrayToggle('contractTypesAllowed', type.value)}
                          />
                          {type.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Positions</label>
                    <span className={styles.hint}>Select which positions CAN apply for this leave. Leave all unchecked to allow all positions.</span>
                    <div className={styles.checkboxGroup}>
                      {positions.map((pos) => (
                        <label key={pos._id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={formData.positionsAllowed.includes(pos._id)}
                            onChange={() => handleArrayToggle('positionsAllowed', pos._id)}
                          />
                          {pos.title}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Rules'}
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
