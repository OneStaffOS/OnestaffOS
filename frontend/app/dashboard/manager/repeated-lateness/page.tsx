"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import { useAuth } from '@/app/context/AuthContext';
import styles from '../repeated-lateness.module.css';

export default function ManagerRepeatedLateness() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, any>>({});
  // department id is derived inside fetchProfileAndReport; keep state only if needed
  const [deptId, setDeptId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileAndReport();
  }, []);

  const fetchProfileAndReport = async () => {
    try {
      setLoading(true);

      // fetch my profile to determine primaryDepartmentId
      const profRes = await axios.get('/employee-profile/my-profile');
      const profile = profRes.data || {};
      const primaryDepartmentId = profile.primaryDepartmentId ? (profile.primaryDepartmentId as any)._id || profile.primaryDepartmentId : null;
      setDeptId(primaryDepartmentId);

      // fetch repeated lateness report scoped to department
      const res = primaryDepartmentId
        ? await axios.get(`/time-management/reports/repeated-lateness/department?departmentId=${primaryDepartmentId}`)
        : { data: [] };
      const entries: any[] = res.data || [];

      // fetch team profiles (department-scoped) and map by id
      const empRes = await axios.get('/employee-profile/team/profiles');
      const emps = empRes.data || [];
      const map: Record<string, any> = {};
      for (const e of emps) map[(e as any)._id || e.id || ''] = e;
      setEmployeesMap(map);

      // report returned already scoped to department by the server
      setReport(entries);
    } catch (err) {
      console.error('Failed to load manager repeated lateness report:', err);
      alert('Failed to load report: ' + ((err as any)?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Repeated Lateness (Team)" role="Manager">
        <div className={styles.section}>
          <h1>Repeated Lateness — Team View</h1>
          <p style={{ color: '#666' }}>Employees in your department who exceeded the configured lateness threshold.</p>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button className={styles.actionCard} onClick={() => router.back()}>Back</button>
            {!(user && Array.isArray(user.roles) && user.roles.includes(SystemRole.DEPARTMENT_HEAD)) && (
              <button
                className={styles.actionCard}
                onClick={async () => {
                  if (!confirm('Run repeated lateness detection now for the organization?')) return;
                  try {
                    await axios.post('/time-management/reports/repeated-lateness/run', {
                      threshold: 3,
                      windowDays: 30,
                      positionIds: ['69287f14a395a74b94e5b612','6925fc30567bcbe7c23fcb0a'],
                    });
                    await fetchProfileAndReport();
                    alert('Detection executed (organization-wide). Results refreshed for your department.');
                  } catch (err: any) {
                    console.error('Run detection failed', err);
                    alert('Failed to run detection: ' + (err.response?.data?.message || err.message));
                  }
                }}
              >
                Run Detection Now
              </button>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            {loading ? (
              <p>Loading…</p>
            ) : report.length === 0 ? (
              <p>No employees in your department match the repeated lateness conditions.</p>
            ) : (
              <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee ID</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Lateness Count</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map(r => {
                    const emp = employeesMap[r.employeeId] || {};
                    const name = emp.firstName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || r.employeeId;
                    return (
                      <tr key={r.employeeId}>
                        <td style={{ padding: '0.5rem' }}>{name}</td>
                        <td style={{ padding: '0.5rem' }}>{r.employeeId}</td>
                        <td style={{ padding: '0.5rem' }}>{r.latenessCount}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <button className={styles.actionCard} onClick={() => router.push(`/dashboard/hr/employees/${r.employeeId}`)}>View Profile</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
