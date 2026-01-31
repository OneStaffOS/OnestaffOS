/**
 * Entitlement Calculations Page
 * Update scheduling logic and balance computation rules
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
import styles from './entitlement-calc.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface LeaveType {
  _id: string;
  name: string;
  code: string;
}

interface Policy {
  _id: string;
  leaveTypeId: LeaveType | string;
  accrualMethod: string;
  monthlyRate?: number;
  yearlyRate?: number;
  carryForwardAllowed: boolean;
  maxCarryForward?: number;
  expiryAfterMonths?: number;
  roundingRule: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface EntitlementCalculation {
  employeeId: string;
  employee?: Employee;
  leaveTypeId: LeaveType | string;
  yearlyEntitlement: number;
  carryForward: number;
  taken: number;
  pending: number;
  remaining: number;
}

export default function EntitlementCalculationsPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [calculations, setCalculations] = useState<EntitlementCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [policiesRes, typesRes, employeesRes] = await Promise.all([
        axios.get('/leaves/policies').catch(() => ({ data: [] })),
        axios.get('/leaves/types').catch(() => ({ data: [] })),
        axios.get('/employee-profile').catch(() => ({ data: [] })),
      ]);

      setPolicies(policiesRes.data);
      setLeaveTypes(typesRes.data);
      setEmployees(employeesRes.data);
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

  const fetchEmployeeBalances = async (employeeId: string) => {
    try {
      setCalculating(true);
      setError('');
      const response = await axios.get(`/leaves/balances/employee/${employeeId}`);
      setCalculations(response.data);
    } catch (err: any) {
      console.error('Failed to fetch balances:', err);
      setError(err.response?.data?.message || 'Failed to fetch employee balances');
      setCalculations([]);
    } finally {
      setCalculating(false);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    if (employeeId) {
      fetchEmployeeBalances(employeeId);
    } else {
      setCalculations([]);
    }
  };

  const recalculateEntitlements = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee first');
      return;
    }

    try {
      setCalculating(true);
      setError('');
      // Re-fetch to get latest calculations
      await fetchEmployeeBalances(selectedEmployee);
      setSuccess('Entitlements recalculated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to recalculate entitlements');
    } finally {
      setCalculating(false);
    }
  };

  const getAccrualMethodLabel = (method: string) => {
    switch (method) {
      case 'monthly': return 'Monthly Accrual';
      case 'yearly': return 'Yearly Accrual';
      case 'per-term': return 'Per Term';
      default: return method;
    }
  };

  const getRoundingRuleLabel = (rule: string) => {
    switch (rule) {
      case 'none': return 'No Rounding';
      case 'round': return 'Round to Nearest';
      case 'round_up': return 'Round Up';
      case 'round_down': return 'Round Down';
      default: return rule;
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Entitlement Calculations" role="HR Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Entitlement Calculations</h1>
              <p className={styles.subtitle}>
                View and recalculate employee leave entitlements based on policies
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

          {/* Active Policies Overview */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Active Accrual Policies</h2>
            {loading ? (
              <Spinner message="Loading policies..." />
            ) : policies.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No policies configured yet.</p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => router.push('/dashboard/hr/leaves/policies')}
                >
                  Configure Policies
                </button>
              </div>
            ) : (
              <div className={styles.policiesGrid}>
                {policies.map((policy) => {
                  // Handle both populated object and string ID
                  const leaveType = typeof policy.leaveTypeId === 'object' 
                    ? policy.leaveTypeId 
                    : leaveTypes.find(t => t._id === policy.leaveTypeId);
                  return (
                    <div key={policy._id} className={styles.policyCard}>
                      <h3 className={styles.policyName}>
                        {leaveType?.name || 'Unknown Type'}
                      </h3>
                      <div className={styles.policyDetails}>
                        <div className={styles.policyRow}>
                          <span className={styles.policyLabel}>Accrual:</span>
                          <span>{getAccrualMethodLabel(policy.accrualMethod)}</span>
                        </div>
                        {policy.monthlyRate && (
                          <div className={styles.policyRow}>
                            <span className={styles.policyLabel}>Monthly Rate:</span>
                            <span>{policy.monthlyRate} days</span>
                          </div>
                        )}
                        {policy.yearlyRate && (
                          <div className={styles.policyRow}>
                            <span className={styles.policyLabel}>Yearly Rate:</span>
                            <span>{policy.yearlyRate} days</span>
                          </div>
                        )}
                        <div className={styles.policyRow}>
                          <span className={styles.policyLabel}>Rounding:</span>
                          <span>{getRoundingRuleLabel(policy.roundingRule)}</span>
                        </div>
                        <div className={styles.policyRow}>
                          <span className={styles.policyLabel}>Carry Forward:</span>
                          <span>{policy.carryForwardAllowed ? `Yes (max ${policy.maxCarryForward || 'unlimited'})` : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Employee Balance Calculator */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Employee Balance Calculator</h2>
            <div className={styles.calculatorForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Employee</label>
                <select
                  className={styles.select}
                  value={selectedEmployee}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <button
                className={styles.primaryButton}
                onClick={recalculateEntitlements}
                disabled={!selectedEmployee || calculating}
              >
                {calculating ? 'Calculating...' : 'Recalculate Entitlements'}
              </button>
            </div>

            {selectedEmployee && (
              <div className={styles.balancesTable}>
                {calculating ? (
                  <Spinner message="Calculating balances..." />
                ) : calculations.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No entitlements found for this employee.</p>
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Total Balance</th>
                        <th>Used</th>
                        <th>Pending</th>
                        <th>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculations.map((calc, index) => {
                        // Handle both populated object and string ID
                        const leaveType = typeof calc.leaveTypeId === 'object'
                          ? calc.leaveTypeId
                          : leaveTypes.find(t => t._id === calc.leaveTypeId);
                        const totalBalance = calc.yearlyEntitlement + (calc.carryForward || 0);
                        return (
                          <tr key={index}>
                            <td>{leaveType?.name || 'Unknown'}</td>
                            <td>{totalBalance}</td>
                            <td>{calc.taken || 0}</td>
                            <td>{calc.pending || 0}</td>
                            <td className={styles.available}>{calc.remaining || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Calculation Rules Info */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Calculation Rules</h2>
            <div className={styles.rulesGrid}>
              <div className={styles.ruleCard}>
                <h3>Monthly Accrual</h3>
                <p>Leave is accrued at the start of each month based on the monthly rate defined in the policy.</p>
              </div>
              <div className={styles.ruleCard}>
                <h3>Yearly Accrual</h3>
                <p>Full yearly entitlement is granted at the start of the leave year or on employee join date.</p>
              </div>
              <div className={styles.ruleCard}>
                <h3>Carry Forward</h3>
                <p>Unused leave can be carried forward to the next year up to the maximum limit defined.</p>
              </div>
              <div className={styles.ruleCard}>
                <h3>Pro-rata Calculation</h3>
                <p>New employees receive pro-rated entitlements based on their join date.</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}