"use client";

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '../../../components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../time-management.module.css';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'NATIONAL', startDate: '', endDate: '', name: '', active: true });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/time-management/holidays/list');
      setHolidays(res.data || []);
    } catch (err) {
      console.error('Failed to fetch holidays', err);
      setError('Failed to load holiday list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHolidays(); }, []);

  const createHoliday = async () => {
    if (!form.type || !form.startDate) {
      setError('Type and start date are required');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        type: form.type,
        startDate: form.startDate,
        name: form.name || undefined,
        active: form.active,
      };
      if (form.endDate) payload.endDate = form.endDate;
      await axios.post('/time-management/holidays', payload);
      setForm({ type: 'NATIONAL', startDate: '', endDate: '', name: '', active: true });
      setSuccess('Holiday created successfully!');
      await fetchHolidays();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Create holiday failed', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to create holiday');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await axios.put(`/time-management/holidays/${id}`, { active });
      setSuccess(`Holiday ${active ? 'activated' : 'deactivated'} successfully`);
      await fetchHolidays();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update holiday', err);
      setError('Failed to update holiday');
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'NATIONAL': return styles.badgeApproved;
      case 'ORGANIZATIONAL': return styles.badgePending;
      case 'WEEKLY_REST': return styles.badgeInactive;
      default: return '';
    }
  };

  const activeCount = holidays.filter(h => h.active).length;
  const nationalCount = holidays.filter(h => h.type === 'NATIONAL').length;
  const orgCount = holidays.filter(h => h.type === 'ORGANIZATIONAL').length;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Holiday Configuration" role="HR Admin">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>🎄 Holiday Configuration</h1>
              <p className={styles.pageSubtitle}>
                Define national, organizational holidays and weekly rest days. These suppress penalties in attendance and shift checks.
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{holidays.length}</span>
              <span className={styles.statLabel}>Total Holidays</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{activeCount}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{nationalCount}</span>
              <span className={styles.statLabel}>National</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{orgCount}</span>
              <span className={styles.statLabel}>Organizational</span>
            </div>
          </div>

          {/* Create Holiday Form */}
          <div className={styles.formCard}>
            <h3 className={styles.sectionTitle}>➕ Create Holiday</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Type *</label>
                <select 
                  className={styles.formSelect}
                  value={form.type} 
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="NATIONAL">National Holiday</option>
                  <option value="ORGANIZATIONAL">Organizational Holiday</option>
                  <option value="WEEKLY_REST">Weekly Rest Day</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  placeholder="e.g. Christmas, Eid, Independence Day"
                  value={form.name} 
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Start Date *</label>
                <input 
                  type="date" 
                  className={styles.formInput}
                  value={form.startDate} 
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>End Date (optional)</label>
                <input 
                  type="date" 
                  className={styles.formInput}
                  value={form.endDate} 
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} 
                />
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={form.active} 
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} 
                />
                <span>Active</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <button 
                className={styles.btnPrimary}
                onClick={createHoliday} 
                disabled={saving}
              >
                {saving ? 'Creating...' : '✓ Create Holiday'}
              </button>
            </div>
          </div>

          {/* Holiday List */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📅 Existing Holidays</h3>
            {loading ? (
              <Spinner message="Loading holidays..." />
            ) : holidays.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🎄</span>
                <h3>No Holidays Defined</h3>
                <p>Create your first holiday using the form above.</p>
              </div>
            ) : (
              <div className={styles.cardsGrid}>
                {holidays.map((h: any) => (
                  <div key={h._id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{h.name || h.type}</h3>
                        <p className={styles.cardSubtitle}>
                          {new Date(h.startDate).toLocaleDateString()} 
                          {h.endDate ? ` — ${new Date(h.endDate).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <span className={`${styles.badge} ${h.active ? styles.badgeActive : styles.badgeInactive}`}>
                        {h.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Type:</span>
                        <span className={`${styles.badge} ${getTypeBadgeClass(h.type)}`}>
                          {h.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button 
                        className={`${h.active ? styles.btnWarning : styles.btnSuccess} ${styles.btnSmall}`}
                        onClick={() => toggleActive(h._id, !h.active)}
                      >
                        {h.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
