"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../execution.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function CreatePayrollRunPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    entity: 'OneStaff Organization',
    payrollPeriod: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate payroll period
      if (!formData.payrollPeriod) {
        setError('Please select a payroll period');
        setLoading(false);
        return;
      }

      // Create payroll run
      const response = await axios.post('/payroll-execution/runs', {
        entity: formData.entity,
        payrollPeriod: formData.payrollPeriod,
        notes: formData.notes,
      });

      setSuccess('Payroll run created successfully! Redirecting...');
      
      // Redirect to the newly created run's detail page
      setTimeout(() => {
        router.push(`/dashboard/payroll/execution/runs/${response.data._id}`);
      }, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create payroll run');
      setLoading(false);
    }
  };

  // Get the last day of the current month as default
  const getDefaultPeriod = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Payroll Run" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/execution/runs" className={styles.backLink}>
            ← Back to Payroll Runs
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Create New Payroll Run</h1>
              <p className={styles.pageSubtitle}>
                Initialize a new payroll run for the selected period
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}> {error}</div>}
          {success && <div className={styles.successMessage}> {success}</div>}

          {/* Information Card */}
          <div className={styles.warningMessage}>
            <strong> Before Creating a Payroll Run:</strong>
            <ul style={{ margin: '8px 0 0 20px', lineHeight: '1.6' }}>
              <li>Ensure all signing bonuses for new hires have been reviewed and approved</li>
              <li>Verify that termination benefits for exiting employees are processed</li>
              <li>Check that all employee records have valid bank account information</li>
              <li>Confirm all payroll configuration policies are approved and active</li>
            </ul>
          </div>

          {/* Form */}
          <div className={styles.formCard}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Entity */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Company Entity *</label>
                <input
                  type="text" name="entity" value={formData.entity}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="e.g., OneStaff Organization" required
                />
                <span className={styles.formHint}>
                  The legal entity name for this payroll run
                </span>
              </div>

              {/* Payroll Period */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payroll Period (End Date) *</label>
                <input
                  type="date" name="payrollPeriod" value={formData.payrollPeriod}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                />
                <span className={styles.formHint}>
                  Select the last day of the payroll period (e.g., end of month)
                </span>
              </div>

              {/* Notes */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes (Optional)</label>
                <textarea
                  name="notes" value={formData.notes}
                  onChange={handleChange}
                  className={styles.formTextarea}
                  placeholder="Add any notes or special instructions for this payroll run..." rows={4}
                />
                <span className={styles.formHint}>
                  Any additional information about this payroll run
                </span>
              </div>

              {/* Process Information */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionHeader}>What Happens Next?</h3>
                <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.8' }}>
                  <ol style={{ marginLeft: '20px' }}>
                    <li>System will automatically fetch all active employees</li>
                    <li>Calculate salaries based on pay grades and allowances</li>
                    <li>Apply approved signing bonuses for new hires</li>
                    <li>Apply approved termination benefits for exiting employees</li>
                    <li>Calculate and deduct taxes, insurance, and penalties</li>
                    <li>Flag any exceptions (missing bank details, negative net pay, etc.)</li>
                    <li>Generate a draft payroll run for your review</li>
                  </ol>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.actionButtons}>
                <button
                  type="button" className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/execution/runs')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit" className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Creating Payroll Run...' : 'Create Payroll Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}