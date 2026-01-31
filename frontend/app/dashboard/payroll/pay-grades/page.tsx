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
interface PayGrade {
  _id: string;
  grade: string;
  baseSalary: number;
  grossSalary: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  createdAt: string;
}

export default function PayGradesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadPayGrades() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/pay-grades', { params });
      setPayGrades(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayGrades();
  }, [statusFilter]);

  const canApprove = isPayrollManager || isSystemAdmin;
  const canCreate = isPayrollSpecialist || isSystemAdmin;

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this pay grade?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/pay-grades/${id}/approve`);
      setSuccess('Pay grade approved successfully');
      await loadPayGrades();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this pay grade?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/pay-grades/${id}/reject`);
      setSuccess('Pay grade rejected');
      await loadPayGrades();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this pay grade? This action cannot be undone.')) return;
    setError(null);
    try {
      await axios.delete(`/payroll-configuration/pay-grades/${id}`);
      setSuccess('Pay grade deleted successfully');
      await loadPayGrades();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  const pendingGrades = payGrades.filter(p => p.status === 'draft');

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER, 
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Pay Grades" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Pay Grades</h1>
              <p className={styles.pageSubtitle}>
                Configure salary grades with base and gross salary for different positions
              </p>
            </div>
            {canCreate && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/pay-grades/create')}
                >
                   Create Pay Grade
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
              <span className={styles.statValue}>{payGrades.length}</span>
              <span className={styles.statLabel}>Total Pay Grades</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{payGrades.filter(p => p.status === 'approved').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingGrades.length}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{payGrades.filter(p => p.status === 'rejected').length}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Pending Approvals Section */}
          {canApprove && pendingGrades.length > 0 && (
            <div className={styles.approvalSection}>
              <h3 className={styles.approvalTitle}> Pending Approvals ({pendingGrades.length})</h3>
              <div className={styles.approvalList}>
                {pendingGrades.map(grade => (
                  <div key={grade._id} className={styles.approvalItem}>
                    <div className={styles.approvalInfo}>
                      <h4 className={styles.approvalName}>{grade.grade}</h4>
                      <p className={styles.approvalMeta}>
                        Base: {formatCurrency(grade.baseSalary)} | Gross: {formatCurrency(grade.grossSalary)} | 
                        Created by: {grade.createdBy?.firstName} {grade.createdBy?.lastName}
                      </p>
                    </div>
                    <div className={styles.approvalActions}>
                      <button 
                        className={styles.btnSuccess}
                        onClick={() => handleApprove(grade._id)}
                      >
                         Approve
                      </button>
                      <button 
                        className={styles.btnDanger}
                        onClick={() => handleReject(grade._id)}
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
            <Spinner message="Loading pay grades..." />
          ) : payGrades.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}></span>
              <h3>No Pay Grades Found</h3>
              <p>Create your first pay grade to get started.</p>
              {canCreate && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/pay-grades/create')}
                  style={{ marginTop: '16px' }}
                >
                   Create Pay Grade
                </button>
              )}
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {payGrades.map((grade) => (
                <div key={grade._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{grade.grade}</h3>
                    <span className={`${styles.badge} ${getStatusBadgeClass(grade.status)}`}>
                      {grade.status}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Base Salary</span>
                      <span className={styles.cardMetaValue}>{formatCurrency(grade.baseSalary)}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Gross Salary</span>
                      <span className={styles.cardMetaValue}>{formatCurrency(grade.grossSalary)}</span>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardMetaLabel}>Created</span>
                      <span className={styles.cardMetaValue}>
                        {new Date(grade.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {grade.createdBy && (
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMetaLabel}>Created By</span>
                        <span className={styles.cardMetaValue}>
                          {grade.createdBy.firstName} {grade.createdBy.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    {grade.status === 'draft' && canCreate && (
                      <>
                        <button 
                          className={`${styles.btnSecondary} ${styles.btnSmall}`}
                          onClick={() => router.push(`/dashboard/payroll/pay-grades/${grade._id}/edit`)}
                        >
                          Edit
                        </button>
                        <button 
                          className={`${styles.btnDanger} ${styles.btnSmall}`}
                          onClick={() => handleDelete(grade._id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {grade.status === 'draft' && canApprove && (
                      <>
                        <button 
                          className={`${styles.btnSuccess} ${styles.btnSmall}`}
                          onClick={() => handleApprove(grade._id)}
                        >
                          Approve
                        </button>
                        <button 
                          className={`${styles.btnWarning} ${styles.btnSmall}`}
                          onClick={() => handleReject(grade._id)}
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