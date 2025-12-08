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

// Generic type for all configurations
interface ConfigItem {
  _id: string;
  name: string;
  type: string;
  module: string;
  details: string;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
}

export default function PayrollApprovalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadPendingItems() {
    setLoading(true);
    setError(null);
    try {
      // Load all pending configurations from all modules (excluding insurance brackets)
      const [
        policies,
        payGrades,
        payTypes,
        allowances,
        signingBonuses,
        terminationBenefits,
        taxRules
      ] = await Promise.all([
        axios.get('/payroll-configuration/policies', { params: { status: 'draft' } }).catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/pay-grades', { params: { status: 'draft' } }).catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/pay-types', { params: { status: 'draft' } }).catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/allowances', { params: { status: 'draft' } }).catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/signing-bonuses', { params: { status: 'draft' } }).catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/termination-benefits', { params: { status: 'draft' } }).catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/tax-rules', { params: { status: 'draft' } }).catch(() => ({ data: [] })),
      ]);

      // Transform to common format
      const items: ConfigItem[] = [
        ...(policies.data || []).map((p: any) => ({
          _id: p._id,
          name: p.policyName,
          type: p.policyType,
          module: 'policies',
          details: `${p.applicability} | ${p.description?.substring(0, 50) || 'No description'}...`,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
        })),
        ...(payGrades.data || []).map((p: any) => ({
          _id: p._id,
          name: p.grade,
          type: 'Pay Grade',
          module: 'pay-grades',
          details: `Base: ${p.baseSalary?.toLocaleString()} EGP | Gross: ${p.grossSalary?.toLocaleString()} EGP`,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
        })),
        ...(payTypes.data || []).map((p: any) => ({
          _id: p._id,
          name: p.name || p.type,
          type: 'Pay Type',
          module: 'pay-types',
          details: 'Payment schedule type',
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
        })),
        ...(allowances.data || []).map((p: any) => ({
          _id: p._id,
          name: p.name,
          type: 'Allowance',
          module: 'allowances',
          details: `Amount: ${p.amount?.toLocaleString()} EGP`,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
        })),
        ...(signingBonuses.data || []).map((p: any) => ({
          _id: p._id,
          name: p.positionName,
          type: 'Signing Bonus',
          module: 'signing-bonuses',
          details: `Amount: ${p.amount?.toLocaleString()} EGP`,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
        })),
        ...(terminationBenefits.data || []).map((p: any) => ({
          _id: p._id,
          name: p.name,
          type: 'Termination Benefit',
          module: 'termination-benefits',
          details: `Amount: ${p.amount?.toLocaleString()} EGP`,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
        })),
        ...(taxRules.data || []).map((p: any) => ({
          _id: p._id,
          name: p.name,
          type: 'Tax Rule',
          module: 'tax-rules',
          details: `Rate: ${p.rate}%`,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
        })),
      ];

      // Sort by creation date (newest first)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPendingItems(items);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPendingItems();
  }, []);

  async function handleApprove(item: ConfigItem) {
    if (!confirm(`Are you sure you want to approve "${item.name}"?`)) return;
    setProcessingIds(prev => [...prev, item._id]);
    setError(null);
    try {
      await axios.post(`/payroll-configuration/${item.module}/${item._id}/approve`);
      setSuccess(`${item.type} "${item.name}" approved successfully`);
      await loadPendingItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== item._id));
    }
  }

  async function handleReject(item: ConfigItem) {
    if (!confirm(`Are you sure you want to reject "${item.name}"?`)) return;
    setProcessingIds(prev => [...prev, item._id]);
    setError(null);
    try {
      await axios.post(`/payroll-configuration/${item.module}/${item._id}/reject`);
      setSuccess(`${item.type} "${item.name}" rejected`);
      await loadPendingItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== item._id));
    }
  }

  async function handleApproveAll() {
    if (!confirm(`Are you sure you want to approve all ${filteredItems.length} pending configurations?`)) return;
    setError(null);
    
    let approved = 0;
    let failed = 0;
    
    for (const item of filteredItems) {
      try {
        setProcessingIds(prev => [...prev, item._id]);
        await axios.post(`/payroll-configuration/${item.module}/${item._id}/approve`);
        approved++;
      } catch {
        failed++;
      } finally {
        setProcessingIds(prev => prev.filter(id => id !== item._id));
      }
    }

    await loadPendingItems();
    if (failed === 0) {
      setSuccess(`Successfully approved ${approved} configurations`);
    } else {
      setSuccess(`Approved ${approved} configurations, ${failed} failed`);
    }
    setTimeout(() => setSuccess(null), 5000);
  }

  const modules = [
    { value: 'all', label: 'All Modules' },
    { value: 'policies', label: 'Policies' },
    { value: 'pay-grades', label: 'Pay Grades' },
    { value: 'pay-types', label: 'Pay Types' },
    { value: 'allowances', label: 'Allowances' },
    { value: 'signing-bonuses', label: 'Signing Bonuses' },
    { value: 'termination-benefits', label: 'Termination Benefits' },
    { value: 'tax-rules', label: 'Tax Rules' },
  ];

  const filteredItems = moduleFilter === 'all' 
    ? pendingItems 
    : pendingItems.filter(item => item.module === moduleFilter);

  const getModuleIcon = (module: string) => {
    const icons: Record<string, string> = {
      'policies': '📋',
      'pay-grades': '💰',
      'pay-types': '⏱️',
      'allowances': '🎁',
      'signing-bonuses': '✍️',
      'termination-benefits': '📤',
      'tax-rules': '🏛️',
      'insurance-brackets': '🛡️',
    };
    return icons[module] || '📄';
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Payroll Approvals" role="Payroll">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Configuration
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>✅ Approval Center</h1>
              <p className={styles.pageSubtitle}>
                Review and approve pending payroll configurations
              </p>
            </div>
            {filteredItems.length > 0 && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnSuccess}
                  onClick={handleApproveAll}
                  disabled={processingIds.length > 0}
                >
                  ✅ Approve All ({filteredItems.length})
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>✅ {success}</div>}

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingItems.length}</span>
              <span className={styles.statLabel}>Total Pending</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingItems.filter(i => i.module === 'policies').length}</span>
              <span className={styles.statLabel}>Policies</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingItems.filter(i => i.module === 'pay-grades').length}</span>
              <span className={styles.statLabel}>Pay Grades</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{pendingItems.filter(i => ['allowances', 'signing-bonuses', 'termination-benefits'].includes(i.module)).length}</span>
              <span className={styles.statLabel}>Benefits</span>
            </div>
          </div>

          {/* Filter */}
          <div className={styles.filterSection}>
            <select
              className={styles.filterSelect}
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              {modules.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <Spinner message="Loading pending configurations..." />
          ) : filteredItems.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🎉</span>
              <h3>No Pending Approvals</h3>
              <p>All payroll configurations have been reviewed.</p>
            </div>
          ) : (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                📝 Pending Configurations ({filteredItems.length})
              </h2>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Details</th>
                      <th>Created By</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={`${item.module}-${item._id}`}>
                        <td>
                          <span className={styles.moduleTag}>
                            {getModuleIcon(item.module)} {modules.find(m => m.value === item.module)?.label}
                          </span>
                        </td>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.type}</td>
                        <td className={styles.detailsCell}>{item.details}</td>
                        <td>
                          {item.createdBy 
                            ? `${item.createdBy.firstName} ${item.createdBy.lastName}` 
                            : '-'}
                        </td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.btnSmSuccess}
                              onClick={() => handleApprove(item)}
                              disabled={processingIds.includes(item._id)}
                            >
                              {processingIds.includes(item._id) ? '...' : '✅'}
                            </button>
                            <button
                              className={styles.btnSmDanger}
                              onClick={() => handleReject(item)}
                              disabled={processingIds.includes(item._id)}
                            >
                              {processingIds.includes(item._id) ? '...' : '❌'}
                            </button>
                            <button
                              className={styles.btnSmSecondary}
                              onClick={() => router.push(`/dashboard/payroll/${item.module}`)}
                            >
                              👁️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
