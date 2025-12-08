"use client";

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import { useRouter } from 'next/navigation';

interface DisputeSummary {
  _id: string;
  appraisalId?: { _id?: string } | string;
  reason?: string;
  status?: string;
  submittedAt?: string;
  resolutionSummary?: string;
}

export default function MyDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/performance/disputes/my-disputes');
      setDisputes(res.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch disputes', err);
      setError(err?.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My Disputes" role="Employee">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2>My Raised Disputes</h2>

          {loading && <p>Loading disputes...</p>}
          {error && <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '1rem', borderRadius: 6 }}>{error}</div>}

          {!loading && disputes.length === 0 && (
            <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: 6 }}>You have not submitted any disputes.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {disputes.map(d => (
              <div key={d._id} style={{ padding: 14, borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{d.reason || 'No reason provided'}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{d.status || 'UNKNOWN'} • {d.submittedAt ? new Date(d.submittedAt).toLocaleDateString() : ''}</div>
                  {d.resolutionSummary && <div style={{ marginTop: 8, fontSize: 13 }}><strong>Resolution:</strong> {d.resolutionSummary}</div>}
                </div>

                <div style={{ textAlign: 'right' }}>
                  {d.appraisalId && (
                    <button onClick={() => {
                      const aid = typeof d.appraisalId === 'string' ? d.appraisalId : (d.appraisalId as any)._id;
                      if (aid) router.push(`/dashboard/employee/appraisals/${aid}`);
                    }} style={{ padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      View Appraisal
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
