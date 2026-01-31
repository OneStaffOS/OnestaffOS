"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './submit-claim.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
const CLAIM_TYPES = [
  { value: 'medical', label: 'Medical Expenses' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'business_travel', label: 'Business Travel' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'training', label: 'Training & Education' },
  { value: 'communication', label: 'Communication (Phone/Internet)' },
  { value: 'meals', label: 'Business Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'other', label: 'Other' },
];

export default function SubmitClaimPage() {
  const router = useRouter();
  const [claimType, setClaimType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!claimType) {
      setError('Please select a claim type');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description of the expense');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post('/payroll-tracking/claims', {
        claimType,
        amount: parseFloat(amount),
        description: description.trim(),
      });

      setSuccess(true);
      setClaimType('');
      setAmount('');
      setDescription('');

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/employee/payroll/my-claims');
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="Submit Expense Claim" role="Employee">
        <div className={styles.container}>
          {/* Navigation */}
          <div className={styles.navigation}>
            <Link href="/dashboard/employee/payroll/my-payslips" className={styles.backLink}>
              ← Back to My Payslips
            </Link>
          </div>

          {/* Info Banner */}
          <div className={styles.infoBanner}>
            <div className={styles.infoIcon}></div>
            <div className={styles.infoContent}>
              <h4>Submit an Expense Reimbursement Claim</h4>
              <p>
                Use this form to request reimbursement for business-related expenses. Provide accurate information
                and ensure you have supporting documentation. Claims are reviewed by the finance team and approved amounts
                will be added to your next payslip.
              </p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className={styles.successMessage}>
               Claim submitted successfully! Redirecting to My Claims...
            </div>
          )}

          {/* Error Message */}
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formSection}>
              <h3>Claim Details</h3>

              {/* Claim Type */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Expense Type <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.select}
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">-- Select expense type --</option>
                  {CLAIM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Amount (EGP) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number" className={styles.input}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" step="0.01" min="0.01" required
                  disabled={loading}
                />
                <div className={styles.inputHint}>Enter the total amount you are claiming for reimbursement</div>
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Description <span className={styles.required}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about the expense: date, purpose, what was purchased, who was involved (if applicable), and any other relevant information..." rows={6}
                  required
                  disabled={loading}
                />
                <div className={styles.charCount}>{description.length} / 1000 characters</div>
              </div>

              {/* Guidelines */}
              <div className={styles.guidelines}>
                <h4>Claim Submission Guidelines</h4>
                <ul>
                  <li>Ensure the expense is business-related and falls within company policy</li>
                  <li>Provide receipts or supporting documentation to HR/Finance if requested</li>
                  <li>Include the date of the expense in your description</li>
                  <li>Be specific about the purpose and necessity of the expense</li>
                  <li>Claims are typically reviewed within 5-7 business days</li>
                  <li>Approved amounts will be added to your next payslip</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className={styles.formActions}>
                <button
                  type="button" className={styles.btnCancel}
                  onClick={() => router.push('/dashboard/employee/payroll/my-payslips')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </div>
          </form>

          {/* Additional Help */}
          <div className={styles.helpSection}>
            <h3>Need Help?</h3>
            <p>
              For questions about expense policies, reimbursement procedures, or claim status, please contact the
              Finance department at <a href="mailto:finance@company.com">finance@company.com</a> or extension 5678.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}