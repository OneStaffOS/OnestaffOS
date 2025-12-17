"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './overtime-exceptions.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface OvertimeRecord {
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  totalOvertimeMinutes: number;
  overtimeDays: number;
  periodStart: string;
  periodEnd: string;
}

interface ExceptionRecord {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  type: string;
  status: string;
  attendanceRecordId: string;
  reason?: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface AttendanceRecord {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  punches: Array<{
    type: string;
    time: string;
  }>;
  totalWorkMinutes: number;
  hasMissedPunch: boolean;
  finalisedForPayroll: boolean;
}

export default function OvertimeExceptionsReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overtime' | 'exceptions' | 'attendance'>('overtime');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date filters
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  
  // Data
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [exceptionRecords, setExceptionRecords] = useState<ExceptionRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState<string>('all');
  const [exceptionStatusFilter, setExceptionStatusFilter] = useState<string>('all');

  async function loadOvertimeReport() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/time-management/reports/overtime', {
        params: { startDate, endDate }
      });
      setOvertimeRecords(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load overtime report');
      console.error('Error loading overtime report:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadExceptions() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/time-management/time-exceptions', {
        params: {
          type: exceptionTypeFilter !== 'all' ? exceptionTypeFilter : undefined,
          status: exceptionStatusFilter !== 'all' ? exceptionStatusFilter : undefined
        }
      });
      setExceptionRecords(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load exceptions');
      console.error('Error loading exceptions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendanceRecords() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/time-management/attendance/records', {
        params: { startDate, endDate }
      });
      setAttendanceRecords(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load attendance records');
      console.error('Error loading attendance records:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'overtime') {
      loadOvertimeReport();
    } else if (activeTab === 'exceptions') {
      loadExceptions();
    } else if (activeTab === 'attendance') {
      loadAttendanceRecords();
    }
  }, [activeTab, startDate, endDate, exceptionTypeFilter, exceptionStatusFilter]);

  function formatMinutesToHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function exportToCSV(data: any[], filename: string) {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).replace(/,/g, ';');
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function handleExportOvertime() {
    const exportData = overtimeRecords.map(record => ({
      'Employee Number': record.employeeId.employeeNumber,
      'Employee Name': `${record.employeeId.firstName} ${record.employeeId.lastName}`,
      'Overtime Hours': formatMinutesToHours(record.totalOvertimeMinutes),
      'Overtime Days': record.overtimeDays,
      'Period Start': record.periodStart,
      'Period End': record.periodEnd
    }));
    exportToCSV(exportData, 'overtime_report');
  }

  function handleExportExceptions() {
    const exportData = exceptionRecords.map(record => ({
      'Employee Number': record.employeeId.employeeNumber,
      'Employee Name': `${record.employeeId.firstName} ${record.employeeId.lastName}`,
      'Exception Type': record.type,
      'Status': record.status,
      'Reason': record.reason || 'N/A',
      'Assigned To': record.assignedTo ? `${record.assignedTo.firstName} ${record.assignedTo.lastName}` : 'Unassigned',
      'Created At': formatDate(record.createdAt)
    }));
    exportToCSV(exportData, 'exceptions_report');
  }

  function handleExportAttendance() {
    const exportData = attendanceRecords.map(record => ({
      'Employee Number': record.employeeId.employeeNumber,
      'Employee Name': `${record.employeeId.firstName} ${record.employeeId.lastName}`,
      'Total Work Hours': formatMinutesToHours(record.totalWorkMinutes),
      'Punches Count': record.punches.length,
      'Has Missed Punch': record.hasMissedPunch ? 'Yes' : 'No',
      'Finalized': record.finalisedForPayroll ? 'Yes' : 'No'
    }));
    exportToCSV(exportData, 'attendance_report');
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Overtime & Exception Reports" role="Payroll">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>📊 Overtime & Exception Reports</h1>
              <p className={styles.subtitle}>
                View and export overtime hours, attendance exceptions, and attendance records for payroll accuracy
              </p>
            </div>
            <button className={styles.btnBack} onClick={() => router.push('/dashboard/payroll')}>
              ← Back to Payroll
            </button>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'overtime' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('overtime')}
            >
              ⏰ Overtime Report
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'exceptions' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('exceptions')}
            >
              ⚠️ Exceptions
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'attendance' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              📋 Attendance Records
            </button>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            {(activeTab === 'overtime' || activeTab === 'attendance') && (
              <>
                <div className={styles.filterGroup}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </>
            )}

            {activeTab === 'exceptions' && (
              <>
                <div className={styles.filterGroup}>
                  <label>Exception Type</label>
                  <select
                    value={exceptionTypeFilter}
                    onChange={(e) => setExceptionTypeFilter(e.target.value)}
                    className={styles.select}
                  >
                    <option value="all">All Types</option>
                    <option value="MISSED_PUNCH">Missed Punch</option>
                    <option value="LATE_ARRIVAL">Late Arrival</option>
                    <option value="EARLY_DEPARTURE">Early Departure</option>
                    <option value="ABSENCE">Absence</option>
                    <option value="OVERTIME">Overtime</option>
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label>Status</label>
                  <select
                    value={exceptionStatusFilter}
                    onChange={(e) => setExceptionStatusFilter(e.target.value)}
                    className={styles.select}
                  >
                    <option value="all">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </>
            )}

            <button
              className={styles.btnExport}
              onClick={() => {
                if (activeTab === 'overtime') handleExportOvertime();
                else if (activeTab === 'exceptions') handleExportExceptions();
                else handleExportAttendance();
              }}
            >
              📥 Export to CSV
            </button>
          </div>

          {/* Error Message */}
          {error && <div className={styles.error}>⚠️ {error}</div>}

          {/* Content */}
          {loading ? (
            <Spinner message={`Loading ${activeTab} data...`} />
          ) : (
            <>
              {/* Overtime Report */}
              {activeTab === 'overtime' && (
                <div className={styles.tableContainer}>
                  {overtimeRecords.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>⏰</div>
                      <h3>No Overtime Records Found</h3>
                      <p>No overtime hours recorded for the selected period.</p>
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Employee #</th>
                          <th>Employee Name</th>
                          <th>Overtime Hours</th>
                          <th>Overtime Days</th>
                          <th>Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overtimeRecords.map((record, index) => (
                          <tr key={index}>
                            <td>{record.employeeId.employeeNumber}</td>
                            <td>
                              <strong>{record.employeeId.firstName} {record.employeeId.lastName}</strong>
                            </td>
                            <td style={{ color: '#2563eb', fontWeight: '600' }}>
                              {formatMinutesToHours(record.totalOvertimeMinutes)}
                            </td>
                            <td>{record.overtimeDays} days</td>
                            <td>
                              {new Date(record.periodStart).toLocaleDateString()} - {new Date(record.periodEnd).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Exceptions Report */}
              {activeTab === 'exceptions' && (
                <div className={styles.tableContainer}>
                  {exceptionRecords.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>⚠️</div>
                      <h3>No Exceptions Found</h3>
                      <p>No attendance exceptions for the selected filters.</p>
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Employee #</th>
                          <th>Employee Name</th>
                          <th>Exception Type</th>
                          <th>Status</th>
                          <th>Assigned To</th>
                          <th>Reason</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exceptionRecords.map((record) => (
                          <tr key={record._id}>
                            <td>{record.employeeId.employeeNumber}</td>
                            <td>
                              <strong>{record.employeeId.firstName} {record.employeeId.lastName}</strong>
                            </td>
                            <td>
                              <span className={styles.badge}>{record.type}</span>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${styles[`badge${record.status}`]}`}>
                                {record.status}
                              </span>
                            </td>
                            <td>
                              {record.assignedTo 
                                ? `${record.assignedTo.firstName} ${record.assignedTo.lastName}`
                                : <span style={{ color: '#94a3b8' }}>Unassigned</span>
                              }
                            </td>
                            <td>{record.reason || '-'}</td>
                            <td>{formatDate(record.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Attendance Records */}
              {activeTab === 'attendance' && (
                <div className={styles.tableContainer}>
                  {attendanceRecords.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>📋</div>
                      <h3>No Attendance Records Found</h3>
                      <p>No attendance records for the selected period.</p>
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Employee #</th>
                          <th>Employee Name</th>
                          <th>Work Hours</th>
                          <th>Punches</th>
                          <th>Missed Punch</th>
                          <th>Finalized</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.map((record) => (
                          <tr key={record._id}>
                            <td>{record.employeeId.employeeNumber}</td>
                            <td>
                              <strong>{record.employeeId.firstName} {record.employeeId.lastName}</strong>
                            </td>
                            <td style={{ color: '#16a34a', fontWeight: '600' }}>
                              {formatMinutesToHours(record.totalWorkMinutes)}
                            </td>
                            <td>{record.punches.length} punches</td>
                            <td>
                              {record.hasMissedPunch ? (
                                <span className={styles.badgeError}>Yes</span>
                              ) : (
                                <span className={styles.badgeSuccess}>No</span>
                              )}
                            </td>
                            <td>
                              {record.finalisedForPayroll ? (
                                <span className={styles.badgeSuccess}>Yes</span>
                              ) : (
                                <span className={styles.badgeWarning}>No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
