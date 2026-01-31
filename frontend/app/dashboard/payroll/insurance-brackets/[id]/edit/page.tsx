"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../payroll.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface InsuranceBracket {
  _id: string;
  name: string;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
  status: string;
}

export default function EditInsuranceBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    minSalary: '',
    maxSalary: '',
    employeeRate: '',
    employerRate: '',
  });

  useEffect(() => {
    async function loadBracket() {
      try {
        const response = await axios.get(`/payroll-configuration/insurance-brackets/${id}`);
        const bracket: InsuranceBracket = response.data;
        
        if (bracket.status !== 'draft') {
          setError('Only draft insurance brackets can be edited');
          return;
        }
        
        setFormData({
          name: bracket.name,
          minSalary: String(bracket.minSalary),
          maxSalary: String(bracket.maxSalary),
          employeeRate: String(bracket.employeeRate),
          employerRate: String(bracket.employerRate),
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || String(e));
      } finally {
        setLoading(false);
      }
    }
    loadBracket();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validation
    const minSalary = parseFloat(formData.minSalary);
    const maxSalary = parseFloat(formData.maxSalary);
    const employeeRate = parseFloat(formData.employeeRate);
    const employerRate = parseFloat(formData.employerRate);

    if (isNaN(minSalary) || minSalary < 0) {
      setError('Minimum salary must be a valid non-negative number');
      setSaving(false);
      return;
    }

    if (isNaN(maxSalary) || maxSalary <= 0) {
      setError('Maximum salary must be a valid positive number');
      setSaving(false);
      return;
    }

    if (minSalary >= maxSalary) {
      setError('Minimum salary must be less than maximum salary');
      setSaving(false);
      return;
    }

    if (isNaN(employeeRate) || employeeRate < 0 || employeeRate > 100) {
      setError('Employee rate must be between 0 and 100');
      setSaving(false);
      return;
    }

    if (isNaN(employerRate) || employerRate < 0 || employerRate > 100) {
      setError('Employer rate must be between 0 and 100');
      setSaving(false);
      return;
    }

    try {
      await axios.put(`/payroll-configuration/insurance-brackets/${id}`, {
        name: formData.name,
        minSalary,
        maxSalary,
        employeeRate,
        employerRate,
      });
      
      router.push('/dashboard/payroll/insurance-brackets');
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[
        SystemRole.PAYROLL_SPECIALIST,
        SystemRole.SYSTEM_ADMIN
      ]}>
        <DashboardLayout title="Edit Insurance Bracket" role="Payroll">
          <Spinner message="Loading insurance bracket..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Edit Insurance Bracket" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll/insurance-brackets" className={styles.backLink}>
            ← Back to Insurance Brackets
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}> Edit Insurance Bracket</h1>
            <p className={styles.pageSubtitle}>
              Update insurance bracket details (draft status only)
            </p>
          </div>

          {/* Error */}
          {error && <div className={styles.errorMessage}> {error}</div>}

          {/* Form */}
          <div className={styles.formCard}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Insurance Name *</label>
                <input
                  type="text" name="name" value={formData.name}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="e.g., Social Insurance Bracket A" required
                />
                <span className={styles.formHint}>
                  A descriptive name for this insurance bracket
                </span>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Minimum Salary (EGP) *</label>
                  <input
                    type="number" name="minSalary" value={formData.minSalary}
                    onChange={handleChange}
                    className={styles.formInput}
                    placeholder="e.g., 0" min="0" step="0.01" required
                  />
                  <span className={styles.formHint}>
                    Lower bound of salary range (inclusive)
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Maximum Salary (EGP) *</label>
                  <input
                    type="number" name="maxSalary" value={formData.maxSalary}
                    onChange={handleChange}
                    className={styles.formInput}
                    placeholder="e.g., 5000" min="0" step="0.01" required
                  />
                  <span className={styles.formHint}>
                    Upper bound of salary range (inclusive)
                  </span>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Employee Contribution Rate (%) *</label>
                  <input
                    type="number" name="employeeRate" value={formData.employeeRate}
                    onChange={handleChange}
                    className={styles.formInput}
                    placeholder="e.g., 11" min="0" max="100" step="0.01" required
                  />
                  <span className={styles.formHint}>
                    Percentage deducted from employee&apos;s gross salary
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Employer Contribution Rate (%) *</label>
                  <input
                    type="number" name="employerRate" value={formData.employerRate}
                    onChange={handleChange}
                    className={styles.formInput}
                    placeholder="e.g., 18.75" min="0" max="100" step="0.01" required
                  />
                  <span className={styles.formHint}>
                    Percentage paid by employer on top of salary
                  </span>
                </div>
              </div>

              {/* Info Box */}
              <div className={styles.infoBox}>
                <h4> Important Notes</h4>
                <ul>
                  <li>Only <strong>Draft</strong> insurance brackets can be edited</li>
                  <li>Once approved, the bracket cannot be modified</li>
                  <li>Ensure salary ranges do not overlap with other approved brackets</li>
                </ul>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" className={styles.btnSecondary}
                  onClick={() => router.back()}
                >
                  Cancel
                </button>
                <button 
                  type="submit" className={styles.btnPrimary}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Update Insurance Bracket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}