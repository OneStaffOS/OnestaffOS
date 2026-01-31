"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './monitoring.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Position {
  _id: string;
  requisitionId: string;
  templateId?: {
    title: string;
    department?: string;
  };
  location?: string;
  openings: number;
  publishStatus: string;
  createdAt: string;
  applicationCount?: number;
  inProgressCount?: number;
  interviewCount?: number;
  offerCount?: number;
  referralCount?: number;
}

interface Application {
  _id: string;
  candidateId?: {
    _id: string;
    firstName: string;
    lastName: string;
    personalEmail: string;
    mobilePhone?: string;
  };
  status: string;
  currentStage: string;
  appliedAt?: string;
  createdAt?: string;
  isReferral?: boolean;
}

export default function RecruitmentMonitoringPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Application filters
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [appStageFilter, setAppStageFilter] = useState('all');

  useEffect(() => {
    fetchPositions();
  }, []);

  useEffect(() => {
    filterPositions();
  }, [positions, searchQuery, statusFilter, departmentFilter]);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const requisitionsRes = await axios.get('/recruitment/job-requisitions');
      const allRequisitions = requisitionsRes.data;

      // Fetch all applications
      const applicationsRes = await axios.get('/recruitment/applications');
      const allApplications = applicationsRes.data;

      // Map applications to requisitions and calculate stats
      const positionsWithStats = allRequisitions.map((req: any) => {
        const reqApplications = allApplications.filter(
          (app: any) => app.requisitionId?._id === req._id
        );

        return {
          ...req,
          applicationCount: reqApplications.length,
          inProgressCount: reqApplications.filter((app: any) => 
            app.status === 'in_process' || app.status === 'submitted'
          ).length,
          interviewCount: reqApplications.filter((app: any) => 
            app.currentStage === 'department_interview' || app.currentStage === 'hr_interview'
          ).length,
          offerCount: reqApplications.filter((app: any) => app.status === 'offer').length,
          referralCount: reqApplications.filter((app: any) => app.isReferral).length,
        };
      });

      setPositions(positionsWithStats);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  const filterPositions = () => {
    let filtered = [...positions];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(pos => 
        pos.templateId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pos.requisitionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pos.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pos => pos.publishStatus === statusFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(pos => pos.templateId?.department === departmentFilter);
    }

    setFilteredPositions(filtered);
  };

  const handlePositionClick = async (position: Position) => {
    setSelectedPosition(position);
    try {
      setLoading(true);
      const applicationsRes = await axios.get('/recruitment/applications');
      const allApplications = applicationsRes.data;
      
      const positionApplications = allApplications.filter(
        (app: any) => app.requisitionId?._id === position._id
      );
      
      setApplications(positionApplications);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueDepartments = () => {
    const departments = new Set(
      positions
        .map(pos => pos.templateId?.department)
        .filter(dept => dept)
    );
    return Array.from(departments);
  };

  const getFilteredApplications = () => {
    let filtered = [...applications];

    if (appStatusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === appStatusFilter);
    }

    if (appStageFilter !== 'all') {
      filtered = filtered.filter(app => app.currentStage === appStageFilter);
    }

    return filtered;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted': return styles.statusSubmitted;
      case 'in_process': return styles.statusInProgress;
      case 'offer': return styles.statusOffer;
      case 'hired': return styles.statusHired;
      case 'rejected': return styles.statusRejected;
      default: return styles.statusDefault;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Recruitment Progress Monitoring</h1>
          <p>Monitor all open positions and track candidate progress</p>
        </div>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.mainContent}>
        {/* Positions List */}
        <div className={styles.positionsPanel}>
          <div className={styles.panelHeader}>
            <h2>Open Positions</h2>
            <span className={styles.badge}>{filteredPositions.length}</span>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <input
              type="text" placeholder="Search positions..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Departments</option>
              {getUniqueDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Positions List */}
          <div className={styles.positionsList}>
            {loading && !selectedPosition ? (
              <Spinner message="Loading positions..." />
            ) : filteredPositions.length === 0 ? (
              <div className={styles.empty}>No positions found</div>
            ) : (
              filteredPositions.map(position => (
                <div
                  key={position._id}
                  className={`${styles.positionCard} ${selectedPosition?._id === position._id ? styles.positionCardActive : ''}`}
                  onClick={() => handlePositionClick(position)}
                >
                  <div className={styles.positionHeader}>
                    <h3>{position.templateId?.title || 'Untitled Position'}</h3>
                    <span className={`${styles.statusBadge} ${
                      position.publishStatus === 'PUBLISHED' ? styles.publishedBadge : 
                      position.publishStatus === 'CLOSED' ? styles.closedBadge : 
                      styles.draftBadge
                    }`}>
                      {position.publishStatus}
                    </span>
                  </div>
                  
                  <div className={styles.positionMeta}>
                    <span> {position.location || 'Not specified'}</span>
                    <span> {position.openings} opening{position.openings !== 1 ? 's' : ''}</span>
                    <span> {position.requisitionId}</span>
                  </div>

                  <div className={styles.positionStats}>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>{position.applicationCount || 0}</span>
                      <span className={styles.statLabel}>Applications</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>{position.inProgressCount || 0}</span>
                      <span className={styles.statLabel}>In Progress</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>{position.interviewCount || 0}</span>
                      <span className={styles.statLabel}>Interviews</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>{position.offerCount || 0}</span>
                      <span className={styles.statLabel}>Offers</span>
                    </div>
                    {position.referralCount! > 0 && (
                      <div className={styles.stat}>
                        <span className={styles.statValue} style={{ color: '#f59e0b' }}> {position.referralCount}</span>
                        <span className={styles.statLabel}>Referrals</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Candidates Panel */}
        <div className={styles.candidatesPanel}>
          {selectedPosition ? (
            <>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Candidates - {selectedPosition.templateId?.title}</h2>
                  <p className={styles.panelSubtitle}>
                    {applications.length} total application{applications.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedPosition(null)}
                  className={styles.closeButton}
                >
                  
                </button>
              </div>

              {/* Application Filters */}
              <div className={styles.filters}>
                <select
                  value={appStatusFilter}
                  onChange={(e) => setAppStatusFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="in_process">In Process</option>
                  <option value="offer">Offer</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={appStageFilter}
                  onChange={(e) => setAppStageFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Stages</option>
                  <option value="screening">Screening</option>
                  <option value="department_interview">Department Interview</option>
                  <option value="hr_interview">HR Interview</option>
                  <option value="offer">Offer</option>
                </select>
              </div>

              {/* Applications Table */}
              <div className={styles.applicationsTable}>
                {loading ? (
                  <Spinner message="Loading applications..." />
                ) : getFilteredApplications().length === 0 ? (
                  <div className={styles.empty}>No applications found</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Stage</th>
                        <th>Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredApplications().map(app => (
                        <tr key={app._id}>
                          <td>
                            <div className={styles.candidateName}>
                              {app.candidateId ? 
                                `${app.candidateId.firstName} ${app.candidateId.lastName}` : 
                                'N/A'}
                              {app.isReferral && (
                                <span className={styles.referralBadge}> Referral</span>
                              )}
                            </div>
                          </td>
                          <td>{app.candidateId?.personalEmail || 'N/A'}</td>
                          <td>{app.candidateId?.mobilePhone || 'N/A'}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(app.status)}`}>
                              {app.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td>
                            <span className={styles.stageBadge}>
                              {app.currentStage.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td>
                            {new Date(app.appliedAt || app.createdAt || '').toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}></div>
              <h3>Select a Position</h3>
              <p>Click on a position from the list to view its candidates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}