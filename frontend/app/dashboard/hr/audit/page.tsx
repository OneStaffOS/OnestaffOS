/**
 * HR Admin - Audit Trail Page (Route: /hr/audit)
 * View all system changes and activity logs
 * Phase III: HR/Admin Processing & Master Data
 */

'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './audit.module.css';

interface ChangeLog {
  _id: string;
  changeRequestId: string;
  employeeId: string;
  employeeName: string;
  changeType: string;
  description: string;
  implementedBy: string;
  implementedAt: string;
  previousData?: any;
  newData?: any;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<ChangeLog | null>(null);

  useEffect(() => {
    fetchChangeLogs();
  }, []);

  const fetchChangeLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/organization-structure/change-logs');
      setLogs(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesType = filterType === 'ALL' || log.changeType === filterType;
    const matchesSearch = 
      log.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.implementedBy?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeTypes = () => {
    const types = logs.map(log => log.changeType);
    return Array.from(new Set(types)).filter(Boolean);
  };

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Audit Trail</h1>
            <p className={styles.subtitle}>View all system changes and activity logs</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search by employee, description, or implementer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">All Types</option>
            {getChangeTypes().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <Spinner message="Loading audit logs..." />
        ) : filteredLogs.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Employee</th>
                  <th>Change Type</th>
                  <th>Description</th>
                  <th>Implemented By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td className={styles.dateTime}>{formatDate(log.implementedAt)}</td>
                    <td className={styles.empName}>{log.employeeName || log.employeeId}</td>
                    <td>
                      <span className={styles.typeBadge}>{log.changeType}</span>
                    </td>
                    <td className={styles.description}>{log.description}</td>
                    <td>{log.implementedBy}</td>
                    <td>
                      <button
                        className={styles.actionButton}
                        onClick={() => setSelectedLog(log)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedLog && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Change Details</h2>
                <button className={styles.closeButton} onClick={() => setSelectedLog(null)}>×</button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.detailRow}>
                  <strong>Date & Time:</strong>
                  <span>{formatDate(selectedLog.implementedAt)}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>Employee:</strong>
                  <span>{selectedLog.employeeName || selectedLog.employeeId}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>Change Type:</strong>
                  <span>{selectedLog.changeType}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>Description:</strong>
                  <span>{selectedLog.description}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>Implemented By:</strong>
                  <span>{selectedLog.implementedBy}</span>
                </div>
                {selectedLog.previousData && (
                  <div className={styles.dataSection}>
                    <strong>Previous Data:</strong>
                    <pre className={styles.dataPreview}>
                      {JSON.stringify(selectedLog.previousData, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.newData && (
                  <div className={styles.dataSection}>
                    <strong>New Data:</strong>
                    <pre className={styles.dataPreview}>
                      {JSON.stringify(selectedLog.newData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className={styles.modalActions}>
                <button className={styles.closeBtn} onClick={() => setSelectedLog(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
