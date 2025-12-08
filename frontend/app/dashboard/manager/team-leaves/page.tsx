/**
 * Manager Team Leaves Page
 * REQ-034: Manager view team members' leave balances and upcoming leaves
 * REQ-035: Filter and sort leave data by leave type, date range, department, and status
 * REQ-039: Flag irregular patterns
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './team-leaves.module.css';

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  email?: string;
  primaryDepartmentId?: { _id: string; name: string };
}

interface LeaveType {
  _id: string;
  code: string;
  name: string;
}

interface LeaveBalance {
  _id: string;
  employeeId: Employee;
  leaveTypeId: LeaveType;
  yearlyEntitlement: number;
  accruedRounded?: number;
  carryForward?: number;
  taken: number;
  pending: number;
  remaining: number;
}

interface LeaveRequest {
  _id: string;
  employeeId: Employee;
  leaveTypeId: LeaveType;
  dates: { from: string; to: string };
  durationDays: number;
  justification?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  irregularPatternFlag?: boolean;
  createdAt: string;
}

type TabType = 'balances' | 'upcoming' | 'history';

export default function ManagerTeamLeavesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('balances');
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [teamBalances, setTeamBalances] = useState<LeaveBalance[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  // Flag modal
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch team data from performance endpoint (already has team members)
      const teamRes = await axios.get('/performance/team');
      const members = teamRes.data.teamMembers?.map((m: any) => m.employee) || [];
      setTeamMembers(members);

      // Fetch leave types
      const typesRes = await axios.get('/leaves/types');
      setLeaveTypes(typesRes.data);

      if (members.length > 0) {
        const memberIds = members.map((m: Employee) => m._id);

        // Fetch team balances
        const balancesRes = await axios.post('/leaves/balances/team', { teamMemberIds: memberIds });
        setTeamBalances(balancesRes.data);

        // Fetch team leave requests (upcoming and history)
        const requestsPromises = memberIds.map((id: string) => 
          axios.get(`/leaves/requests?employeeId=${id}`)
        );
        const requestsResults = await Promise.all(requestsPromises);
        const allRequests = requestsResults.flatMap(res => res.data);
        setTeamRequests(allRequests);
      }
    } catch (err: any) {
      console.error('Failed to fetch team data:', err);
      setError(err.response?.data?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEmployeeName = (employee: Employee | string): string => {
    if (typeof employee === 'object' && employee !== null) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return 'Unknown';
  };

  const getLeaveTypeName = (leaveType: LeaveType | string): string => {
    if (typeof leaveType === 'object' && leaveType !== null) {
      return leaveType.name;
    }
    const type = leaveTypes.find(t => t._id === leaveType);
    return type?.name || 'Unknown';
  };

  // REQ-039: Flag irregular pattern
  const handleFlagPattern = async () => {
    if (!selectedRequest) return;

    try {
      setFlagging(true);
      // Get current user ID for flaggedBy
      const profileRes = await axios.get('/employee-profile/my-profile');
      const currentUserId = profileRes.data?._id;
      
      await axios.post('/leaves/requests/flag-irregular', {
        requestId: selectedRequest._id,
        irregularPatternFlag: true,
        flaggedBy: currentUserId || 'unknown',
        reason: flagReason || 'Flagged by manager',
      });
      setSuccess('Leave request flagged as irregular pattern');
      setShowFlagModal(false);
      setSelectedRequest(null);
      setFlagReason('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to flag request');
    } finally {
      setFlagging(false);
    }
  };

  const handleUnflagPattern = async (requestId: string) => {
    try {
      await axios.post('/leaves/requests/flag-irregular', {
        requestId,
        irregularPatternFlag: false,
        flaggedBy: '',
        reason: '',
      });
      setSuccess('Flag removed from leave request');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove flag');
    }
  };

  // Filter functions
  const filteredBalances = teamBalances.filter(b => {
    if (employeeFilter !== 'all') {
      const empId = typeof b.employeeId === 'object' ? b.employeeId._id : b.employeeId;
      if (empId !== employeeFilter) return false;
    }
    if (leaveTypeFilter !== 'all') {
      const typeId = typeof b.leaveTypeId === 'object' ? b.leaveTypeId._id : b.leaveTypeId;
      if (typeId !== leaveTypeFilter) return false;
    }
    return true;
  });

  const upcomingLeaves = teamRequests
    .filter(r => {
      if (r.status !== 'approved') return false;
      const startDate = new Date(r.dates.from);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return startDate >= today;
    })
    .sort((a, b) => new Date(a.dates.from).getTime() - new Date(b.dates.from).getTime());

  const filteredHistory = teamRequests.filter(r => {
    if (employeeFilter !== 'all') {
      const empId = typeof r.employeeId === 'object' ? r.employeeId._id : r.employeeId;
      if (empId !== employeeFilter) return false;
    }
    if (leaveTypeFilter !== 'all') {
      const typeId = typeof r.leaveTypeId === 'object' ? r.leaveTypeId._id : r.leaveTypeId;
      if (typeId !== leaveTypeFilter) return false;
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
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
  }).sort((a, b) => new Date(b.dates.from).getTime() - new Date(a.dates.from).getTime());

  const clearFilters = () => {
    setEmployeeFilter('all');
    setLeaveTypeFilter('all');
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
  };

  // Calculate team stats
  const teamStats = {
    totalMembers: teamMembers.length,
    totalUpcoming: upcomingLeaves.length,
    totalPending: teamRequests.filter(r => r.status === 'pending').length,
    flaggedRequests: teamRequests.filter(r => r.irregularPatternFlag).length,
  };

  return (
    <ProtectedRoute requiredRoles={[Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Team Leave Management" role="Manager">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>👥 Team Leave Management</h1>
              <p className={styles.subtitle}>View and manage your team&apos;s leave balances and requests</p>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.backButton}
                onClick={() => router.push('/dashboard/manager')}
              >
                ← Back to Dashboard
              </button>
              <button
                className={styles.primaryButton}
                onClick={() => router.push('/dashboard/manager/leave-requests')}
              >
                📋 Pending Approvals
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Team Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{teamStats.totalMembers}</span>
              <span className={styles.statLabel}>Team Members</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{teamStats.totalUpcoming}</span>
              <span className={styles.statLabel}>Upcoming Leaves</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{teamStats.totalPending}</span>
              <span className={styles.statLabel}>Pending Approval</span>
            </div>
            <div className={`${styles.statCard} ${teamStats.flaggedRequests > 0 ? styles.flaggedStat : ''}`}>
              <span className={styles.statValue}>{teamStats.flaggedRequests}</span>
              <span className={styles.statLabel}>Flagged Patterns</span>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'balances' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('balances')}
            >
              📊 Team Balances
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'upcoming' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              📅 Upcoming Leaves
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📜 Leave History
            </button>
          </div>

          {loading ? (
            <Spinner message="Loading team data..." />
          ) : (
            <>
              {/* Filters */}
              {(activeTab === 'balances' || activeTab === 'history') && (
                <div className={styles.filterSection}>
                  <div className={styles.filterRow}>
                    <div className={styles.filterGroup}>
                      <label>Employee:</label>
                      <select
                        value={employeeFilter}
                        onChange={(e) => setEmployeeFilter(e.target.value)}
                        className={styles.filterSelect}
                      >
                        <option value="all">All Team Members</option>
                        {teamMembers.map(member => (
                          <option key={member._id} value={member._id}>
                            {member.firstName} {member.lastName}
                          </option>
                        ))}
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
                    {activeTab === 'history' && (
                      <>
                        <div className={styles.filterGroup}>
                          <label>Status:</label>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={styles.filterSelect}
                          >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
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
                      </>
                    )}
                    <button onClick={clearFilters} className={styles.clearFiltersBtn}>
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Content based on active tab */}
              {activeTab === 'balances' && (
                <div className={styles.balancesTable}>
                  {filteredBalances.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📊</span>
                      <h3>No Balance Data</h3>
                      <p>No leave balance data found for your team.</p>
                    </div>
                  ) : (
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Leave Type</th>
                            <th>Entitled</th>
                            <th>Accrued</th>
                            <th>Taken</th>
                            <th>Pending</th>
                            <th>Remaining</th>
                            <th>Carry-Over</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBalances.map((balance) => (
                            <tr key={balance._id}>
                              <td className={styles.employeeCell}>
                                {getEmployeeName(balance.employeeId)}
                              </td>
                              <td>{getLeaveTypeName(balance.leaveTypeId)}</td>
                              <td>{balance.yearlyEntitlement}</td>
                              <td>{balance.accruedRounded || balance.yearlyEntitlement}</td>
                              <td>{balance.taken}</td>
                              <td>{balance.pending}</td>
                              <td className={styles.remainingCell}>{balance.remaining}</td>
                              <td>{balance.carryForward || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'upcoming' && (
                <div className={styles.upcomingList}>
                  {upcomingLeaves.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📅</span>
                      <h3>No Upcoming Leaves</h3>
                      <p>No approved upcoming leaves for your team.</p>
                    </div>
                  ) : (
                    <div className={styles.leaveCards}>
                      {upcomingLeaves.map((leave) => (
                        <div key={leave._id} className={styles.leaveCard}>
                          <div className={styles.leaveCardHeader}>
                            <span className={styles.employeeName}>
                              {getEmployeeName(leave.employeeId)}
                            </span>
                            <span className={styles.leaveDuration}>
                              {leave.durationDays} day(s)
                            </span>
                          </div>
                          <div className={styles.leaveCardBody}>
                            <div className={styles.leaveInfo}>
                              <span className={styles.leaveType}>
                                {getLeaveTypeName(leave.leaveTypeId)}
                              </span>
                              <span className={styles.leaveDates}>
                                {formatDate(leave.dates.from)} → {formatDate(leave.dates.to)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className={styles.historyTable}>
                  {filteredHistory.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📜</span>
                      <h3>No Leave History</h3>
                      <p>No leave requests match your filters.</p>
                    </div>
                  ) : (
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Leave Type</th>
                            <th>Dates</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.map((request) => (
                            <tr key={request._id} className={request.irregularPatternFlag ? styles.flaggedRow : ''}>
                              <td className={styles.employeeCell}>
                                {getEmployeeName(request.employeeId)}
                                {request.irregularPatternFlag && (
                                  <span className={styles.flagBadge}>⚠️ Flagged</span>
                                )}
                              </td>
                              <td>{getLeaveTypeName(request.leaveTypeId)}</td>
                              <td>
                                {formatDate(request.dates.from)} → {formatDate(request.dates.to)}
                              </td>
                              <td>{request.durationDays} day(s)</td>
                              <td>
                                <span className={`${styles.statusBadge} ${styles[`status${request.status}`]}`}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              </td>
                              <td>
                                {request.irregularPatternFlag ? (
                                  <button
                                    className={styles.unflagButton}
                                    onClick={() => handleUnflagPattern(request._id)}
                                  >
                                    Remove Flag
                                  </button>
                              ) : (
                                <button
                                  className={styles.flagButton}
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowFlagModal(true);
                                  }}
                                >
                                  🚩 Flag Pattern
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Flag Modal */}
          {showFlagModal && selectedRequest && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h2 className={styles.modalTitle}>🚩 Flag Irregular Pattern</h2>
                <p className={styles.modalDescription}>
                  You are flagging a leave request by {getEmployeeName(selectedRequest.employeeId)} 
                  for {getLeaveTypeName(selectedRequest.leaveTypeId)} 
                  ({formatDate(selectedRequest.dates.from)} - {formatDate(selectedRequest.dates.to)}).
                </p>
                <div className={styles.modalField}>
                  <label>Reason for flagging (optional):</label>
                  <textarea
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Describe the irregular pattern observed..."
                    rows={3}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowFlagModal(false);
                      setSelectedRequest(null);
                      setFlagReason('');
                    }}
                    disabled={flagging}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.confirmButton}
                    onClick={handleFlagPattern}
                    disabled={flagging}
                  >
                    {flagging ? 'Flagging...' : 'Confirm Flag'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
