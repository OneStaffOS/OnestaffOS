/**
 * CSV Attendance Records Page
 * Route: /dashboard/employee/csv-attendance
 * 
 * Displays attendance records from the external CSV file
 * for the authenticated employee
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Spinner from '../../../components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './csvAttendance.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface CSVAttendanceRecord {
  employeeNumber: string;
  employeeName: string;
  punchType: string;
  date: string;
  time: string;
  timestamp: string;
}

export default function CSVAttendancePage() {
  const router = useRouter();
  const [records, setRecords] = useState<CSVAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');

  useEffect(() => {
    fetchEmployeeProfile();
  }, []);

  const fetchEmployeeProfile = async () => {
    try {
      const profileRes = await axios.get('/employee-profile/my-profile');
      const profile = profileRes.data;
      const empNum = profile.employeeNumber;
      setEmployeeNumber(empNum);
      
      // Fetch CSV records for this employee
      await fetchCSVRecords(empNum);
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load employee profile');
      setLoading(false);
    }
  };

  const fetchCSVRecords = async (empNum: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`/time-management/attendance/csv-records?employeeNumber=${empNum}`);
      setRecords(res.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch CSV records:', err);
      setError(err.response?.data?.message || 'Failed to load attendance records from CSV');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPunchTypeColor = (type: string) => {
    return type === 'IN' ? '#059669' : '#dc2626';
  };

  const getPunchTypeIcon = (type: string) => {
    return type === 'IN' ? '▶' : '⏸';
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="CSV Attendance Records" role="Employee">
        <div className={styles.container}>
          <div className={styles.header}>
            <button
              onClick={() => router.back()}
              className={styles.backButton}
            >
              ← Back to Dashboard
            </button>
            <h1 className={styles.title}>CSV Attendance Records</h1>
            <p className={styles.subtitle}>
              Attendance records from external CSV file for Employee #{employeeNumber}
            </p>
          </div>

          {loading && (
            <Spinner message="Loading records..." />
          )}

          {error && (
            <div className={styles.error}>
              <span className={styles.errorIcon}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && records.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📄</div>
              <h3>No CSV Records Found</h3>
              <p>No attendance records have been saved to the CSV file yet.</p>
              <p className={styles.hint}>Clock in/out using the kiosk to create CSV records.</p>
            </div>
          )}

          {!loading && !error && records.length > 0 && (
            <div className={styles.content}>
              <div className={styles.stats}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{records.length}</div>
                  <div className={styles.statLabel}>Total Punches</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>
                    {records.filter(r => r.punchType === 'IN').length}
                  </div>
                  <div className={styles.statLabel}>Clock INs</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>
                    {records.filter(r => r.punchType === 'OUT').length}
                  </div>
                  <div className={styles.statLabel}>Clock OUTs</div>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Employee</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr key={index} className={styles.tableRow}>
                        <td className={styles.dateCell}>
                          {formatDate(record.date)}
                        </td>
                        <td className={styles.timeCell}>
                          {record.time}
                        </td>
                        <td>
                          <span 
                            className={styles.punchBadge}
                            style={{ 
                              background: getPunchTypeColor(record.punchType),
                              color: 'white'
                            }}
                          >
                            <span className={styles.punchIcon}>
                              {getPunchTypeIcon(record.punchType)}
                            </span>
                            {record.punchType}
                          </span>
                        </td>
                        <td className={styles.employeeCell}>
                          <div className={styles.employeeName}>{record.employeeName}</div>
                          <div className={styles.employeeNumber}>#{record.employeeNumber}</div>
                        </td>
                        <td className={styles.timestampCell}>
                          {new Date(record.timestamp).toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.footer}>
                <p className={styles.footerText}>
                  💡 These records are stored in the external CSV file and synced with the database
                </p>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
