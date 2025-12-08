"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../payroll.module.css';

const POLICY_TYPES = ['Deduction', 'Allowance', 'Benefit', 'Misconduct', 'Leave'];
const APPLICABILITY_OPTIONS = ['All Employees', 'Full Time Employees', 'Part Time Employees', 'Contractors'];

export default function CreatePayrollPolicyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    policyName: '',
    policyType: '',
    description: '',
    effectiveDate: '',
    applicability: '',
    ruleDefinition: {
      percentage: '',
      fixedAmount: '',
      thresholdAmount: '',
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      ruleDefinition: {
        ...prev.ruleDefinition,
        [name]: parseFloat(value) || 0
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post('/payroll-configuration/policies', formData);
      router.push('/dashboard/payroll/policies');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Payroll Policy" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/policies" className={styles.backLink}>
            ← Back to Policies
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>📋 Create Payroll Policy</h1>
            <p className={styles.formSubtitle}>
              Define a new payroll policy. It will be saved as a draft and require HR Manager approval.
            </p>

            {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Policy Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="policyName"
                    className={styles.formInput}
                    value={formData.policyName}
                    onChange={handleChange}
                    placeholder="Enter policy name"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Policy Type <span className={styles.required}>*</span>
                  </label>
                  <select
                    name="policyType"
                    className={styles.formSelect}
                    value={formData.policyType}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select policy type</option>
                    {POLICY_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Description <span className={styles.required}>*</span>
                </label>
                <textarea
                  name="description"
                  className={styles.formTextarea}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the policy in detail..."
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Effective Date <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="effectiveDate"
                    className={styles.formInput}
                    value={formData.effectiveDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Applicability <span className={styles.required}>*</span>
                  </label>
                  <select
                    name="applicability"
                    className={styles.formSelect}
                    value={formData.applicability}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select applicability</option>
                    {APPLICABILITY_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rule Definition Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>📐 Rule Definition</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Percentage (0-100) <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      name="percentage"
                      className={styles.formInput}
                      value={formData.ruleDefinition.percentage}
                      onChange={handleRuleChange}
                      placeholder="Enter percentage (0-100)"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                    />
                    <span className={styles.formHint}>Percentage to apply for the rule</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Fixed Amount <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      name="fixedAmount"
                      className={styles.formInput}
                      value={formData.ruleDefinition.fixedAmount}
                      onChange={handleRuleChange}
                      placeholder="Enter fixed amount in EGP"
                      min="0"
                      step="0.01"
                      required
                    />
                    <span className={styles.formHint}>Fixed amount in EGP</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Threshold Amount <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      name="thresholdAmount"
                      className={styles.formInput}
                      value={formData.ruleDefinition.thresholdAmount}
                      onChange={handleRuleChange}
                      placeholder="Enter threshold amount"
                      min="0"
                      step="0.01"
                      required
                    />
                    <span className={styles.formHint}>Minimum threshold to trigger the rule</span>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll/policies')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '📋 Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
