"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../time-management.module.css';

export default function CreateHolidayPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('NATIONAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const allowedTypes = ['NATIONAL', 'ORGANIZATIONAL', 'WEEKLY_REST'];
      const raw = (type || '').toString();
      const normalizedType = raw.trim().toUpperCase().replace(/\s+/g, '_');

      let matchedType: string | undefined = undefined;
      if (allowedTypes.includes(normalizedType)) matchedType = normalizedType;
      else {
        const simple = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        for (const t of allowedTypes) {
          if (t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === simple) {
            matchedType = t;
            break;
          }
        }
      }

      if (!matchedType) {
        setError('type must be one of the following values: ' + allowedTypes.join(', '));
        setLoading(false);
        return;
      }

      const payload: any = {
        name: name || undefined,
        type: matchedType,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
      };
      if (endDate) payload.endDate = new Date(endDate).toISOString();

      await axios.post('/time-management/holidays', payload);
      setSuccess('Holiday created successfully!');
      setTimeout(() => router.push('/dashboard/hr/holidays'), 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create holiday');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Holiday" role="HR">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>🎄 Create Holiday</h1>
              <p className={styles.pageSubtitle}>
                Add a new holiday to the system calendar
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          <div className={styles.formCard}>
            <form onSubmit={submit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Holiday Name *</label>
                  <input 
                    className={styles.formInput}
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Christmas, Independence Day"
                    required 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Type *</label>
                  <select 
                    className={styles.formSelect}
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="NATIONAL">National Holiday</option>
                    <option value="ORGANIZATIONAL">Organizational Holiday</option>
                    <option value="WEEKLY_REST">Weekly Rest Day</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Start Date *</label>
                  <input 
                    type="date" 
                    className={styles.formInput}
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>End Date (optional)</label>
                  <input 
                    type="date" 
                    className={styles.formInput}
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                  />
                  <p className={styles.formHint}>
                    Leave empty for single-day holidays
                  </p>
                </div>
              </div>

              <div className={styles.formActions}>
                <button 
                  className={styles.btnPrimary} 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '✓ Create Holiday'}
                </button>
                <button 
                  type="button" 
                  className={styles.btnSecondary} 
                  onClick={() => router.push('/dashboard/hr/holidays')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
