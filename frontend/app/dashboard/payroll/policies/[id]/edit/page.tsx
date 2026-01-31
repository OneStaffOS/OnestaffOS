"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../payroll.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
const POLICY_TYPES = ['Deduction', 'Allowance', 'Benefit', 'Misconduct', 'Leave'];
const APPLICABILITY_OPTIONS = ['All Employees', 'Full Time Employees', 'Part Time Employees', 'Contractors'];

export default function EditPayrollPolicyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    policyName: '',
    policyType: '',
    description: '',
    effectiveDate: '',
    applicability: '',
    ruleDefinition: {
      percentage: 0,
      fixedAmount: 0,
      thresholdAmount: 1,
    }
  });

  useEffect(() => {
    async function loadPolicy() {
      try {
        const response = await axios.get(`/payroll-configuration/policies/${id}`);
        const policy = response.data;
        
        // Check if policy can be edited
        if (policy.status !== 'draft') {
          setError('Only draft policies can be edited.');
          return;
        }

        setFormData({
          policyName: policy.policyName || '',
          policyType: policy.policyType || '',
          description: policy.description || '',
          effectiveDate: policy.effectiveDate ? policy.effectiveDate.split('T')[0] : '',
          applicability: policy.applicability || '',
          ruleDefinition: {
            percentage: policy.ruleDefinition?.percentage || 0,
            fixedAmount: policy.ruleDefinition?.fixedAmount || 0,
            thresholdAmount: policy.ruleDefinition?.thresholdAmount || 1,
          }
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    if (id) loadPolicy();
  }, [id]);

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
    setSaving(true);
    setError(null);

    try {
      await axios.put(`/payroll-configuration/policies/${id}`, formData);
      router.push(`/dashboard/payroll/policies/${id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
        <DashboardLayout title="Edit Policy" role="Payroll">
          <Spinner message="Loading policy..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Edit Payroll Policy" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href={`/dashboard/payroll/policies/${id}`} className={styles.backLink}>
            ← Back to Policy Details
          </Link>

          <div className={styles.formContainer}>
            <h1 className={styles.formTitle}> Edit Payroll Policy</h1>
            <p className={styles.formSubtitle}>
              Update the policy details. Only draft policies can be edited.
            </p>

            {error && <div className={styles.errorMessage}> {error}</div>}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Policy Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text" name="policyName" className={styles.formInput}
                    value={formData.policyName}
                    onChange={handleChange}
                    placeholder="Enter policy name" required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Policy Type <span className={styles.required}>*</span>
                  </label>
                  <select
                    name="policyType" className={styles.formSelect}
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
                  name="description" className={styles.formTextarea}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the policy in detail..." required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Effective Date <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date" name="effectiveDate" className={styles.formInput}
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
                    name="applicability" className={styles.formSelect}
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
                <h3 className={styles.sectionTitle}> Rule Definition</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Percentage (0-100) <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number" name="percentage" className={styles.formInput}
                      value={formData.ruleDefinition.percentage}
                      onChange={handleRuleChange}
                      min="0" max="100" step="0.01" required
                    />
                    <span className={styles.formHint}>Percentage to apply for the rule</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Fixed Amount <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number" name="fixedAmount" className={styles.formInput}
                      value={formData.ruleDefinition.fixedAmount}
                      onChange={handleRuleChange}
                      min="0" step="0.01" required
                    />
                    <span className={styles.formHint}>Fixed amount in EGP</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Threshold Amount <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number" name="thresholdAmount" className={styles.formInput}
                      value={formData.ruleDefinition.thresholdAmount}
                      onChange={handleRuleChange}
                      min="1" step="0.01" required
                    />
                    <span className={styles.formHint}>Minimum threshold to trigger the rule</span>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button" className={styles.btnSecondary}
                  onClick={() => router.push(`/dashboard/payroll/policies/${id}`)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit" className={styles.btnPrimary}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}