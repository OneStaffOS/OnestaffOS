/**
 * Employee Leave Requests Page
 * REQ-015, REQ-017, REQ-018, REQ-019: View, modify, cancel leave requests
 * Accessible by: Employees
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './leaves.module.css';

interface LeaveType {
  _id: string;
  code: string;
  name: string;
  paid: boolean;
  requiresAttachment: boolean;
}

interface LeaveRequest {
  _id: string;
  employeeId: string | { _id: string; firstName: string; lastName: string };
  leaveTypeId: string | LeaveType;
  dates: { from: string; to: string };
  durationDays: number;
  justification?: string;
  attachmentId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvalFlow: Array<{
    role: string;
    status: string;
    decidedBy?: string;
    decidedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface LeaveBalance {
  _id?: string;
  leaveTypeId: string | LeaveType;
  yearlyEntitlement: number;
  accruedActual?: number;
  accruedRounded?: number;
  carryForward?: number;
  taken: number;
  pending: number;
  remaining: number;
  lastAccrualDate?: string;
  nextResetDate?: string;
}

export default function EmployeeLeavesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'balances'>('requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Handle tab query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'balances') {
      setActiveTab('balances');
    } else if (tab === 'requests') {
      setActiveTab('requests');
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Get employee profile first
      const profileRes = await axios.get('/employee-profile/my-profile');
      const profile = profileRes.data;
      setEmployeeId(profile._id);

      // Fetch leave types
      const typesRes = await axios.get('/leaves/types');
      setLeaveTypes(typesRes.data);

      // Fetch leave requests for this employee
      const requestsRes = await axios.get(`/leaves/requests?employeeId=${profile._id}`);
      setRequests(requestsRes.data);

      // Fetch leave balances for this employee
      try {
        const balancesRes = await axios.get(`/leaves/balances/employee/${profile._id}`);
        setBalances(Array.isArray(balancesRes.data) ? balancesRes.data : [balancesRes.data]);
      } catch {
        // Balance endpoint might not return data if no entitlements set
        setBalances([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch leave data:', err);
      setError(err.response?.data?.message || 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      setCancellingId(requestId);
      await axios.delete(`/leaves/requests/${requestId}`);
      setSuccess('Leave request cancelled successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
      setError(err.response?.data?.message || 'Failed to cancel leave request');
    } finally {
      setCancellingId(null);
    }
  };

  const getLeaveTypeName = (leaveType: string | LeaveType): string => {
    if (typeof leaveType === 'object' && leaveType !== null) {
      return leaveType.name;
    }
    const type = leaveTypes.find(t => t._id === leaveType);
    return type?.name || 'Unknown';
  };

  const getLeaveTypeCode = (leaveType: string | LeaveType): string => {
    if (typeof leaveType === 'object' && leaveType !== null) {
      return leaveType.code;
    }
    const type = leaveTypes.find(t => t._id === leaveType);
    return type?.code || '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return styles.statusApproved;
      case 'rejected':
        return styles.statusRejected;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  // REQ-031: Check if a leave request is a post-leave (submitted >24 hours after leave ended)
  const isPostLeave = (request: LeaveRequest): boolean => {
    const leaveEndDate = new Date(request.dates.to);
    leaveEndDate.setHours(23, 59, 59, 999); // End of the leave day
    const submittedDate = new Date(request.createdAt);
    const hoursSinceLeaveEnd = (submittedDate.getTime() - leaveEndDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceLeaveEnd > 24;
  };

  // REQ-033: Filter and sort leave history
  const getLeaveTypeId = (leaveType: string | LeaveType): string => {
    return typeof leaveType === 'object' ? leaveType._id : leaveType;
  };

  const filteredAndSortedRequests = requests
    .filter(r => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      
      // Leave type filter
      if (leaveTypeFilter !== 'all' && getLeaveTypeId(r.leaveTypeId) !== leaveTypeFilter) return false;
      
      // Date range filter
      if (dateFromFilter) {
        const fromDate = new Date(dateFromFilter);
        const requestDate = new Date(r.dates.from);
        if (requestDate < fromDate) return false;
      }
      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        const requestDate = new Date(r.dates.to);
        if (requestDate > toDate) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.dates.from).getTime() - new Date(b.dates.from).getTime();
        case 'date-desc':
          return new Date(b.dates.from).getTime() - new Date(a.dates.from).getTime();
        case 'duration-asc':
          return a.durationDays - b.durationDays;
        case 'duration-desc':
          return b.durationDays - a.durationDays;
        case 'submitted-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'submitted-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return new Date(b.dates.from).getTime() - new Date(a.dates.from).getTime();
      }
    });

  // Calculate summary stats
  const summaryStats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'approved').length,
    pending: requests.filter(r => r.status === 'pending').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    totalDays: requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.durationDays, 0),
  };

  // Clear filters
  const clearFilters = () => {
    setStatusFilter('all');
    setLeaveTypeFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setSortBy('date-desc');
  };

  return (
    <ProtectedRoute requiredRoles={[Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.HR_EMPLOYEE, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="My Leaves" role="Employee">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>📅 My Leave Management</h1>
              <p className={styles.subtitle}>View your leave requests and balances</p>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.backButton}
                onClick={() => router.push('/dashboard/employee')}
              >
                ← Back to Dashboard
              </button>
              <button
                className={styles.primaryButton}
                onClick={() => router.push('/dashboard/employee/leaves/request')}
              >
                + Submit Leave Request
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'requests' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              My Requests
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'balances' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('balances')}
            >
              Leave Balances
            </button>
          </div>

          {loading ? (
            <Spinner message="Loading..." />
          ) : activeTab === 'requests' ? (
            <>
              {/* REQ-032/033: Summary Stats */}
              <div className={styles.summaryStats}>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryValue}>{summaryStats.total}</span>
                  <span className={styles.summaryLabel}>Total Requests</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryValue}>{summaryStats.approved}</span>
                  <span className={styles.summaryLabel}>Approved</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryValue}>{summaryStats.pending}</span>
                  <span className={styles.summaryLabel}>Pending</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryValue}>{summaryStats.totalDays}</span>
                  <span className={styles.summaryLabel}>Days Taken</span>
                </div>
              </div>

              {/* REQ-033: Enhanced Filters */}
              <div className={styles.filterSection}>
                <div className={styles.filterRow}>
                  <div className={styles.filterGroup}>
                    <label>Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Leave Type:</label>
                    <select
                      value={leaveTypeFilter}
                      onChange={(e) => setLeaveTypeFilter(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="all">All Types</option>
                      {leaveTypes.map(type => (
                        <option key={type._id} value={type._id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label>From:</label>
                    <input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                      className={styles.filterInput}
                    />
                  </div>
                  <div className={styles.filterGroup}>
                    <label>To:</label>
                    <input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                      className={styles.filterInput}
                    />
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Sort By:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="date-desc">Date (Newest)</option>
                      <option value="date-asc">Date (Oldest)</option>
                      <option value="submitted-desc">Submitted (Newest)</option>
                      <option value="submitted-asc">Submitted (Oldest)</option>
                      <option value="duration-desc">Duration (Longest)</option>
                      <option value="duration-asc">Duration (Shortest)</option>
                    </select>
                  </div>
                  <button onClick={clearFilters} className={styles.clearFiltersBtn}>
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Requests List */}
              {filteredAndSortedRequests.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>📋</span>
                  <h3>No Leave Requests</h3>
                  <p>{requests.length > 0 ? 'No requests match your filters.' : "You haven't submitted any leave requests yet."}</p>
                  {requests.length === 0 && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => router.push('/dashboard/employee/leaves/request')}
                    >
                      Submit Your First Request
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.requestsList}>
                  {filteredAndSortedRequests.map((request) => (
                    <div key={request._id} className={styles.requestCard}>
                      <div className={styles.requestHeader}>
                        <div className={styles.requestType}>
                          <span className={styles.typeCode}>{getLeaveTypeCode(request.leaveTypeId)}</span>
                          <span className={styles.typeName}>{getLeaveTypeName(request.leaveTypeId)}</span>
                        </div>
                        <span className={`${styles.statusBadge} ${getStatusBadgeClass(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      <div className={styles.requestDetails}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>📆 Dates:</span>
                          <span className={styles.detailValue}>
                            {formatDate(request.dates.from)} - {formatDate(request.dates.to)}
                            {isPostLeave(request) && (
                              <span className={styles.postLeaveBadge}>Post-Leave</span>
                            )}
                          </span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>⏱️ Duration:</span>
                          <span className={styles.detailValue}>{request.durationDays} day(s)</span>
                        </div>
                        {request.justification && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>📝 Reason:</span>
                            <span className={styles.detailValue}>{request.justification}</span>
                          </div>
                        )}
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>🕐 Submitted:</span>
                          <span className={styles.detailValue}>{formatDate(request.createdAt)}</span>
                        </div>
                      </div>

                      {/* Approval Flow */}
                      {request.approvalFlow && request.approvalFlow.length > 0 && (
                        <div className={styles.approvalFlow}>
                          <span className={styles.approvalLabel}>Approval Status:</span>
                          <div className={styles.approvalSteps}>
                            {request.approvalFlow.map((step, index) => (
                              <div key={index} className={styles.approvalStep}>
                                <span className={`${styles.stepStatus} ${styles[`step${step.status}`]}`}>
                                  {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✗' : '○'}
                                </span>
                                <span className={styles.stepRole}>{step.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {request.status === 'pending' && (
                        <div className={styles.requestActions}>
                          <button
                            className={styles.editButton}
                            onClick={() => router.push(`/dashboard/employee/leaves/edit/${request._id}`)}
                          >
                            ✏️ Modify
                          </button>
                          <button
                            className={styles.cancelButton}
                            onClick={() => handleCancelRequest(request._id)}
                            disabled={cancellingId === request._id}
                          >
                            {cancellingId === request._id ? 'Cancelling...' : '❌ Cancel'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* REQ-031: Enhanced Balances Tab */
            <div className={styles.balancesSection}>
              {/* Total Balance Overview */}
              <div className={styles.balanceOverview}>
                <h2 className={styles.sectionTitle}>📊 Leave Balance Overview</h2>
                <div className={styles.overviewStats}>
                  <div className={styles.overviewStat}>
                    <span className={styles.overviewValue}>
                      {balances.reduce((sum, b) => sum + b.yearlyEntitlement, 0)}
                    </span>
                    <span className={styles.overviewLabel}>Total Entitled</span>
                  </div>
                  <div className={styles.overviewStat}>
                    <span className={styles.overviewValue}>
                      {balances.reduce((sum, b) => sum + (b.accruedRounded || b.yearlyEntitlement), 0)}
                    </span>
                    <span className={styles.overviewLabel}>Accrued</span>
                  </div>
                  <div className={styles.overviewStat}>
                    <span className={styles.overviewValue}>
                      {balances.reduce((sum, b) => sum + b.taken, 0)}
                    </span>
                    <span className={styles.overviewLabel}>Used</span>
                  </div>
                  <div className={styles.overviewStat}>
                    <span className={styles.overviewValue}>
                      {balances.reduce((sum, b) => sum + b.remaining, 0)}
                    </span>
                    <span className={styles.overviewLabel}>Available</span>
                  </div>
                </div>
              </div>

              {/* Individual Balance Cards */}
              <div className={styles.balancesGrid}>
                {balances.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📊</span>
                    <h3>No Leave Entitlements</h3>
                    <p>You don&apos;t have any leave entitlements assigned yet. Please contact HR.</p>
                  </div>
                ) : (
                  balances.map((balance, index) => (
                    <div key={index} className={styles.balanceCard}>
                      <div className={styles.balanceHeader}>
                        <h3 className={styles.balanceType}>{getLeaveTypeName(balance.leaveTypeId)}</h3>
                        <span className={styles.balanceCode}>{getLeaveTypeCode(balance.leaveTypeId)}</span>
                      </div>
                      
                      {/* Main Stats */}
                      <div className={styles.balanceStats}>
                        <div className={styles.balanceStat}>
                          <span className={styles.statValue}>{balance.yearlyEntitlement}</span>
                          <span className={styles.statLabel}>Entitled</span>
                        </div>
                        <div className={styles.balanceStat}>
                          <span className={styles.statValue}>{balance.accruedRounded || balance.yearlyEntitlement}</span>
                          <span className={styles.statLabel}>Accrued</span>
                        </div>
                        <div className={styles.balanceStat}>
                          <span className={styles.statValue}>{balance.taken}</span>
                          <span className={styles.statLabel}>Taken</span>
                        </div>
                        <div className={`${styles.balanceStat} ${styles.remaining}`}>
                          <span className={styles.statValue}>{balance.remaining}</span>
                          <span className={styles.statLabel}>Remaining</span>
                        </div>
                      </div>

                      {/* Additional Stats Row */}
                      <div className={styles.balanceStatsSecondary}>
                        <div className={styles.balanceStatSmall}>
                          <span className={styles.statValueSmall}>{balance.pending}</span>
                          <span className={styles.statLabelSmall}>Pending</span>
                        </div>
                        <div className={styles.balanceStatSmall}>
                          <span className={styles.statValueSmall}>{balance.carryForward || 0}</span>
                          <span className={styles.statLabelSmall}>Carry-Over</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className={styles.balanceBar}>
                        <div
                          className={styles.balanceUsed}
                          style={{ width: `${Math.min((balance.taken / balance.yearlyEntitlement) * 100, 100)}%` }}
                        />
                        <div
                          className={styles.balancePending}
                          style={{ width: `${Math.min((balance.pending / balance.yearlyEntitlement) * 100, 100)}%` }}
                        />
                      </div>

                      {/* Dates Info */}
                      {(balance.lastAccrualDate || balance.nextResetDate) && (
                        <div className={styles.balanceDates}>
                          {balance.lastAccrualDate && (
                            <span className={styles.dateInfo}>
                              Last Accrual: {formatDate(balance.lastAccrualDate)}
                            </span>
                          )}
                          {balance.nextResetDate && (
                            <span className={styles.dateInfo}>
                              Resets: {formatDate(balance.nextResetDate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
