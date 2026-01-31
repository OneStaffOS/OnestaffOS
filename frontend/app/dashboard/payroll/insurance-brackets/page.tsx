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
interface InsuranceBracket {
  _id: string;
  name: string;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  createdAt: string;
}

export default function InsuranceBracketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [brackets, setBrackets] = useState<InsuranceBracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isHRManager = user?.roles.includes(SystemRole.HR_MANAGER);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadBrackets() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/insurance-brackets', { params });
      setBrackets(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBrackets();
  }, [statusFilter]);

  // Insurance brackets can be approved by HR Manager only (not Payroll Manager)
  const canApprove = isHRManager || isSystemAdmin;
  const canCreate = isPayrollSpecialist || isSystemAdmin;
  // Note: Insurance cannot be deleted per user stories (REQ-PY-22)

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this insurance bracket?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/insurance-brackets/${id}/approve`);
      setSuccess('Insurance bracket approved successfully');
      await loadBrackets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this insurance bracket?')) return;
    setError(null);
    try {
      await axios.post(`/payroll-configuration/insurance-brackets/${id}/reject`);
      setSuccess('Insurance bracket rejected');
      await loadBrackets();
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

  const pendingBrackets = brackets.filter(p => p.status === 'draft');

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER, 
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN
    ]}>
      <DashboardLayout title="Insurance Brackets" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}> Insurance Brackets</h1>
              <p className={styles.pageSubtitle}>
                Define social and health insurance rates based on salary brackets
              </p>
            </div>
            {canCreate && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/insurance-brackets/create')}
                >
                   Create Insurance Bracket
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
              <span className={styles.statValue}>{brackets.length}</span>
              <span className={styles.statLabel}>Total Brackets</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{brackets.filter(b => b.status === 'approved').length}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingBrackets.length}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{brackets.filter(b => b.status === 'rejected').length}</span>
              <span className={styles.statLabel}>Rejected</span>
            </div>
          </div>

          {/* Pending Approvals Section */}
          {canApprove && pendingBrackets.length > 0 && (
            <div className={styles.approvalSection}>
              <h3 className={styles.approvalTitle}> Pending Approvals ({pendingBrackets.length})</h3>
              <div className={styles.approvalList}>
                {pendingBrackets.map(bracket => (
                  <div key={bracket._id} className={styles.approvalItem}>
                    <div className={styles.approvalInfo}>
                      <h4 className={styles.approvalName}>{bracket.name}</h4>
                      <p className={styles.approvalMeta}>
                        Salary Range: {formatCurrency(bracket.minSalary)} - {formatCurrency(bracket.maxSalary)} | 
                        Employee: {bracket.employeeRate}% | Employer: {bracket.employerRate}% |
                        Created by: {bracket.createdBy?.firstName} {bracket.createdBy?.lastName}
                      </p>
                    </div>
                    <div className={styles.approvalActions}>
                      <button 
                        className={styles.btnSuccess}
                        onClick={() => handleApprove(bracket._id)}
                      >
                         Approve
                      </button>
                      <button 
                        className={styles.btnDanger}
                        onClick={() => handleReject(bracket._id)}
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
            <Spinner message="Loading insurance brackets..." />
          ) : brackets.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}></span>
              <h3>No Insurance Brackets Found</h3>
              <p>Create your first insurance bracket to get started.</p>
              {canCreate && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/insurance-brackets/create')}
                  style={{ marginTop: '16px' }}
                >
                   Create Insurance Bracket
                </button>
              )}
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Insurance Name</th>
                    <th>Salary Range</th>
                    <th>Employee Rate</th>
                    <th>Employer Rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {brackets.map((bracket) => (
                    <tr key={bracket._id}>
                      <td>
                        <strong>{bracket.name}</strong>
                        {bracket.createdBy && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            By: {bracket.createdBy.firstName} {bracket.createdBy.lastName}
                          </div>
                        )}
                      </td>
                      <td>
                        {formatCurrency(bracket.minSalary)} - {formatCurrency(bracket.maxSalary)}
                      </td>
                      <td>{bracket.employeeRate}%</td>
                      <td>{bracket.employerRate}%</td>
                      <td>
                        <span className={`${styles.badge} ${getStatusBadgeClass(bracket.status)}`}>
                          {bracket.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          {bracket.status === 'draft' && canCreate && (
                            <button 
                              className={`${styles.btnSecondary} ${styles.btnSmall}`}
                              onClick={() => router.push(`/dashboard/payroll/insurance-brackets/${bracket._id}/edit`)}
                            >
                              Edit
                            </button>
                          )}
                          {bracket.status === 'draft' && canApprove && (
                            <>
                              <button 
                                className={`${styles.btnSuccess} ${styles.btnSmall}`}
                                onClick={() => handleApprove(bracket._id)}
                              >
                                Approve
                              </button>
                              <button 
                                className={`${styles.btnWarning} ${styles.btnSmall}`}
                                onClick={() => handleReject(bracket._id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
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