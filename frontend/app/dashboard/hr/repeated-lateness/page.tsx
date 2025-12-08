"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../dashboard.module.css';

export default function RepeatedLatenessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Array<any>>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, any>>({});
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/time-management/reports/repeated-lateness');
      const entries = res.data || [];
      setReport(entries);

      // Fetch all employees once and map by id for quick lookup
      const empRes = await axios.get('/employee-profile');
      const emps = empRes.data || [];
      const map: Record<string, any> = {};
      for (const e of emps) map[(e as any)._id || e.id || ''] = e;
      setEmployeesMap(map);
    } catch (err) {
      console.error('Failed to fetch repeated lateness report:', err);
      alert('Failed to fetch report: ' + (err as any)?.message || '');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDetection = async () => {
    if (!confirm('Run repeated lateness detection now? This will create notifications for configured positions.')) return;
    try {
      setRunning(true);
      const body = {
        threshold: 3,
        windowDays: 30,
        positionIds: ['69287f14a395a74b94e5b612','6925fc30567bcbe7c23fcb0a'],
      };
      await axios.post('/time-management/reports/repeated-lateness/run', body);
      // refresh report
      await fetchReport();
      alert('Detection executed; notifications created for matching employees (if any).');
    } catch (err: any) {
      console.error('Failed to run detection:', err);
      alert('Failed to run detection: ' + (err.response?.data?.message || err.message));
    } finally {
      setRunning(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Repeated Lateness Alerts" role="Human Resources">
        <div className={styles.section}>
          <h1>Repeated Lateness</h1>
          <p style={{ color: '#666' }}>
            Employees who exceeded the configured lateness threshold in the reporting window.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className={styles.actionCard} onClick={() => router.back()}>
              Back
            </button>

            <button
              className={styles.actionCard}
              onClick={handleRunDetection}
              disabled={running}
              style={running ? { opacity: 0.6 } : {}}
            >
              {running ? 'Running…' : 'Run Detection Now'}
            </button>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            {loading ? (
              <p>Loading report…</p>
            ) : report.length === 0 ? (
              <p>No employees match the repeated lateness conditions.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee ID</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Lateness Count</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((r: any) => {
                      const emp = employeesMap[r.employeeId] || {};
                      const name = emp.firstName || emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || r.employeeId;
                      return (
                        <tr key={r.employeeId}>
                          <td style={{ padding: '0.5rem' }}>{name}</td>
                          <td style={{ padding: '0.5rem' }}>{r.employeeId}</td>
                          <td style={{ padding: '0.5rem' }}>{r.latenessCount}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <button
                              className={styles.actionCard}
                              onClick={() => router.push(`/dashboard/hr/employees/${r.employeeId}`)}
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
