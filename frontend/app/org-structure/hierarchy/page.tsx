/**
 * Organizational Hierarchy Page (Route: /org-structure/hierarchy)
 * Employees can view the organizational hierarchy
 * Managers can view their team's structure
 * Access is role-based
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import { useAuth } from '@/app/context/AuthContext';
import axios from '@/lib/axios-config';
import { Department, Position } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './hierarchy.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface DepartmentWithPositions {
  id: string;
  code: string;
  name: string;
  description: string;
  headPosition?: any;
  positions: any[];
}

interface HierarchyResponse {
  departments: DepartmentWithPositions[];
}

export default function HierarchyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<DepartmentWithPositions[]>([]);
  const [viewMode, setViewMode] = useState<'full' | 'my-team'>('full');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // BR 41: Determine user role type
  const isManagerRole = user?.roles?.some(role => 
    [Role.DEPARTMENT_HEAD, Role.HR_ADMIN, Role.HR_MANAGER, Role.SYSTEM_ADMIN].includes(role as Role)
  ) || false;
  const isEmployeeOnly = user?.roles?.includes(Role.DEPARTMENT_EMPLOYEE) && !isManagerRole;

  // Set default view based on role when user is loaded
  useEffect(() => {
    if (user && isEmployeeOnly) {
      // Employees always see full hierarchy (their view within it)
      setViewMode('full');
    }
  }, [user, isEmployeeOnly]);

  useEffect(() => {
    fetchHierarchy();
  }, [viewMode]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      // BR 41: Employees only access full hierarchy, managers can access both
      const endpoint = (viewMode === 'my-team' && isManagerRole)
        ? '/organization-structure/hierarchy/my-team'
        : '/organization-structure/hierarchy';
      const response = await axios.get<HierarchyResponse>(endpoint);
      
      // Validate response data
      if (response.data && response.data.departments && Array.isArray(response.data.departments)) {
        setDepartments(response.data.departments);
      } else {
        setDepartments([]);
      }
      setError('');
    } catch (err: any) {
      console.error('Hierarchy fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load hierarchy');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const renderDepartmentNode = (dept: DepartmentWithPositions) => {
    // Separate positions into head, reporting positions, and independent positions
    const headPosition = dept.headPosition;
    const headPositionId = headPosition?._id || headPosition?.id;
    
    // Filter out the head position from the positions array to avoid duplication
    const filteredPositions = dept.positions.filter((p: any) => {
      const posId = p.id || p._id;
      return posId !== headPositionId;
    });
    
    const positionsWithReporting = filteredPositions.filter((p: any) => p.reportsTo);
    const independentPositions = filteredPositions.filter((p: any) => !p.reportsTo);

    // Build a tree structure for positions
    const buildPositionTree = (position: any, level: number = 0): any => {
      const positionId = position.id || position._id;
      const subordinates = filteredPositions.filter((p: any) => {
        const reportsToId = p.reportsTo?._id || p.reportsTo?.id;
        return reportsToId === positionId;
      });
      
      const isHeadPosition = headPositionId && positionId === headPositionId;
      
      return (
        <div key={positionId} style={{ marginLeft: level > 0 ? '2rem' : '0' }}>
          <div 
            className={`${styles.positionBox} ${isHeadPosition ? styles.headPositionBox : ''}`}
            onClick={() => router.push(`/org-structure/positions/${positionId}`)}
          >
            {isHeadPosition && (
              <div className={styles.headBadge}>Department Head</div>
            )}
            <div className={styles.positionTitle}>{position.title}</div>
            <div className={styles.positionCode}>{position.code}</div>
            <div className={styles.vacantLabel}>Vacant</div>
            {level > 0 && (
              <div className={styles.reportingIndicator}>
                ↑ Reports to: {position.reportsTo?.title || 'Head'}
              </div>
            )}
          </div>
          {subordinates.length > 0 && (
            <div className={styles.subordinatesContainer}>
              {subordinates.map((sub: any) => buildPositionTree(sub, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div key={dept.id} className={styles.departmentNode}>
        <div className={styles.departmentCard}>
          <div className={styles.departmentHeader}>
            <div>
              <h3 className={styles.departmentName}>{dept.name}</h3>
              <div className={styles.departmentId}>{dept.code}</div>
              <div className={styles.departmentDescription}>{dept.description}</div>
            </div>
          </div>

          {/* Positions in this department as a tree */}
          <div className={styles.positionsContainer}>
            <div className={styles.positionsLabel}>Positions ({dept.positions.length})</div>
            <div className={styles.positionsTree}>
              {/* Render head position first */}
              {headPosition && buildPositionTree(headPosition)}
              
              {/* Render independent positions (those not reporting to anyone) */}
              {independentPositions.map((position: any) => buildPositionTree(position))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[
        Role.DEPARTMENT_EMPLOYEE,
        Role.DEPARTMENT_HEAD,
        Role.HR_ADMIN,
        Role.HR_MANAGER,
        Role.SYSTEM_ADMIN
      ]}>
        <div className={styles.container}>
          <Spinner message="Loading organizational hierarchy..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[
      Role.DEPARTMENT_EMPLOYEE,
      Role.DEPARTMENT_HEAD,
      Role.HR_ADMIN,
      Role.HR_MANAGER,
      Role.SYSTEM_ADMIN
    ]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Organizational Hierarchy</h1>
            <p className={styles.subtitle}>
              {isEmployeeOnly 
                ? 'View the complete organization structure and your position within it' 
                : viewMode === 'full' 
                  ? 'Complete organizational structure' 
                  : 'Your team structure'}
            </p>
          </div>
          {/* BR 41: Role-based view toggle - only show for managers */}
          {isManagerRole && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleButton} ${viewMode === 'full' ? styles.active : ''}`}
                onClick={() => setViewMode('full')}
              >
                Full Hierarchy
              </button>
              <button
                className={`${styles.toggleButton} ${viewMode === 'my-team' ? styles.active : ''}`}
                onClick={() => setViewMode('my-team')}
              >
                My Team
              </button>
            </div>
          )}
          {/* BR 41: Employees see their own structure only */}
          {isEmployeeOnly && (
            <div className={styles.viewToggle}>
              <div className={styles.employeeBadge}>
                <span>📊 Organization View</span>
              </div>
            </div>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.legend}>
          <div className={styles.legendTitle}>Graphical Organization Chart</div>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendBox} ${styles.filled}`}></div>
              <span>Position Filled</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendBox} ${styles.vacant}`}></div>
              <span>Position Vacant</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendArrow}>→</div>
              <span>Reporting Line</span>
            </div>
          </div>
        </div>

        {departments && departments.length > 0 ? (
          <div className={styles.hierarchyView}>
            {departments.map((dept) => renderDepartmentNode(dept))}
          </div>
        ) : !loading && !error ? (
          <div className={styles.emptyState}>
            <p>No organizational structure found</p>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.5rem' }}>
              The backend hierarchy endpoint may not be implemented yet.
            </p>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}