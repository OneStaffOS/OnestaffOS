"use client";

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../hr/time-management.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
type EscalationRule = {
  _id?: string;
  ruleType: 'LEAVE_REQUEST' | 'TIME_EXCEPTION' | 'ATTENDANCE_CORRECTION' | 'OVERTIME_REQUEST';
  hoursBeforePayrollCutoff: number;
  escalateToRoles: string[];
  notificationTemplate?: string;
  isActive: boolean;
};

export default function EscalationSettingsPage() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [payrollCutoffDay, setPayrollCutoffDay] = useState(25);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const ruleTypeOptions = [
    { value: 'LEAVE_REQUEST', label: 'Leave Request' },
    { value: 'TIME_EXCEPTION', label: 'Time Exception' },
    { value: 'ATTENDANCE_CORRECTION', label: 'Attendance Correction' },
    { value: 'OVERTIME_REQUEST', label: 'Overtime Request' },
  ];

  const roleOptions = [
    { value: 'HR_ADMIN', label: 'HR Admin' },
    { value: 'HR_MANAGER', label: 'HR Manager' },
    { value: 'PAYROLL_OFFICER', label: 'Payroll Officer' },
    { value: 'SYSTEM_ADMIN', label: 'System Admin' },
    { value: 'DEPARTMENT_MANAGER', label: 'Department Manager' },
  ];

  useEffect(() => {
    fetchRules();
    fetchSettings();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/time-management/escalation-rules');
      setRules(res.data || []);
    } catch (err) {
      console.error('Failed to load escalation rules', err);
      setMessage({ type: 'error', text: 'Failed to load escalation rules' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/time-management/settings');
      if (res.data?.payrollCutoffDay) {
        setPayrollCutoffDay(res.data.payrollCutoffDay);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    try {
      if (editingRule._id) {
        await axios.put(`/time-management/escalation-rules/${editingRule._id}`, editingRule);
        setMessage({ type: 'success', text: 'Escalation rule updated successfully' });
      } else {
        await axios.post('/time-management/escalation-rules', editingRule);
        setMessage({ type: 'success', text: 'Escalation rule created successfully' });
      }
      
      setEditingRule(null);
      setIsCreating(false);
      fetchRules();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save rule', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to save escalation rule' 
      });
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this escalation rule?')) return;

    try {
      await axios.delete(`/time-management/escalation-rules/${id}`);
      setMessage({ type: 'success', text: 'Escalation rule deleted successfully' });
      fetchRules();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete rule', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to delete escalation rule' 
      });
    }
  };

  const handleUpdatePayrollCutoff = async () => {
    try {
      setSettingsLoading(true);
      await axios.put('/time-management/settings', { payrollCutoffDay });
      setMessage({ type: 'success', text: 'Payroll cutoff day updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to update settings', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update payroll cutoff' 
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const startCreate = () => {
    setEditingRule({
      ruleType: 'TIME_EXCEPTION',
      hoursBeforePayrollCutoff: 48,
      escalateToRoles: ['HR_ADMIN'],
      isActive: true,
    });
    setIsCreating(true);
  };

  const startEdit = (rule: EscalationRule) => {
    setEditingRule({ ...rule });
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingRule(null);
    setIsCreating(false);
  };

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN]}>
      <DashboardLayout title="Escalation Settings" role="Admin">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Escalation Settings</h1>
              <p className={styles.pageSubtitle}>
                Configure automatic escalation rules for pending requests before payroll cutoff
              </p>
            </div>
            <button 
              className={styles.btnPrimary}
              onClick={startCreate}
              disabled={isCreating || editingRule !== null}
            >
              + New Escalation Rule
            </button>
          </div>

          {/* Messages */}
          {message && (
            <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
              {message.text}
            </div>
          )}

          {/* Payroll Cutoff Day Setting */}
          <div className={styles.card} style={{ marginBottom: '2rem' }}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}> Payroll Cutoff Day</h3>
            </div>
            <div className={styles.cardBody}>
              <p style={{ marginBottom: '1rem', color: '#6B7280' }}>
                Set the day of the month when payroll is processed. Escalation rules will trigger based on hours before this cutoff.
              </p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="number" min="1" max="31" value={payrollCutoffDay}
                  onChange={(e) => setPayrollCutoffDay(parseInt(e.target.value))}
                  className={styles.input}
                  style={{ width: '100px' }}
                />
                <button 
                  className={styles.btnPrimary}
                  onClick={handleUpdatePayrollCutoff}
                  disabled={settingsLoading}
                >
                  {settingsLoading ? 'Saving...' : 'Update Cutoff Day'}
                </button>
              </div>
            </div>
          </div>

          {/* Create/Edit Form */}
          {editingRule && (
            <div className={styles.card} style={{ marginBottom: '2rem', border: '2px solid #3B82F6' }}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  {isCreating ? 'Create New Rule' : 'Edit Rule'}
                </h3>
              </div>
              <div className={styles.cardBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Rule Type */}
                  <div>
                    <label className={styles.label}>Request Type</label>
                    <select
                      value={editingRule.ruleType}
                      onChange={(e) => setEditingRule({ ...editingRule, ruleType: e.target.value as any })}
                      className={styles.input}
                    >
                      {ruleTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Hours Before Cutoff */}
                  <div>
                    <label className={styles.label}>Hours Before Payroll Cutoff</label>
                    <input
                      type="number" min="1" value={editingRule.hoursBeforePayrollCutoff}
                      onChange={(e) => setEditingRule({ 
                        ...editingRule, 
                        hoursBeforePayrollCutoff: parseInt(e.target.value) 
                      })}
                      className={styles.input}
                    />
                  </div>

                  {/* Escalate To Roles */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.label}>Escalate To Roles</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {roleOptions.map((role) => (
                        <label key={role.value} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input
                            type="checkbox" checked={editingRule.escalateToRoles.includes(role.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingRule({
                                  ...editingRule,
                                  escalateToRoles: [...editingRule.escalateToRoles, role.value],
                                });
                              } else {
                                setEditingRule({
                                  ...editingRule,
                                  escalateToRoles: editingRule.escalateToRoles.filter((r) => r !== role.value),
                                });
                              }
                            }}
                          />
                          {role.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className={styles.label}>
                      <input
                        type="checkbox" checked={editingRule.isActive}
                        onChange={(e) => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className={styles.cardActions} style={{ marginTop: '1rem' }}>
                  <button className={styles.btnSuccess} onClick={handleSaveRule}>
                     Save Rule
                  </button>
                  <button className={styles.btnSecondary} onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{rules.length}</span>
              <span className={styles.statLabel}>Total Rules</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{rules.filter(r => r.isActive).length}</span>
              <span className={styles.statLabel}>Active Rules</span>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}></span>
              <h3>No Escalation Rules</h3>
              <p>Create your first escalation rule to automate request processing</p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {rules.map((rule) => (
                <div key={rule._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>
                        {ruleTypeOptions.find(opt => opt.value === rule.ruleType)?.label || rule.ruleType}
                      </h3>
                      <p className={styles.cardSubtitle}>
                        Escalates {rule.hoursBeforePayrollCutoff}h before cutoff
                      </p>
                    </div>
                    <span className={`${styles.badge} ${rule.isActive ? styles.badgeSuccess : styles.badgeDanger}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Escalate To:</span>
                      <span>{rule.escalateToRoles.join(', ')}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button 
                      className={`${styles.btnPrimary} ${styles.btnSmall}`}
                      onClick={() => startEdit(rule)}
                      disabled={editingRule !== null}
                    >
                       Edit
                    </button>
                    <button 
                      className={`${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => rule._id && handleDeleteRule(rule._id)}
                    >
                       Delete
                    </button>
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