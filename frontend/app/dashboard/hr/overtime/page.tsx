"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './overtime.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface OvertimeRule {
  _id: string;
  name: string;
  description?: string;
  active?: boolean;
  approved?: boolean;
  createdAt?: string;
}

interface Holiday {
  _id: string;
  type: string;
  startDate: string;
  endDate?: string;
  name?: string;
  active?: boolean;
}

export default function HROvertimePage() {
  const { user } = useAuth();
  const router = useRouter();
  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const isHRAdmin = user?.roles?.includes(SystemRole.HR_ADMIN);

  const [rules, setRules] = useState<OvertimeRule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rRes, hRes] = await Promise.all([
          axios.get('/time-management/overtime-rules').catch(() => ({ data: [] })),
          axios.get('/time-management/holidays').catch(() => ({ data: [] })),
        ]);
        setRules(rRes.data || []);
        setHolidays(hRes.data || []);
      } catch (err: any) {
        console.error('Failed to load overtime or holidays', err);
        setError('Failed to load data from server.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER]}>
      <DashboardLayout title="Overtime & Short-Time Rules" role="HR">
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Overtime & Short-Time (View)</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {isHRManager && (
                <button
                  className={styles.actionCard}
                  onClick={() => router.push('/dashboard/hr/overtime/create')}
                >
                  New Overtime Rule
                </button>
              )}
            </div>
          </div>
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}

          <section style={{ marginTop: 16 }}>
            <h3>Overtime Rules</h3>
            {rules.length === 0 && !loading && <p>No overtime rules configured.</p>}
            <div style={{ display: 'grid', gap: 12 }}>
              {rules.map((r) => (
                <div key={r._id} style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
                  <strong>{r.name}</strong>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{r.description}</div>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
                    Status: {r.active ? 'Active' : 'Inactive'} • Approved: {r.approved ? 'Yes' : 'No'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}