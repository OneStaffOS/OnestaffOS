/**
 * Archived Performance Records Page (Route: /hr/performance/archived)
 * REQ-OD-05, Phase 5: Closure and Archiving
 * Access historical appraisal records for reference, reporting, and performance trend analysis
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './archived.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface ArchivedRecord {
  _id: string;
  cycleId: {
    name: string;
    startDate: string;
    endDate: string;
    cycleType: string;
  };
  employeeProfileId: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  managerProfileId: {
    firstName: string;
    lastName: string;
  };
  totalScore?: number;
  overallRatingLabel?: string;
  managerSubmittedAt?: string;
  hrPublishedAt?: string;
  archivedAt?: string;
  status: string;
}

export default function ArchivedRecordsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ArchivedRecord[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('');
  const [cycles, setCycles] = useState<string[]>([]);

  useEffect(() => {
    fetchArchivedRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCycle, records]);

  const fetchArchivedRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/performance/records/archived');
      setRecords(response.data);
      
      // Extract unique cycles
      const uniqueCycles = Array.from(
        new Set(response.data.map((r: ArchivedRecord) => r.cycleId.name))
      );
      setCycles(uniqueCycles as string[]);
    } catch (err: any) {
      console.error('Failed to fetch archived records:', err);
      alert('Failed to load archived records');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.employeeProfileId.firstName.toLowerCase().includes(term) ||
        record.employeeProfileId.lastName.toLowerCase().includes(term) ||
        record.employeeProfileId.employeeNumber.toLowerCase().includes(term) ||
        record.cycleId.name.toLowerCase().includes(term)
      );
    }

    // Cycle filter
    if (selectedCycle) {
      filtered = filtered.filter(record => record.cycleId.name === selectedCycle);
    }

    setFilteredRecords(filtered);
  };

  const handleViewRecord = (recordId: string) => {
    router.push(`/hr/performance/records/${recordId}`);
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records to export');
      return;
    }

    const csvHeaders = [
      'Employee Number',
      'Employee Name',
      'Cycle',
      'Cycle Type',
      'Manager',
      'Total Score',
      'Overall Rating',
      'Submitted Date',
      'Published Date',
      'Archived Date',
    ].join(',');

    const csvRows = filteredRecords.map(record => [
      record.employeeProfileId.employeeNumber,
      `${record.employeeProfileId.firstName} ${record.employeeProfileId.lastName}`,
      record.cycleId.name,
      record.cycleId.cycleType,
      `${record.managerProfileId.firstName} ${record.managerProfileId.lastName}`,
      record.totalScore || 'N/A',
      record.overallRatingLabel || 'N/A',
      record.managerSubmittedAt ? new Date(record.managerSubmittedAt).toLocaleDateString() : 'N/A',
      record.hrPublishedAt ? new Date(record.hrPublishedAt).toLocaleDateString() : 'N/A',
      record.archivedAt ? new Date(record.archivedAt).toLocaleDateString() : 'N/A',
    ].join(','));

    const csv = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archived-appraisals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Archived Performance Records" role="HR">
        <div className={styles.container}>
          {/* Header Section */}
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <h2>Historical Appraisal Records</h2>
              <p>Access and analyze archived performance appraisals for long-term trends and evidence-based decision making</p>
            </div>
            <div className={styles.headerActions}>
              <button onClick={handleExportCSV} className={styles.exportButton}>
                Export to CSV
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Search Employee</label>
              <input
                type="text" placeholder="Name or employee number..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label>Filter by Cycle</label>
              <select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">All Cycles</option>
                {cycles.map(cycle => (
                  <option key={cycle} value={cycle}>{cycle}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Results</label>
              <div className={styles.resultCount}>
                {filteredRecords.length} of {records.length} records
              </div>
            </div>
          </div>

          {/* Records Table */}
          {loading ? (
            <Spinner message="Loading archived records..." />
          ) : filteredRecords.length === 0 ? (
            <div className={styles.noRecords}>
              <p>No archived records found</p>
              {searchTerm || selectedCycle ? (
                <button onClick={() => { setSearchTerm(''); setSelectedCycle(''); }} className={styles.clearFiltersButton}>
                  Clear Filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.recordsTable}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Cycle</th>
                    <th>Type</th>
                    <th>Manager</th>
                    <th>Score</th>
                    <th>Rating</th>
                    <th>Archived Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(record => (
                    <tr key={record._id}>
                      <td>
                        <div className={styles.employeeCell}>
                          <strong>{record.employeeProfileId.firstName} {record.employeeProfileId.lastName}</strong>
                          <span className={styles.employeeNumber}>{record.employeeProfileId.employeeNumber}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.cycleCell}>
                          <strong>{record.cycleId.name}</strong>
                          <span className={styles.cycleDates}>
                            {new Date(record.cycleId.startDate).toLocaleDateString()} - {new Date(record.cycleId.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.cycleType}>{record.cycleId.cycleType}</span>
                      </td>
                      <td>{record.managerProfileId.firstName} {record.managerProfileId.lastName}</td>
                      <td>
                        <span className={styles.score}>{record.totalScore?.toFixed(1) || 'N/A'}</span>
                      </td>
                      <td>
                        <span className={`${styles.ratingBadge} ${styles[record.overallRatingLabel?.toLowerCase().replace(/\s+/g, '') || 'unknown']}`}>
                          {record.overallRatingLabel || 'N/A'}
                        </span>
                      </td>
                      <td>{record.archivedAt ? new Date(record.archivedAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button 
                          onClick={() => handleViewRecord(record._id)}
                          className={styles.viewButton}
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}