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
interface BackupRecord {
  _id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string };
  status: 'completed' | 'in_progress' | 'failed';
  type: 'manual' | 'scheduled';
}

export default function BackupPage() {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  async function loadBackups() {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch backups - this endpoint may not exist yet
      const response = await axios.get('/payroll-configuration/admin/backups');
      setBackups(response.data || []);
    } catch (e: any) {
      // If endpoint doesn't exist, show empty state
      if (e?.response?.status === 404) {
        setBackups([]);
      } else {
        setError(e?.response?.data?.message || 'Failed to load backups');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBackup() {
    setCreating(true);
    setError(null);
    try {
      await axios.post('/payroll-configuration/admin/backups/create');
      setSuccess('Backup creation initiated successfully');
      await loadBackups();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  }

  async function handleDownloadBackup(id: string, fileName: string) {
    try {
      const response = await axios.get(`/payroll-configuration/admin/backups/${id}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to download backup');
    }
  }

  async function handleRestoreBackup(id: string) {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      return;
    }
    
    setError(null);
    try {
      await axios.post(`/payroll-configuration/admin/backups/${id}/restore`);
      setSuccess('Backup restoration initiated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to restore backup');
    }
  }

  async function handleDeleteBackup(id: string) {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }
    
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/admin/backups/${id}`);
      setSuccess('Backup deleted successfully');
      await loadBackups();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete backup');
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If less than 1 hour ago
    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    }
    // If less than 24 hours ago
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    // If less than 7 days ago
    if (diffDays < 7) {
      return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    }
    // Otherwise show full date
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className={styles.badgeSuccess}>✅ Completed</span>;
      case 'in_progress':
        return <span className={styles.badgeWarning}>⏳ In Progress</span>;
      case 'failed':
        return <span className={styles.badgeDanger}>❌ Failed</span>;
      default:
        return <span className={styles.badge}>{status}</span>;
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Backup & Restore" role="System Administrator">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/admin" className={styles.backLink}>
            ← Back to Admin Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>💾 Backup & Restore</h1>
              <p className={styles.pageSubtitle}>
                Manage system backups and restore data when needed
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.primaryBtn}
                onClick={handleCreateBackup}
                disabled={creating}
              >
                {creating ? '⏳ Creating...' : '➕ Create Backup'}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorAlert}>⚠️ {error}</div>}
          {success && <div className={styles.successAlert}>✅ {success}</div>}

          {/* Info Box */}
          <div className={styles.infoCard}>
            <h4>ℹ️ Backup Information</h4>
            <ul>
              <li>Backups include all employee data, configurations, and system settings</li>
              <li>Scheduled backups run daily at 2:00 AM (server time)</li>
              <li>Manual backups can be created at any time</li>
              <li>Restoring a backup will overwrite current data - use with caution</li>
            </ul>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Total Backups</h3>
                <p className={styles.statValue}>{backups.length}</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Latest Backup</h3>
                <p className={styles.statValue} style={{ fontSize: '1.25rem' }}>
                  {backups.length > 0 
                    ? formatDate(backups[0].createdAt) 
                    : 'None'}
                </p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Scheduled Backups</h3>
                <p className={styles.statValue}>
                  {backups.filter(b => b.type === 'scheduled').length}
                </p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Manual Backups</h3>
                <p className={styles.statValue}>
                  {backups.filter(b => b.type === 'manual').length}
                </p>
              </div>
            </div>
          </div>

          {/* Backups List */}
          {loading ? (
            <Spinner message="Loading backups..." />
          ) : backups.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>💾</span>
              <h3>No Backups Found</h3>
              <p>Create your first backup to protect your data.</p>
              <button 
                className={styles.primaryBtn}
                onClick={handleCreateBackup}
                disabled={creating}
                style={{ marginTop: '16px' }}
              >
                {creating ? '⏳ Creating...' : '➕ Create First Backup'}
              </button>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Backup File</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup._id}>
                      <td>
                        <strong>{backup.fileName}</strong>
                        {backup.createdBy && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            By: {backup.createdBy.firstName} {backup.createdBy.lastName}
                          </div>
                        )}
                      </td>
                      <td>{formatFileSize(backup.fileSize)}</td>
                      <td>
                        <span className={backup.type === 'scheduled' ? styles.badgeInfo : styles.badge}>
                          {backup.type === 'scheduled' ? '🕐 Scheduled' : '👆 Manual'}
                        </span>
                      </td>
                      <td>{getStatusBadge(backup.status)}</td>
                      <td>{formatDate(backup.createdAt)}</td>
                      <td>
                        <div className={styles.tableActions}>
                          {backup.status === 'completed' && (
                            <>
                              <button 
                                className={styles.secondaryBtn}
                                onClick={() => handleDownloadBackup(backup._id, backup.fileName)}
                              >
                                ⬇️ Download
                              </button>
                              <button 
                                className={styles.warningBtn}
                                onClick={() => handleRestoreBackup(backup._id)}
                              >
                                🔄 Restore
                              </button>
                            </>
                          )}
                          <button 
                            className={styles.dangerBtn}
                            onClick={() => handleDeleteBackup(backup._id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
