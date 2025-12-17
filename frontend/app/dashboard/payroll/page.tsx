"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './payroll.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface ConfigStats {
  policies: { total: number; pending: number; approved: number };
  payGrades: { total: number; pending: number; approved: number };
  payTypes: { total: number; pending: number; approved: number };
  allowances: { total: number; pending: number; approved: number };
  signingBonuses: { total: number; pending: number; approved: number };
  terminationBenefits: { total: number; pending: number; approved: number };
  taxRules: { total: number; pending: number; approved: number };
  insuranceBrackets: { total: number; pending: number; approved: number };
}

interface ExecutionStats {
  totalRuns: number;
  draftRuns: number;
  underReview: number;
  approved: number;
  pendingBonuses: number;
  pendingBenefits: number;
}

export default function PayrollDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<ConfigStats | null>(null);
  const [executionStats, setExecutionStats] = useState<ExecutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role-based access checks
  const isPayrollManager = user?.roles.includes(SystemRole.PAYROLL_MANAGER);
  const isPayrollSpecialist = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);
  const isLegalPolicyAdmin = user?.roles.includes(SystemRole.LEGAL_POLICY_ADMIN);
  const canAccessExecution = user?.roles.includes(SystemRole.PAYROLL_SPECIALIST) || user?.roles.includes(SystemRole.PAYROLL_MANAGER);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      // Load all configuration data to calculate stats
      const [
        policies,
        payGrades,
        payTypes,
        allowances,
        signingBonuses,
        terminationBenefits,
        taxRules,
        insuranceBrackets,
        // Execution stats
        runs,
        executionBonuses,
        executionBenefits
      ] = await Promise.all([
        axios.get('/payroll-configuration/policies').catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/pay-grades').catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/pay-types').catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/allowances').catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/signing-bonuses').catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/termination-benefits').catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/tax-rules').catch(() => ({ data: [] })),
        axios.get('/payroll-configuration/insurance-brackets').catch(() => ({ data: [] })),
        // Execution data
        canAccessExecution ? axios.get('/payroll-execution/runs').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        canAccessExecution ? axios.get('/payroll-execution/signing-bonuses/pending').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        canAccessExecution ? axios.get('/payroll-execution/termination-benefits/pending').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      const calculateStats = (data: any) => {
        const arr = Array.isArray(data) ? data : [];
        return {
          total: arr.length,
          pending: arr.filter((item: any) => item.status === 'draft').length,
          approved: arr.filter((item: any) => item.status === 'approved').length,
        };
      };

      setStats({
        policies: calculateStats(policies.data),
        payGrades: calculateStats(payGrades.data),
        payTypes: calculateStats(payTypes.data),
        allowances: calculateStats(allowances.data),
        signingBonuses: calculateStats(signingBonuses.data),
        terminationBenefits: calculateStats(terminationBenefits.data),
        taxRules: calculateStats(taxRules.data),
        insuranceBrackets: calculateStats(insuranceBrackets.data),
      });

      // Set execution stats
      if (canAccessExecution) {
        const runsData = runs.data || [];
        setExecutionStats({
          totalRuns: runsData.length,
          draftRuns: runsData.filter((r: any) => r.status === 'draft').length,
          underReview: runsData.filter((r: any) => r.status === 'under review').length,
          approved: runsData.filter((r: any) => r.status === 'approved').length,
          pendingBonuses: (executionBonuses.data || []).length,
          pendingBenefits: (executionBenefits.data || []).length,
        });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  // All configuration modules
  const allConfigModules = [
    {
      id: 'employee-assignments',
      title: 'Employee Payroll Assignments',
      description: 'Assign pay grades and payroll information to employees in the organization.',
      icon: '👥',
      path: '/dashboard/payroll/employee-assignments',
    },
    {
      id: 'policies',
      title: 'Payroll Policies',
      description: 'Define deduction, allowance, benefit, and misconduct policies that apply to employees.',
      icon: '📋',
      path: '/dashboard/payroll/policies',
      stats: stats?.policies,
    },
    {
      id: 'pay-grades',
      title: 'Pay Grades',
      description: 'Configure salary grades with base and gross salary for different positions.',
      icon: '💰',
      path: '/dashboard/payroll/pay-grades',
      stats: stats?.payGrades,
    },
    {
      id: 'pay-types',
      title: 'Pay Types',
      description: 'Define payment types such as Monthly, Hourly, or Daily compensation.',
      icon: '⏱️',
      path: '/dashboard/payroll/pay-types',
      stats: stats?.payTypes,
    },
    {
      id: 'allowances',
      title: 'Allowances',
      description: 'Manage employee allowances like Housing, Transport, and other benefits.',
      icon: '🎁',
      path: '/dashboard/payroll/allowances',
      stats: stats?.allowances,
    },
    {
      id: 'termination-benefits',
      title: 'Termination Benefits',
      description: 'Define end-of-service gratuity and resignation benefits.',
      icon: '📤',
      path: '/dashboard/payroll/termination-benefits',
      stats: stats?.terminationBenefits,
    },
    {
      id: 'insurance-brackets',
      title: 'Insurance Brackets',
      description: 'Define social and health insurance rates based on salary brackets.',
      icon: '🛡️',
      path: '/dashboard/payroll/insurance-brackets',
      stats: stats?.insuranceBrackets,
    },
  ];

  // Tax Rules module - Only for Legal & Policy Admin
  const taxRulesModule = {
    id: 'tax-rules',
    title: 'Tax Rules',
    description: 'Configure tax rates and rules for payroll deductions.',
    icon: '🏛️',
    path: '/dashboard/payroll/tax-rules',
    stats: stats?.taxRules,
  };

  // Filter modules based on role:
  // - Legal & Policy Admin: Only sees Tax Rules
  // - Everyone else: Sees all modules except Tax Rules
  const configModules = isLegalPolicyAdmin 
    ? [taxRulesModule] 
    : allConfigModules;

  // Exclude insurance brackets from totals calculation (shared dashboard)
  // For Legal & Policy Admin, only count tax rules
  const totalPending = stats ? (
    isLegalPolicyAdmin 
      ? stats.taxRules.pending
      : (stats.policies.pending + stats.payGrades.pending + stats.payTypes.pending + 
         stats.allowances.pending + stats.signingBonuses.pending + stats.terminationBenefits.pending)
  ) : 0;
  const totalApproved = stats ? (
    isLegalPolicyAdmin
      ? stats.taxRules.approved
      : (stats.policies.approved + stats.payGrades.approved + stats.payTypes.approved + 
         stats.allowances.approved + stats.signingBonuses.approved + stats.terminationBenefits.approved)
  ) : 0;
  const totalConfigs = stats ? (
    isLegalPolicyAdmin
      ? stats.taxRules.total
      : (stats.policies.total + stats.payGrades.total + stats.payTypes.total + 
         stats.allowances.total + stats.signingBonuses.total + stats.terminationBenefits.total)
  ) : 0;

  // Only Payroll Manager and System Admin can approve configurations
  const canApprove = isPayrollManager || isSystemAdmin;

  return (
    <ProtectedRoute requiredRoles={[
      SystemRole.PAYROLL_SPECIALIST, 
      SystemRole.PAYROLL_MANAGER,
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN,
      SystemRole.LEGAL_POLICY_ADMIN
    ]}>
      <DashboardLayout title={isLegalPolicyAdmin ? "Tax Rules Configuration" : "Payroll Configuration"} role="Payroll">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>{isLegalPolicyAdmin ? '🏛️ Tax Rules Configuration' : '💼 Payroll Configuration'}</h1>
              <p className={styles.pageSubtitle}>
                {isLegalPolicyAdmin 
                  ? 'Configure and manage tax rates and rules for payroll deductions'
                  : 'Configure and manage payroll policies, pay grades, allowances, and more'}
              </p>
            </div>
            {canApprove && !isLegalPolicyAdmin && (
              <div className={styles.headerActions}>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => router.push('/dashboard/payroll/approvals')}
                >
                  ✅ Approval Center ({totalPending} pending)
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

          {loading ? (
            <Spinner message="Loading payroll configuration..." />
          ) : (
            <>
              {/* Overview Stats */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{totalConfigs}</span>
                  <span className={styles.statLabel}>Total Configurations</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{totalApproved}</span>
                  <span className={styles.statLabel}>Approved</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{totalPending}</span>
                  <span className={styles.statLabel}>Pending Approval</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{configModules.length}</span>
                  <span className={styles.statLabel}>Configuration Modules</span>
                </div>
              </div>

              {/* Pending Approvals Section */}
              {totalPending > 0 && !isLegalPolicyAdmin && (
                <div className={styles.approvalSection}>
                  <h3 className={styles.approvalTitle}>
                    ⚠️ Pending Approvals ({totalPending})
                  </h3>
                  <p style={{ color: '#92400e', fontSize: '14px', margin: 0 }}>
                    There are {totalPending} configurations waiting for Payroll Manager approval.
                    {canApprove && (
                      <button 
                        className={styles.btnLink}
                        style={{ marginLeft: '10px', color: '#0066cc', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => router.push('/dashboard/payroll/approvals')}
                      >
                        Review Now →
                      </button>
                    )}
                  </p>
                </div>
              )}

              {/* Configuration Modules */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{isLegalPolicyAdmin ? '🏛️ Tax Configuration' : '⚙️ Configuration Modules'}</h2>
                <div className={styles.dashboardGrid}>
                  {configModules.map((module) => (
                    <div 
                      key={module.id}
                      className={styles.dashboardCard}
                      onClick={() => router.push(module.path)}
                    >
                      <span className={styles.dashboardCardIcon}>{module.icon}</span>
                      <h3 className={styles.dashboardCardTitle}>{module.title}</h3>
                      <p className={styles.dashboardCardDescription}>{module.description}</p>
                      {module.stats && (
                        <div className={styles.dashboardCardStats}>
                          <div className={styles.dashboardCardStat}>
                            <span className={styles.dashboardCardStatValue}>{module.stats.total}</span>
                            <span className={styles.dashboardCardStatLabel}>Total</span>
                          </div>
                          <div className={styles.dashboardCardStat}>
                            <span className={styles.dashboardCardStatValue} style={{ color: '#10b981' }}>
                              {module.stats.approved}
                            </span>
                            <span className={styles.dashboardCardStatLabel}>Approved</span>
                          </div>
                          <div className={styles.dashboardCardStat}>
                            <span className={styles.dashboardCardStatValue} style={{ color: '#f59e0b' }}>
                              {module.stats.pending}
                            </span>
                            <span className={styles.dashboardCardStatLabel}>Pending</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payroll Execution & Processing - For Payroll Specialist, Payroll Manager, and System Admin */}
              {(isPayrollSpecialist || isPayrollManager) && !isLegalPolicyAdmin && executionStats && (
                <div className={styles.section} style={{ marginTop: '40px' }}>
                  <h2 className={styles.sectionTitle}>💰 Payroll Execution & Processing</h2>
                  <div className={styles.dashboardGrid}>
                    {/* Payroll Runs */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/execution/runs')}
                    >
                      <span className={styles.dashboardCardIcon}>💰</span>
                      <h3 className={styles.dashboardCardTitle}>Payroll Runs</h3>
                      <p className={styles.dashboardCardDescription}>
                        Create, manage, and process monthly payroll runs with automated calculations.
                      </p>
                      <div className={styles.dashboardCardStats}>
                        <div className={styles.dashboardCardStat}>
                          <span className={styles.dashboardCardStatValue}>{executionStats.totalRuns}</span>
                          <span className={styles.dashboardCardStatLabel}>Total Runs</span>
                        </div>
                        <div className={styles.dashboardCardStat}>
                          <span className={styles.dashboardCardStatValue} style={{ color: '#f59e0b' }}>
                            {executionStats.draftRuns}
                          </span>
                          <span className={styles.dashboardCardStatLabel}>In Draft</span>
                        </div>
                        <div className={styles.dashboardCardStat}>
                          <span className={styles.dashboardCardStatValue} style={{ color: '#2563eb' }}>
                            {executionStats.underReview}
                          </span>
                          <span className={styles.dashboardCardStatLabel}>Under Review</span>
                        </div>
                      </div>
                    </div>

                    {/* Signing Bonuses */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/execution/signing-bonuses')}
                    >
                      <span className={styles.dashboardCardIcon}>✍️</span>
                      <h3 className={styles.dashboardCardTitle}>Signing Bonuses</h3>
                      <p className={styles.dashboardCardDescription}>
                        Review and approve signing bonuses for new hires before payroll processing.
                      </p>
                      <div className={styles.dashboardCardStats}>
                        <div className={styles.dashboardCardStat}>
                          <span className={styles.dashboardCardStatValue} style={{ color: '#f59e0b' }}>
                            {executionStats.pendingBonuses}
                          </span>
                          <span className={styles.dashboardCardStatLabel}>Pending Approval</span>
                        </div>
                      </div>
                    </div>

                    {/* Payslips */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/execution/payslips')}
                    >
                      <span className={styles.dashboardCardIcon}>📄</span>
                      <h3 className={styles.dashboardCardTitle}>Payslips</h3>
                      <p className={styles.dashboardCardDescription}>
                        View, generate, and distribute employee payslips for completed payroll runs.
                      </p>
                    </div>

                    {/* Overtime & Exception Reports - Only for Payroll Specialist */}
                    {isPayrollSpecialist && (
                      <div 
                        className={styles.dashboardCard}
                        onClick={() => router.push('/dashboard/payroll/reports/overtime-exceptions')}
                      >
                        <span className={styles.dashboardCardIcon}>📊</span>
                        <h3 className={styles.dashboardCardTitle}>Overtime & Exceptions</h3>
                        <p className={styles.dashboardCardDescription}>
                          View and export overtime hours and attendance exception reports for payroll accuracy.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payroll Manager Controls - Only for Payroll Manager and System Admin */}
              {isPayrollManager && !isLegalPolicyAdmin && (
                <div className={styles.section} style={{ marginTop: '40px' }}>
                  <h2 className={styles.sectionTitle}>🔐 Payroll Manager Controls</h2>
                  <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                    Lock/unlock payroll runs and manage exceptions as Payroll Manager
                  </p>
                  <div className={styles.dashboardGrid}>
                    {/* Payroll Runs Management */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/manager/runs')}
                      style={{
                        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <span className={styles.dashboardCardIcon} style={{ fontSize: '48px' }}>🔒</span>
                      <h3 className={styles.dashboardCardTitle} style={{ color: 'white' }}>
                        Lock/Unlock Payroll Runs
                      </h3>
                      <p className={styles.dashboardCardDescription} style={{ color: 'rgba(255,255,255,0.9)' }}>
                        Lock finalized payroll runs to prevent unauthorized changes. Unlock under exceptional circumstances with documented reasons.
                      </p>
                    </div>

                    {/* Escalated Issues */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/manager/exceptions')}
                      style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <span className={styles.dashboardCardIcon} style={{ fontSize: '48px' }}>⚠️</span>
                      <h3 className={styles.dashboardCardTitle} style={{ color: 'white' }}>
                        Resolve Escalated Exceptions
                      </h3>
                      <p className={styles.dashboardCardDescription} style={{ color: 'rgba(255,255,255,0.9)' }}>
                        Review and resolve payroll irregularities escalated by Payroll Specialists requiring manager-level decisions.
                      </p>
                    </div>

                    {/* Audit Trail */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/manager/audit')}
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <span className={styles.dashboardCardIcon} style={{ fontSize: '48px' }}>📊</span>
                      <h3 className={styles.dashboardCardTitle} style={{ color: 'white' }}>
                        Audit & Reports
                      </h3>
                      <p className={styles.dashboardCardDescription} style={{ color: 'rgba(255,255,255,0.9)' }}>
                        View complete audit trail of all payroll lock/unlock actions and exception resolutions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payroll Reports & Disputes - For Payroll Specialist and Manager */}
              {(isPayrollSpecialist || isPayrollManager) && !isLegalPolicyAdmin && (
                <div className={styles.section} style={{ marginTop: '40px' }}>
                  <h2 className={styles.sectionTitle}>📊 Reports & Dispute Management</h2>
                  <div className={styles.dashboardGrid}>
                    {/* Department Reports */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/department-reports')}
                    >
                      <span className={styles.dashboardCardIcon}>📈</span>
                      <h3 className={styles.dashboardCardTitle}>Department Payroll Reports</h3>
                      <p className={styles.dashboardCardDescription}>
                        Generate detailed payroll reports by department to analyze salary distribution and ensure budget alignment.
                      </p>
                    </div>

                    {/* Disputes Management */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/disputes')}
                      style={{
                        background: isPayrollManager 
                          ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' 
                          : undefined,
                        color: isPayrollManager ? 'white' : undefined,
                        border: isPayrollManager ? 'none' : undefined
                      }}
                    >
                      <span className={styles.dashboardCardIcon} style={{ fontSize: '48px' }}>⚖️</span>
                      <h3 className={styles.dashboardCardTitle} style={{ color: isPayrollManager ? 'white' : undefined }}>
                        Payroll Disputes
                      </h3>
                      <p className={styles.dashboardCardDescription} style={{ color: isPayrollManager ? 'rgba(255,255,255,0.9)' : undefined }}>
                        {isPayrollManager 
                          ? 'Review and approve/reject disputes escalated by Payroll Specialists requiring final manager approval.'
                          : 'Review employee payroll disputes and escalate approved cases to Payroll Manager for final decision.'}
                      </p>
                    </div>

                    {/* Expense Claims Management */}
                    <div 
                      className={styles.dashboardCard}
                      onClick={() => router.push('/dashboard/payroll/claims')}
                      style={{
                        background: isPayrollManager 
                          ? 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)' 
                          : undefined,
                        color: isPayrollManager ? 'white' : undefined,
                        border: isPayrollManager ? 'none' : undefined
                      }}
                    >
                      <span className={styles.dashboardCardIcon} style={{ fontSize: '48px' }}>💰</span>
                      <h3 className={styles.dashboardCardTitle} style={{ color: isPayrollManager ? 'white' : undefined }}>
                        Expense Claims
                      </h3>
                      <p className={styles.dashboardCardDescription} style={{ color: isPayrollManager ? 'rgba(255,255,255,0.9)' : undefined }}>
                        {isPayrollManager 
                          ? 'Final approval of expense claims escalated by Payroll Specialists. Approved claims are sent to Finance Staff for payment.'
                          : 'Review employee expense claims and approve/reject. Approved claims are escalated to Payroll Manager for final confirmation.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
