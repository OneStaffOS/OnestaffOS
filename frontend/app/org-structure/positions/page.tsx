/**
 * Position Management Page (Route: /org-structure/positions)
 * Manage positions: create, update, and deactivate
 * Note: Positions cannot be deleted if historical assignments exist (delimit only)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { Position, PositionStatus } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './positions.module.css';

interface PositionAssignment {
  _id: string;
  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  positionId: string;
  startDate: string;
  endDate?: string;
}

export default function PositionsPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<PositionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchPositions();
    fetchAssignments();
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/organization-structure/positions');
      setPositions(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get('/organization-structure/assignments');
      // Filter for active assignments only (no endDate)
      const activeAssignments = response.data.filter((a: PositionAssignment) => !a.endDate);
      setAssignments(activeAssignments);
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err.response?.data?.message || err.message);
      // If permission denied, assignments will remain empty array
    }
  };

  const getAssignedEmployee = (positionId: string) => {
    const assignment = assignments.find(a => {
      // Handle both cases: positionId as string or as populated object
      const assignmentPositionId = typeof a.positionId === 'string' 
        ? a.positionId 
        : (a.positionId as any)?._id;
      return assignmentPositionId === positionId;
    });
    return assignment?.employeeProfileId;
  };

  const filteredPositions = positions.filter(pos => {
    const matchesSearch = pos.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (pos.code && pos.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (pos.departmentId?.name && pos.departmentId.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'ALL' || 
                         (filterStatus === 'ACTIVE' && pos.isActive) ||
                         (filterStatus === 'INACTIVE' && !pos.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleDeactivate = async (positionId: string) => {
    if (!confirm('Are you sure you want to deactivate this position? Historical assignments will be preserved.')) {
      return;
    }

    try {
      await axios.put(`/organization-structure/positions/${positionId}/deactivate`);
      alert('Position deactivated successfully. Historical records preserved.');
      fetchPositions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate position');
    }
  };

  const handleActivate = async (positionId: string) => {
    try {
      await axios.put(`/organization-structure/positions/${positionId}`, {
        isActive: true
      });
      alert('Position activated successfully');
      fetchPositions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to activate position');
    }
  };

  const handleRemoveEmployee = async (positionId: string) => {
    const assignment = assignments.find(a => {
      const assignmentPositionId = typeof a.positionId === 'string' 
        ? a.positionId 
        : (a.positionId as any)?._id;
      return assignmentPositionId === positionId;
    });

    if (!assignment) {
      alert('No active assignment found for this position');
      return;
    }

    const employee = assignment.employeeProfileId;
    const confirmMessage = `Are you sure you want to remove ${employee.firstName} ${employee.lastName} from this position?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await axios.delete(`/organization-structure/assignments/${assignment._id}`);
      alert('Employee removed from position successfully');
      fetchAssignments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove employee from position');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
        <div className={styles.container}>
          <Spinner message="Loading positions..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Positions</h1>
            <p className={styles.subtitle}>Manage organizational positions</p>
          </div>
          <button
            className={styles.createButton}
            onClick={() => router.push('/org-structure/positions/create')}
          >
            + Create Position
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Search and Filters */}
        <div className={styles.controls}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search positions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className={styles.filters}>
            <button
              className={`${styles.filterButton} ${filterStatus === 'ALL' ? styles.active : ''}`}
              onClick={() => setFilterStatus('ALL')}
            >
              All ({positions.length})
            </button>
            <button
              className={`${styles.filterButton} ${filterStatus === 'ACTIVE' ? styles.active : ''}`}
              onClick={() => setFilterStatus('ACTIVE')}
            >
              Active ({positions.filter(p => p.isActive).length})
            </button>
            <button
              className={`${styles.filterButton} ${filterStatus === 'VACANT' ? styles.active : ''}`}
              onClick={() => setFilterStatus('VACANT')}
            >
              Vacant ({positions.filter(p => !p.isActive).length})
            </button>
            <button
              className={`${styles.filterButton} ${filterStatus === 'FROZEN' ? styles.active : ''}`}
              onClick={() => setFilterStatus('FROZEN')}
            >
              Frozen (0)
            </button>
          </div>
        </div>

        {/* Positions Grid */}
        {filteredPositions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No positions found</p>
            <button
              className={styles.createButton}
              onClick={() => router.push('/org-structure/positions/create')}
            >
              Create First Position
            </button>
          </div>
        ) : (
          <div className={styles.positionsGrid}>
            {filteredPositions.map((position) => (
              <div key={position._id} className={styles.positionCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.positionTitle}>{position.title}</h3>
                    <div className={styles.positionId}>{position.code}</div>
                  </div>
                  <span className={`${styles.statusBadge} ${position.isActive ? styles.active : styles.inactive}`}>
                    {position.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Department:</span>
                    <span className={styles.value}>{position.departmentId?.name || 'Unknown'}</span>
                  </div>
                  
                  {position.description && (
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Description:</span>
                      <span className={styles.value}>{position.description}</span>
                    </div>
                  )}

                  {position.reportsToPositionId && (
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Reports To:</span>
                      <span className={styles.value}>
                        {position.reportsToPositionId.title}
                      </span>
                    </div>
                  )}

                  <div className={styles.infoRow}>
                    <span className={styles.label}>Assigned To:</span>
                    {(() => {
                      const employee = getAssignedEmployee(position._id);
                      return employee ? (
                        <span className={styles.value}>
                          {employee.firstName} {employee.lastName}
                          {employee.employeeNumber && ` (${employee.employeeNumber})`}
                        </span>
                      ) : (
                        <span className={styles.vacantBadge}>Not Available</span>
                      );
                    })()}
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => router.push(`/org-structure/positions/${position._id}`)}
                  >
                    View Details
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => router.push(`/org-structure/positions/${position._id}/edit`)}
                  >
                    Edit
                  </button>
                  {getAssignedEmployee(position._id) && (
                    <button
                      className={`${styles.actionButton} ${styles.warning}`}
                      onClick={() => handleRemoveEmployee(position._id)}
                    >
                      Remove Employee
                    </button>
                  )}
                  {position.isActive ? (
                    <button
                      className={`${styles.actionButton} ${styles.danger}`}
                      onClick={() => handleDeactivate(position._id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className={`${styles.actionButton} ${styles.success}`}
                      onClick={() => handleActivate(position._id)}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
