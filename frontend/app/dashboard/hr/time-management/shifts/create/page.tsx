"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../time-management.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
const PUNCH_POLICIES = [
  'MULTIPLE',
  'FIRST_LAST',
  'ONLY_FIRST',
];

export default function CreateShiftPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [shiftTypes, setShiftTypes] = useState<any[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [punchPolicy, setPunchPolicy] = useState('FIRST_LAST');
  const [graceInMinutes, setGraceInMinutes] = useState<number>(0);
  const [graceOutMinutes, setGraceOutMinutes] = useState<number>(0);
  const [requiresApprovalForOvertime, setRequiresApprovalForOvertime] = useState(false);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadShiftTypes();
  }, []);

  async function loadShiftTypes() {
    setInitialLoading(true);
    try {
      const res = await axios.get('/time-management/shift-types');
      setShiftTypes(res.data || []);
      if (res.data && res.data.length > 0) setShiftType(res.data[0]._id);
    } catch (err: any) {
      console.error('Failed to load shift types', err);
      setError('Failed to load shift types');
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim()) return setError('Name is required');
    if (!shiftType) return setError('Shift type is required');

    setLoading(true);
    try {
      await axios.post('/time-management/shifts', {
        name: name.trim(),
        shiftType,
        startTime,
        endTime,
        punchPolicy,
        graceInMinutes,
        graceOutMinutes,
        requiresApprovalForOvertime,
        active,
      });
      setSuccess('Shift created successfully!');
      setTimeout(() => router.push('/dashboard/hr/time-management/shift-types'), 1000);
    } catch (err: any) {
      console.error('Create shift failed', err);
      setError(err?.response?.data?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Shift" role="Time Management">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>🕐 Create New Shift</h1>
              <p className={styles.pageSubtitle}>
                Define a new shift with timing and policy settings
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {initialLoading ? (
            <Spinner message="Loading shift types..." />
          ) : (
            <div className={styles.formCard}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Shift Name *</label>
                    <input 
                      className={styles.formInput} 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Morning Shift, Night Shift"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Shift Type *</label>
                    <select 
                      className={styles.formSelect} 
                      value={shiftType} 
                      onChange={(e) => setShiftType(e.target.value)}
                    >
                      <option value="">-- Select Type --</option>
                      {shiftTypes.map((st: any) => (
                        <option key={st._id} value={st._id}>
                          {st.name}{st.active ? '' : ' (inactive)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Start Time</label>
                    <input 
                      type="time" 
                      className={styles.formInput} 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)} 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>End Time</label>
                    <input 
                      type="time" 
                      className={styles.formInput} 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)} 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Punch Policy</label>
                    <select 
                      className={styles.formSelect} 
                      value={punchPolicy} 
                      onChange={(e) => setPunchPolicy(e.target.value)}
                    >
                      {PUNCH_POLICIES.map((p) => (
                        <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Grace In (minutes)</label>
                    <input 
                      type="number" 
                      className={styles.formInput} 
                      value={graceInMinutes} 
                      onChange={(e) => setGraceInMinutes(Number(e.target.value))}
                      min={0}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Grace Out (minutes)</label>
                    <input 
                      type="number" 
                      className={styles.formInput} 
                      value={graceOutMinutes} 
                      onChange={(e) => setGraceOutMinutes(Number(e.target.value))}
                      min={0}
                    />
                  </div>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={requiresApprovalForOvertime} 
                      onChange={(e) => setRequiresApprovalForOvertime(e.target.checked)} 
                    />
                    <span>Requires Approval For Overtime</span>
                  </label>

                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={active} 
                      onChange={(e) => setActive(e.target.checked)} 
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="submit" 
                    className={styles.btnPrimary} 
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : '✓ Create Shift'}
                  </button>
                  <button 
                    type="button" 
                    className={styles.btnSecondary} 
                    onClick={() => router.back()}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
