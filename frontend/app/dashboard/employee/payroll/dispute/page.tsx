"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './dispute.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Payslip {
  _id: string;
  payrollRunId: {
    runId: string;
    payrollPeriod: string;
  };
  totalGrossSalary: number;
  totaDeductions: number;
  netPay: number;
}

export default function DisputePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const payslipIdFromQuery = searchParams?.get('payslipId');

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslipId, setSelectedPayslipId] = useState(payslipIdFromQuery || '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPayslips, setLoadingPayslips] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPayslips();
  }, []);

  useEffect(() => {
    if (payslipIdFromQuery) {
      setSelectedPayslipId(payslipIdFromQuery);
    }
  }, [payslipIdFromQuery]);

  async function loadPayslips() {
    setLoadingPayslips(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await axios.get(`/payroll-execution/employees/${user.sub}/payslips`);
      setPayslips(response.data || []);
    } catch (e: any) {
      console.error('Failed to load payslips:', e);
    } finally {
      setLoadingPayslips(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayslipId) {
      setError('Please select a payslip to dispute');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description of the dispute');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post('/payroll-tracking/disputes', {
        payslipId: selectedPayslipId,
        description: description.trim(),
      });

      setSuccess(true);
      setDescription('');
      setSelectedPayslipId('');

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/employee/payroll/my-disputes');
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const selectedPayslip = payslips.find(p => p._id === selectedPayslipId);

  if (loadingPayslips) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="Submit Payroll Dispute" role="Employee">
          <Spinner message="Loading payslips..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Submit Payroll Dispute" role="Employee">
        <div className={styles.container}>
          {/* Navigation */}
          <div className={styles.navigation}>
            <Link href="/dashboard/employee/payroll/my-payslips" className={styles.backLink}>
              ← Back to My Payslips
            </Link>
          </div>

          {/* Info Banner */}
          <div className={styles.infoBanner}>
            <div className={styles.infoIcon}>ℹ️</div>
            <div className={styles.infoContent}>
              <h4>How to Submit a Dispute</h4>
              <p>
                If you believe there is an error in your payslip calculation, select the affected payslip and provide
                a detailed description of the issue. Our payroll team will review your dispute and respond within 5
                business days.
              </p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className={styles.successMessage}>
              ✅ Dispute submitted successfully! Redirecting to My Disputes...
            </div>
          )}

          {/* Error Message */}
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formSection}>
              <h3>Dispute Information</h3>

              {/* Payslip Selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Select Payslip <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.select}
                  value={selectedPayslipId}
                  onChange={(e) => setSelectedPayslipId(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">-- Select a payslip --</option>
                  {payslips.map((payslip) => (
                    <option key={payslip._id} value={payslip._id}>
                      {formatDate(payslip.payrollRunId.payrollPeriod)} - {payslip.payrollRunId.runId} (Net: {formatCurrency(payslip.netPay)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Payslip Summary */}
              {selectedPayslip && (
                <div className={styles.payslipSummary}>
                  <h4>Selected Payslip Summary</h4>
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Period:</span>
                      <span className={styles.summaryValue}>
                        {formatDate(selectedPayslip.payrollRunId.payrollPeriod)}
                      </span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Run ID:</span>
                      <span className={styles.summaryValue}>{selectedPayslip.payrollRunId.runId}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Gross Salary:</span>
                      <span className={styles.summaryValue}>{formatCurrency(selectedPayslip.totalGrossSalary)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Deductions:</span>
                      <span className={styles.summaryValue}>-{formatCurrency(selectedPayslip.totaDeductions)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Net Pay:</span>
                      <span className={styles.summaryValue}>{formatCurrency(selectedPayslip.netPay)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Description of Issue <span className={styles.required}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide a detailed description of the error or discrepancy you found in your payslip. Include specific amounts, categories, or calculations that you believe are incorrect."
                  rows={6}
                  required
                  disabled={loading}
                />
                <div className={styles.charCount}>{description.length} / 1000 characters</div>
              </div>

              {/* Guidelines */}
              <div className={styles.guidelines}>
                <h4>Dispute Guidelines</h4>
                <ul>
                  <li>Provide as much detail as possible about the discrepancy</li>
                  <li>Include specific amounts or calculations that appear incorrect</li>
                  <li>Reference any relevant documents or communications</li>
                  <li>Be professional and objective in your description</li>
                  <li>You will be notified when your dispute is reviewed</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => router.push('/dashboard/employee/payroll/my-payslips')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : '⚠️ Submit Dispute'}
                </button>
              </div>
            </div>
          </form>

          {/* Additional Help */}
          <div className={styles.helpSection}>
            <h3>Need Help?</h3>
            <p>
              If you have questions about the dispute process or need assistance, please contact the HR department at{' '}
              <a href="mailto:hr@company.com">hr@company.com</a> or extension 1234.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
