"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../admin.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface CompanyWideSettings {
  _id?: string;
  payDate: number;
  timeZone: string;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
}

const TIMEZONE_OPTIONS = [
  { value: 'Africa/Cairo', label: 'Africa/Cairo (GMT+2)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0/+1)' },
  { value: 'America/New_York', label: 'America/New_York (GMT-5/-4)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (GMT+3)' },
];

const CURRENCY_OPTIONS = [
  { value: 'EGP', label: 'Egyptian Pound (EGP)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'SAR', label: 'Saudi Riyal (SAR)' },
  { value: 'AED', label: 'UAE Dirham (AED)' },
];

// Admin-only page for company-wide payroll settings
export default function CompanyWideSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settingsExist, setSettingsExist] = useState(false);
  
  const [formData, setFormData] = useState({
    payDate: '25',
    timeZone: 'Africa/Cairo',
    currency: 'EGP',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await axios.get('/payroll-configuration/settings');
        if (response.data) {
          setSettingsExist(true);
          // Extract day from Date object if it's a date string
          let payDateValue = 25;
          if (response.data.payDate) {
            const date = new Date(response.data.payDate);
            payDateValue = date.getDate();
          }
          setFormData({
            payDate: String(payDateValue),
            timeZone: response.data.timeZone || 'Africa/Cairo',
            currency: response.data.currency || 'EGP',
          });
        }
      } catch (e: any) {
        // Settings might not exist yet - that's OK
        if (e?.response?.status !== 404) {
          console.log('No existing settings found, using defaults');
        }
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payDate = parseInt(formData.payDate);
    
    if (isNaN(payDate) || payDate < 1 || payDate > 28) {
      setError('Pay date must be between 1 and 28 (to avoid month-end issues)');
      setSaving(false);
      return;
    }

    try {
      if (settingsExist) {
        await axios.put('/payroll-configuration/settings', {
          payDate,
          timeZone: formData.timeZone,
          currency: formData.currency,
        });
      } else {
        await axios.post('/payroll-configuration/settings', {
          payDate,
          timeZone: formData.timeZone,
          currency: formData.currency,
        });
        setSettingsExist(true);
      }
      
      setSuccess('Company-wide settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[
        SystemRole.SYSTEM_ADMIN
      ]}>
        <DashboardLayout title="Company Settings" role="System Administrator">
          <Spinner message="Loading settings..." />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Company Wide Settings" role="System Administrator">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/admin" className={styles.backLink}>
            ← Back to Admin Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>⚙️ Company Wide Payroll Settings</h1>
            <p className={styles.pageSubtitle}>
              Configure global payroll settings that apply to all employees
            </p>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>✅ {success}</div>}

          {/* Settings Card */}
          <div className={styles.formCard}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Pay Date */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Monthly Pay Date *</label>
                <input
                  type="number"
                  name="payDate"
                  value={formData.payDate}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="e.g., 25"
                  min="1"
                  max="28"
                  required
                />
                <span className={styles.formHint}>
                  Day of the month when salaries are paid (1-28). Default: 25th
                </span>
              </div>

              {/* Time Zone */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Time Zone *</label>
                <select
                  name="timeZone"
                  value={formData.timeZone}
                  onChange={handleChange}
                  className={styles.formSelect}
                  required
                >
                  {TIMEZONE_OPTIONS.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <span className={styles.formHint}>
                  Time zone used for payroll calculations and reports
                </span>
              </div>

              {/* Currency */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Currency *</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className={styles.formSelect}
                  required
                >
                  {CURRENCY_OPTIONS.map(curr => (
                    <option key={curr.value} value={curr.value}>
                      {curr.label}
                    </option>
                  ))}
                </select>
                <span className={styles.formHint}>
                  Default currency for salary and payment display
                </span>
              </div>

              {/* Info Box */}
              <div className={styles.infoBox}>
                <h4>⚠️ Important Notes</h4>
                <ul>
                  <li>These settings affect all payroll calculations across the organization</li>
                  <li>Pay date is limited to 1-28 to avoid end-of-month edge cases</li>
                  <li>Changing currency does not convert existing salary amounts</li>
                  <li>Time zone affects payroll report timestamps and period calculations</li>
                </ul>
              </div>

              {/* Summary Card */}
              <div className={styles.summaryCard}>
                <h4 className={styles.summaryTitle}>📋 Current Configuration Summary</h4>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Pay Date</span>
                    <span className={styles.summaryValue}>
                      {formData.payDate}{getOrdinalSuffix(parseInt(formData.payDate))} of each month
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Time Zone</span>
                    <span className={styles.summaryValue}>
                      {TIMEZONE_OPTIONS.find(tz => tz.value === formData.timeZone)?.label}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Currency</span>
                    <span className={styles.summaryValue}>
                      {CURRENCY_OPTIONS.find(c => c.value === formData.currency)?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.btnSecondary}
                  onClick={() => router.push('/dashboard/payroll')}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.btnPrimary}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (settingsExist ? 'Update Settings' : 'Save Settings')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
