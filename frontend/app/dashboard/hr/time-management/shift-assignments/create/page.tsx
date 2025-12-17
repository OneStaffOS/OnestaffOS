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
export default function CreateShiftAssignment() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  const [form, setForm] = useState<any>({ 
    employeeId: '', 
    departmentId: '', 
    positionId: '', 
    shiftId: '', 
    scheduleRuleId: '', 
    startDate: '', 
    endDate: '', 
    status: 'PENDING' 
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { loadOptions(); }, []);

  async function loadOptions() {
    setInitialLoading(true);
    try {
      const [empRes, deptRes, posRes, shiftRes] = await Promise.allSettled([
        axios.get('/employee-profile'),
        axios.get('/organization-structure/departments'),
        axios.get('/org-structure/positions').catch(()=>axios.get('/organization-structure/positions')),
        axios.get('/time-management/shifts'),
      ]);

      if (empRes.status === 'fulfilled') setEmployees(Array.isArray(empRes.value.data) ? empRes.value.data : []);
      if (deptRes.status === 'fulfilled') setDepartments(Array.isArray(deptRes.value.data) ? deptRes.value.data : []);
      if (posRes.status === 'fulfilled') setPositions(Array.isArray(posRes.value.data) ? posRes.value.data : []);
      if (shiftRes.status === 'fulfilled') setShifts(Array.isArray(shiftRes.value.data) ? shiftRes.value.data : []);
    } catch (e) {
      console.error('Failed to load options', e);
      setError('Failed to load options');
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!form.shiftId) { 
      setError('Please select a shift'); 
      return; 
    }
    if (!form.employeeId && !form.departmentId && !form.positionId) { 
      setError('Select at least one target (employee, department or position)'); 
      return; 
    }

    setLoading(true);
    try {
      const payload: any = {};
      if (form.employeeId) payload.employeeId = form.employeeId;
      if (form.departmentId) payload.departmentId = form.departmentId;
      if (form.positionId) payload.positionId = form.positionId;
      if (form.shiftId) payload.shiftId = form.shiftId;
      if (form.scheduleRuleId) payload.scheduleRuleId = form.scheduleRuleId;
      if (form.startDate) payload.startDate = new Date(form.startDate);
      if (form.endDate) payload.endDate = form.endDate ? new Date(form.endDate) : undefined;
      if (form.status) payload.status = form.status;

      await axios.post('/time-management/shift-assignments', payload);
      setSuccess('Assignment created successfully!');
      setTimeout(() => router.push('/dashboard/hr/time-management/shift-assignments'), 1000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create assignment');
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Shift Assignment" role="Time Management">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>📋 Create Shift Assignment</h1>
              <p className={styles.pageSubtitle}>
                Assign a shift to an employee, department, or position
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {initialLoading ? (
            <Spinner message="Loading options..." />
          ) : (
            <div className={styles.formCard}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Shift *</label>
                    <select 
                      className={styles.formSelect} 
                      value={form.shiftId} 
                      onChange={(e)=>setForm({...form, shiftId: e.target.value})}
                    >
                      <option value="">-- Select Shift --</option>
                      {(shifts || []).map((s: any)=> (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.startTime} - {s.endTime})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Employee (optional)</label>
                    <select 
                      className={styles.formSelect} 
                      value={form.employeeId} 
                      onChange={(e)=>setForm({...form, employeeId: e.target.value})}
                    >
                      <option value="">-- Select Employee --</option>
                      {(employees || []).map((emp: any)=> (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department (optional)</label>
                    <select 
                      className={styles.formSelect} 
                      value={form.departmentId} 
                      onChange={(e)=>setForm({...form, departmentId: e.target.value})}
                    >
                      <option value="">-- Select Department --</option>
                      {(departments || []).map((d: any)=> (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Position (optional)</label>
                    <select 
                      className={styles.formSelect} 
                      value={form.positionId} 
                      onChange={(e)=>setForm({...form, positionId: e.target.value})}
                    >
                      <option value="">-- Select Position --</option>
                      {(positions || []).map((p: any)=> (
                        <option key={p._id} value={p._id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Start Date</label>
                    <input 
                      className={styles.formInput} 
                      type="date" 
                      value={form.startDate} 
                      onChange={(e)=>setForm({...form, startDate: e.target.value})} 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>End Date (optional)</label>
                    <input 
                      className={styles.formInput} 
                      type="date" 
                      value={form.endDate} 
                      onChange={(e)=>setForm({...form, endDate: e.target.value})} 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Status</label>
                    <select 
                      className={styles.formSelect} 
                      value={form.status} 
                      onChange={(e)=>setForm({...form, status: e.target.value})}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    className={styles.btnPrimary} 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : '✓ Create Assignment'}
                  </button>
                  <button 
                    type="button" 
                    className={styles.btnSecondary} 
                    onClick={() => router.push('/dashboard/hr/time-management/shift-assignments')}
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
