/**
 * Personalized Entitlements Page
 * Assign individual employee or group entitlement packages
 * Accessible by: HR Admin, System Admin
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './entitlements.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department?: string;
  position?: string;
}

interface LeaveType {
  _id: string;
  name: string;
  code: string;
}

interface Position {
  _id: string;
  title: string;
  isActive?: boolean;
}

interface LeavePolicy {
  _id: string;
  leaveTypeId: LeaveType | string;
  yearlyRate: number;
  accrualMethod: string;
  eligibility?: {
    minTenureMonths?: number;
    positionsAllowed?: string[];
    contractTypesAllowed?: string[];
  };
}

interface Entitlement {
  _id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  carryForwardDays: number;
}

const contractTypeOptions = [
  { value: 'FULL_TIME_CONTRACT', label: 'Full Time' },
  { value: 'PART_TIME_CONTRACT', label: 'Part Time' },
];

export default function EntitlementsPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [employeeEntitlements, setEmployeeEntitlements] = useState<any[]>([]);

  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    employeeId: '',
    leaveTypeId: '',
    year: currentYear,
    totalDays: '',
    carryForwardDays: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [employeesRes, typesRes, policiesRes, positionsRes] = await Promise.all([
        axios.get('/employee-profile').catch(() => ({ data: [] })),
        axios.get('/leaves/types').catch(() => ({ data: [] })),
        axios.get('/leaves/policies').catch(() => ({ data: [] })),
        axios.get('/organization-structure/positions').catch(() => ({ data: [] })),
      ]);

      setEmployees(employeesRes.data);
      setLeaveTypes(typesRes.data);
      setPolicies(policiesRes.data);
      setPositions(positionsRes.data.filter((p: Position) => p.isActive !== false));
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchEmployeeEntitlements = async (employeeId: string) => {
    try {
      const response = await axios.get(`/leaves/balances/employee/${employeeId}`);
      setEmployeeEntitlements(response.data);
    } catch (err) {
      console.error('Failed to fetch employee entitlements:', err);
      setEmployeeEntitlements([]);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    if (employeeId) {
      fetchEmployeeEntitlements(employeeId);
    } else {
      setEmployeeEntitlements([]);
    }
  };

  const openModal = () => {
    setFormData({
      employeeId: selectedEmployee || '',
      leaveTypeId: '',
      year: currentYear,
      totalDays: '',
      carryForwardDays: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.leaveTypeId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await axios.post('/leaves/entitlements', {
        employeeId: formData.employeeId,
        leaveTypeId: formData.leaveTypeId,
        yearlyEntitlement: parseFloat(formData.totalDays) || 0,
        carryForward: parseFloat(formData.carryForwardDays) || 0,
      });

      setSuccess('Entitlement assigned successfully');
      setTimeout(() => setSuccess(''), 3000);
      closeModal();
      
      if (selectedEmployee) {
        fetchEmployeeEntitlements(selectedEmployee);
      }
    } catch (err: any) {
      console.error('Failed to assign entitlement:', err);
      setError(err.response?.data?.message || 'Failed to assign entitlement');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedEmployee = () => {
    return employees.find(e => e._id === selectedEmployee);
  };

  const getLeaveTypeName = (leaveTypeId: LeaveType | string): string => {
    if (typeof leaveTypeId === 'object' && leaveTypeId !== null) {
      return `${leaveTypeId.code} - ${leaveTypeId.name}`;
    }
    const type = leaveTypes.find(t => t._id === leaveTypeId);
    return type ? `${type.code} - ${type.name}` : 'Unknown';
  };

  const getPositionName = (positionId: string): string => {
    const pos = positions.find(p => p._id === positionId);
    return pos?.title || positionId;
  };

  const getContractTypeLabel = (value: string): string => {
    const opt = contractTypeOptions.find(o => o.value === value);
    return opt?.label || value;
  };

  const handleBulkAssign = async (
    policyId: string,
    filterType: 'all' | 'position' | 'contractType',
    filterValue?: string
  ) => {
    const policy = policies.find(p => p._id === policyId);
    const leaveTypeName = policy ? getLeaveTypeName(policy.leaveTypeId) : 'Unknown';
    
    let confirmMessage = `Assign "${leaveTypeName}" entitlements to `;
    if (filterType === 'all') {
      confirmMessage += 'ALL employees';
    } else if (filterType === 'position' && filterValue) {
      confirmMessage += `employees with position: ${getPositionName(filterValue)}`;
    } else if (filterType === 'contractType' && filterValue) {
      confirmMessage += `employees with contract type: ${getContractTypeLabel(filterValue)}`;
    }
    confirmMessage += '?';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setBulkAssigning(policyId);
      setError('');
      
      const payload: any = { policyId };
      if (filterType === 'position' && filterValue) {
        payload.positionId = filterValue;
      } else if (filterType === 'contractType' && filterValue) {
        payload.contractType = filterValue;
      }

      const response = await axios.post('/leaves/entitlements/bulk-assign', payload);
      
      const { created, skipped, errors } = response.data;
      let message = `Assignment complete: ${created} created, ${skipped} skipped/updated`;
      if (errors && errors.length > 0) {
        message += `. ${errors.length} errors occurred.`;
      }
      
      setSuccess(message);
      setTimeout(() => setSuccess(''), 5000);
      
      if (selectedEmployee) {
        fetchEmployeeEntitlements(selectedEmployee);
      }
    } catch (err: any) {
      console.error('Failed to bulk assign entitlements:', err);
      setError(err.response?.data?.message || 'Failed to assign entitlements');
    } finally {
      setBulkAssigning(null);
    }
  };

  const handleAssignAllPolicies = async () => {
    if (!confirm('This will assign ALL policy entitlements to ALL employees. Continue?')) {
      return;
    }

    try {
      setBulkAssigning('all');
      setError('');
      
      const response = await axios.post('/leaves/entitlements/bulk-assign', {});
      
      const { created, skipped, errors } = response.data;
      let message = `Bulk assignment complete: ${created} created, ${skipped} skipped/updated`;
      if (errors && errors.length > 0) {
        message += `. ${errors.length} errors occurred.`;
      }
      
      setSuccess(message);
      setTimeout(() => setSuccess(''), 5000);
      
      if (selectedEmployee) {
        fetchEmployeeEntitlements(selectedEmployee);
      }
    } catch (err: any) {
      console.error('Failed to bulk assign entitlements:', err);
      setError(err.response?.data?.message || 'Failed to bulk assign entitlements');
    } finally {
      setBulkAssigning(null);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Entitlements" role="HR Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Personalized Entitlements</h1>
              <p className={styles.subtitle}>
                Assign and manage individual employee leave entitlements
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                Back to Leave Management
              </button>
              <button 
                className={styles.primaryButton}
                onClick={openModal}
              >
                Assign Entitlement
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {/* Employee Selector */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Select Employee</h2>
            <div className={styles.selectorRow}>
              <select
                className={styles.select}
                value={selectedEmployee}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Employee Entitlements */}
          {selectedEmployee && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  Entitlements for {getSelectedEmployee()?.firstName} {getSelectedEmployee()?.lastName}
                </h2>
                <span className={styles.yearBadge}>{currentYear}</span>
              </div>

              {employeeEntitlements.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No entitlements found for this employee.</p>
                  <button 
                    className={styles.primaryButton}
                    onClick={openModal}
                  >
                    Assign First Entitlement
                  </button>
                </div>
              ) : (
                <div className={styles.entitlementsGrid}>
                  {employeeEntitlements.map((ent, index) => {
                    const leaveType = typeof ent.leaveTypeId === 'object' 
                      ? ent.leaveTypeId 
                      : leaveTypes.find(t => t._id === ent.leaveTypeId);
                    return (
                      <div key={index} className={styles.entitlementCard}>
                        <h3 className={styles.entitlementName}>
                          {leaveType?.name || 'Unknown Type'}
                        </h3>
                        <div className={styles.entitlementStats}>
                          <div className={styles.stat}>
                            <span className={styles.statValue}>{ent.yearlyEntitlement + (ent.carryForward || 0)}</span>
                            <span className={styles.statLabel}>Total</span>
                          </div>
                          <div className={styles.stat}>
                            <span className={styles.statValue}>{ent.taken || 0}</span>
                            <span className={styles.statLabel}>Used</span>
                          </div>
                          <div className={styles.stat}>
                            <span className={styles.statValue}>{ent.pending || 0}</span>
                            <span className={styles.statLabel}>Pending</span>
                          </div>
                          <div className={styles.stat}>
                            <span className={`${styles.statValue} ${styles.available}`}>
                              {ent.remaining || 0}
                            </span>
                            <span className={styles.statLabel}>Available</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bulk Assignment Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Bulk Assignment</h2>
              <button 
                className={styles.secondaryButton}
                onClick={() => router.push('/dashboard/hr/leaves/policies')}
              >
                Configure Policies
              </button>
            </div>

            {policies.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No policies configured yet. Create policies first to assign entitlements.</p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => router.push('/dashboard/hr/leaves/policies')}
                >
                  Create Policy
                </button>
              </div>
            ) : (
              <>

                {/* Policy Cards */}
                <div className={styles.policiesGrid}>
                  {policies.map((policy) => {
                    const leaveTypeName = getLeaveTypeName(policy.leaveTypeId);
                    const hasPositionRules = policy.eligibility?.positionsAllowed && policy.eligibility.positionsAllowed.length > 0;
                    const hasContractRules = policy.eligibility?.contractTypesAllowed && policy.eligibility.contractTypesAllowed.length > 0;
                    
                    return (
                      <div key={policy._id} className={styles.policyCard}>
                        <div className={styles.policyHeader}>
                          <h3 className={styles.policyName}>{leaveTypeName}</h3>
                          <span className={styles.policyRate}>{policy.yearlyRate} days/year</span>
                        </div>
                        
                        {/* Eligibility Info */}
                        {(hasPositionRules || hasContractRules) && (
                          <div className={styles.eligibilityInfo}>
                            {hasPositionRules && (
                              <div className={styles.eligibilityRow}>
                                <span className={styles.eligibilityLabel}>Positions:</span>
                                <span className={styles.eligibilityValue}>
                                  {policy.eligibility!.positionsAllowed!.map(p => getPositionName(p)).join(', ')}
                                </span>
                              </div>
                            )}
                            {hasContractRules && (
                              <div className={styles.eligibilityRow}>
                                <span className={styles.eligibilityLabel}>Contract Types:</span>
                                <span className={styles.eligibilityValue}>
                                  {policy.eligibility!.contractTypesAllowed!.map(c => getContractTypeLabel(c)).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Assignment Options */}
                        <div className={styles.assignmentOptions}>
                          <button
                            className={styles.assignButton}
                            onClick={() => handleBulkAssign(policy._id, 'all')}
                            disabled={!!bulkAssigning}
                          >
                            {bulkAssigning === policy._id ? 'Assigning...' : 'Assign to All'}
                          </button>

                          {/* Position Dropdown */}
                          <div className={styles.filterDropdown}>
                            <select
                              className={styles.filterSelect}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleBulkAssign(policy._id, 'position', e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              disabled={!!bulkAssigning}
                            >
                              <option value="">By Position...</option>
                              {(positions || []).map((pos) => (
                                <option key={pos._id} value={pos._id}>
                                  {pos.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Contract Type Dropdown */}
                          <div className={styles.filterDropdown}>
                            <select
                              className={styles.filterSelect}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleBulkAssign(policy._id, 'contractType', e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              disabled={!!bulkAssigning}
                            >
                              <option value="">By Contract...</option>
                              {contractTypeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Assignment Modal */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Assign Entitlement</h2>
                <button className={styles.closeButton} onClick={closeModal}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Employee *</label>
                    <select
                      className={styles.selectInput}
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Leave Type *</label>
                    <select
                      className={styles.selectInput}
                      value={formData.leaveTypeId}
                      onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                      required
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map((type) => (
                        <option key={type._id} value={type._id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Year</label>
                      <input
                        type="number" className={styles.input}
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        min={currentYear - 1}
                        max={currentYear + 1}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Total Days</label>
                      <input
                        type="number" className={styles.input}
                        value={formData.totalDays}
                        onChange={(e) => setFormData({ ...formData, totalDays: e.target.value })}
                        min="0" step="0.5" placeholder="Enter total days"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Carry Forward Days</label>
                    <input
                      type="number" className={styles.input}
                      value={formData.carryForwardDays}
                      onChange={(e) => setFormData({ ...formData, carryForwardDays: e.target.value })}
                      min="0" step="0.5" placeholder="Enter carry forward days"
                    />
                    <p className={styles.hint}>Days carried over from previous year</p>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton} disabled={submitting}>
                    {submitting ? 'Assigning...' : 'Assign Entitlement'}
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