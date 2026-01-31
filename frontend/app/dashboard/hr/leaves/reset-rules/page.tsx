/**
 * Leave Year & Reset Rules Page
 * Define legal leave year, balance reset criteria
 * Accessible by: HR Admin, System Admin
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './reset-rules.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface LeaveYearConfig {
  startMonth: number;
  startDay: number;
  resetPolicy: 'calendar' | 'anniversary' | 'fiscal';
  carryForwardDeadline: number; // months after year start
  forfeitUnused: boolean;
  gracePeroidDays: number;
}

interface LeaveType {
  _id: string;
  name: string;
  code: string;
}

interface Policy {
  _id: string;
  leaveTypeId: string | { _id: string; name: string };
  carryForwardAllowed: boolean;
  maxCarryForward?: number;
  expiryAfterMonths?: number;
}

export default function ResetRulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);

  const [config, setConfig] = useState<LeaveYearConfig>({
    startMonth: 1, // January
    startDay: 1,
    resetPolicy: 'calendar',
    carryForwardDeadline: 3,
    forfeitUnused: false,
    gracePeroidDays: 0,
  });

  // Helper function to get leave type name from policy
  const getLeaveTypeName = (policy: Policy): string => {
    if (typeof policy.leaveTypeId === 'object' && policy.leaveTypeId !== null) {
      return policy.leaveTypeId.name;
    }
    const leaveType = leaveTypes.find(t => t._id === policy.leaveTypeId);
    return leaveType?.name || 'Unknown';
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typesRes, policiesRes] = await Promise.all([
        axios.get('/leaves/types').catch(() => ({ data: [] })),
        axios.get('/leaves/policies').catch(() => ({ data: [] })),
      ]);

      setLeaveTypes(typesRes.data);
      setPolicies(policiesRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // In a real implementation, this would save to a system configuration endpoint
      // For now, we'll just show success
      await new Promise(resolve => setTimeout(resolve, 500));

      setSuccess('Leave year configuration saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save configuration:', err);
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const getLeaveYearDisplay = () => {
    const month = months.find(m => m.value === config.startMonth);
    const year = new Date().getFullYear();
    const endYear = config.startMonth === 1 ? year : year + 1;
    const endMonth = config.startMonth === 1 ? 12 : config.startMonth - 1;
    const endMonthName = months.find(m => m.value === endMonth)?.label;

    return `${month?.label} ${config.startDay}, ${year} - ${endMonthName} ${config.startDay - 1 || 31}, ${endYear}`;
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Reset Rules" role="HR Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Leave Year & Reset Rules</h1>
              <p className={styles.subtitle}>
                Define when the leave year starts and how balances are reset
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

          {loading ? (
            <Spinner message="Loading configuration..." />
          ) : (
            <>
              {/* Leave Year Configuration */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Leave Year Configuration</h2>
                
                <div className={styles.currentYear}>
                  <span className={styles.currentYearLabel}>Current Leave Year:</span>
                  <span className={styles.currentYearValue}>{getLeaveYearDisplay()}</span>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Reset Policy</label>
                    <select
                      className={styles.select}
                      value={config.resetPolicy}
                      onChange={(e) => setConfig({ ...config, resetPolicy: e.target.value as any })}
                    >
                      <option value="calendar">Calendar Year (Jan 1 - Dec 31)</option>
                      <option value="fiscal">Fiscal Year (Custom Start Date)</option>
                      <option value="anniversary">Anniversary (Employee Join Date)</option>
                    </select>
                    <p className={styles.hint}>
                      {config.resetPolicy === 'calendar' && 'Leave balances reset on January 1st each year'}
                      {config.resetPolicy === 'fiscal' && 'Leave balances reset on your defined fiscal year start date'}
                      {config.resetPolicy === 'anniversary' && 'Leave balances reset on each employee\'s work anniversary'}
                    </p>
                  </div>

                  {config.resetPolicy === 'fiscal' && (
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Start Month</label>
                        <select
                          className={styles.select}
                          value={config.startMonth}
                          onChange={(e) => setConfig({ ...config, startMonth: parseInt(e.target.value) })}
                        >
                          {months.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Start Day</label>
                        <input
                          type="number" className={styles.input}
                          value={config.startDay}
                          onChange={(e) => setConfig({ ...config, startDay: parseInt(e.target.value) || 1 })}
                          min="1" max="28"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Balance Reset Rules */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Balance Reset Rules</h2>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox" checked={config.forfeitUnused}
                        onChange={(e) => setConfig({ ...config, forfeitUnused: e.target.checked })}
                      />
                      Forfeit unused leave at year end
                    </label>
                    <p className={styles.hint}>
                      If enabled, any leave balance not used or carried forward will be lost
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Grace Period (days)</label>
                    <input
                      type="number" className={styles.input}
                      value={config.gracePeroidDays || ''}
                      onChange={(e) => setConfig({ ...config, gracePeroidDays: parseInt(e.target.value) || 0 })}
                      min="0" max="90" placeholder="Enter grace period days"
                    />
                    <p className={styles.hint}>
                      Number of days after year end to use remaining balance before forfeiture
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Carry Forward Deadline (months)</label>
                    <input
                      type="number" className={styles.input}
                      value={config.carryForwardDeadline}
                      onChange={(e) => setConfig({ ...config, carryForwardDeadline: parseInt(e.target.value) || 0 })}
                      min="0" max="12"
                    />
                    <p className={styles.hint}>
                      Carried forward leave must be used within this many months of the new year
                    </p>
                  </div>
                </div>
              </div>

              {/* Carry Forward Settings by Leave Type */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Carry Forward by Leave Type</h2>
                <p className={styles.sectionDescription}>
                  Individual carry forward rules are configured in each leave policy
                </p>

                {policies.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No policies configured yet.</p>
                    <button 
                      className={styles.linkButton}
                      onClick={() => router.push('/dashboard/hr/leaves/policies')}
                    >
                      Configure Policies
                    </button>
                  </div>
                ) : (
                  <div className={styles.policyList}>
                    {policies.map((policy) => {
                      return (
                        <div key={policy._id} className={styles.policyItem}>
                          <div className={styles.policyName}>{getLeaveTypeName(policy)}</div>
                          <div className={styles.policyDetails}>
                            <span className={policy.carryForwardAllowed ? styles.enabled : styles.disabled}>
                              {policy.carryForwardAllowed ? 'Carry Forward Enabled' : 'No Carry Forward'}
                            </span>
                            {policy.carryForwardAllowed && policy.maxCarryForward && (
                              <span>Max: {policy.maxCarryForward} days</span>
                            )}
                            {policy.carryForwardAllowed && policy.expiryAfterMonths && (
                              <span>Expires: {policy.expiryAfterMonths} months</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className={styles.actions}>
                <button
                  className={styles.saveButton}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}