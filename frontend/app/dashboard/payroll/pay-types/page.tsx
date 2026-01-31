"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../payroll.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface PayType {
  _id: string;
  type: string;
  amount: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  createdAt: string;
}

export default function PayTypesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payTypes, setPayTypes] = useState<PayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadPayTypes() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/pay-types', { params });
      setPayTypes(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayTypes();
  }, [statusFilter]);

  const canApprove = isPayrollManager || isSystemAdmin;
  const canCreate = isPayrollSpecialist || isSystemAdmin;

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this pay type?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/pay-types/${id}/approve`);
      setSuccess('Pay type approved successfully');
      await loadPayTypes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this pay type?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/pay-types/${id}/reject`);
      setSuccess('Pay type rejected');
      await loadPayTypes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this pay type? This action cannot be undone.')) return;
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/pay-types/${id}`);
      setSuccess('Pay type deleted successfully');
      await loadPayTypes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved': return styles.badgeApproved;
      case 'rejected': return styles.badgeRejected;
      default: return styles.badgeDraft;
    }
  };

  const pendingTypes = payTypes.filter(p => p.status === 'draft');

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER, 
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Pay Types" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Pay Types</h1>
              <p className={styles.pageSubtitle}>
                Define payment types such as Monthly, Hourly, or Daily compensation
              </p>
            </div>
            {canCreate && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/pay-types/create')}
                >
                   Create Pay Type
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}> {error}</div>}
          {success && <div className={styles.successMessage}> {success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{payTypes.length}</span>
              <span className={styles.statLabel}>Total Pay Types</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{payTypes.filter(p => p.status === 'approved').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingTypes.length}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{payTypes.filter(p => p.status === 'rejected').length}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Pending Approvals Section */}
          {canApprove && pendingTypes.length > 0 && (
            <div className={styles.approvalSection}>
              <h3 className={styles.approvalTitle}> Pending Approvals ({pendingTypes.length})</h3>
              <div className={styles.approvalList}>
                {pendingTypes.map(type => (
                  <div key={type._id} className={styles.approvalItem}>
                    <div className={styles.approvalInfo}>
                      <h4 className={styles.approvalName}>{type.type}</h4>
                      <p className={styles.approvalMeta}>
                        Created by: {type.createdBy?.firstName} {type.createdBy?.lastName}
                      </p>
                    </div>
                    <div className={styles.approvalActions}>
                      <button 
                        className={styles.btnSuccess}
                        onClick={() => handleApprove(type._id)}
                      >
                         Approve
                      </button>
                      <button 
                        className={styles.btnDanger}
                        onClick={() => handleReject(type._id)}
                      >
                         Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Status:</span>
              <select 
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <Spinner message="Loading pay types..." />
          ) : payTypes.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}></span>
              <h3>No Pay Types Found</h3>
              <p>Create your first pay type to get started.</p>
              {canCreate && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/pay-types/create')}
                  style={{ marginTop: '16px' }}
                >
                   Create Pay Type
                </button>
              )}
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {payTypes.map((type) => (
                <div key={type._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{type.type}</h3>
                    <span className={`${styles.badge} ${getStatusBadgeClass(type.status)}`}>
                      {type.status}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Created</span>
                      <span className={styles.cardMetaValue}>
                        {new Date(type.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {type.createdBy && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Created By</span>
                        <span className={styles.cardMetaValue}>
                          {type.createdBy.firstName} {type.createdBy.lastName}
                        </span>
                      </div>
                    )}
                    {type.approvedBy && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Approved By</span>
                        <span className={styles.cardMetaValue}>
                          {type.approvedBy.firstName} {type.approvedBy.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    {type.status === 'draft' && canCreate && (
                      <button 
                        className={`${styles.btnDanger} ${styles.btnSmall}`}
                        onClick={() => handleDelete(type._id)}
                      >
                        Delete
                      </button>
                    )}
                    {type.status === 'draft' && canApprove && (
                      <>
                        <button 
                          className={`${styles.btnSuccess} ${styles.btnSmall}`}
                          onClick={() => handleApprove(type._id)}
                        >
                          Approve
                        </button>
                        <button 
                          className={`${styles.btnWarning} ${styles.btnSmall}`}
                          onClick={() => handleReject(type._id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}