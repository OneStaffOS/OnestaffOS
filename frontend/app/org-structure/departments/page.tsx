/**
 * Department Management Page (Route: /org-structure/departments)
 * Manage departments: create, update, and deactivate
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { Department, DepartmentStatus } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './departments.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/organization-structure/departments?includeInactive=true');
      setDepartments(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || 
                         (filterStatus === 'ACTIVE' && dept.isActive) ||
                         (filterStatus === 'INACTIVE' && !dept.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleDeactivate = async (departmentId: string) => {
    if (!confirm('Are you sure you want to deactivate this department?')) {
      return;
    }

    try {
      await axios.put(`/organization-structure/departments/${departmentId}/deactivate`);
      alert('Department deactivated successfully');
      fetchDepartments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate department');
    }
  };

  const handleActivate = async (departmentId: string) => {
    try {
      await axios.put(`/organization-structure/departments/${departmentId}/reactivate`);
      alert('Department activated successfully');
      fetchDepartments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to activate department');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
        <div className={styles.container}>
          <Spinner message="Loading departments..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Departments</h1>
            <p className={styles.subtitle}>Manage organizational departments</p>
          </div>
          <button
            className={styles.createButton}
            onClick={() => router.push('/org-structure/departments/create')}
          >
            + Create Department
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Search and Filters */}
        <div className={styles.controls}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className={styles.filters}>
            <button
              className={`${styles.filterButton} ${filterStatus === 'ALL' ? styles.active : ''}`}
              onClick={() => setFilterStatus('ALL')}
            >
              All ({departments.length})
            </button>
            <button
              className={`${styles.filterButton} ${filterStatus === 'ACTIVE' ? styles.active : ''}`}
              onClick={() => setFilterStatus('ACTIVE')}
            >
              Active ({departments.filter(d => d.isActive).length})
            </button>
            <button
              className={`${styles.filterButton} ${filterStatus === 'INACTIVE' ? styles.active : ''}`}
              onClick={() => setFilterStatus('INACTIVE')}
            >
              Inactive ({departments.filter(d => !d.isActive).length})
            </button>
          </div>
        </div>

        {/* Departments Table */}
        {filteredDepartments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No departments found</p>
            <button
              className={styles.createButton}
              onClick={() => router.push('/org-structure/departments/create')}
            >
              Create First Department
            </button>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Head of Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr key={dept._id}>
                    <td className={styles.deptName}>
                      <div className={styles.deptCode}>{dept.code}</div>
                      <strong>{dept.name}</strong>
                      {dept.description && (
                        <div className={styles.description}>{dept.description}</div>
                      )}
                    </td>
                    <td>
                      {dept.headPositionId ? (
                        <div className={styles.managerInfo}>
                          <span className={styles.managerTitle}>{dept.headPositionId.title}</span>
                        </div>
                      ) : (
                        <span className={styles.unassigned}>Not Assigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${dept.isActive ? styles.active : styles.inactive}`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => router.push(`/org-structure/departments/${dept._id}/assign-manager`)}
                          title="Assign Manager"
                        >
                          Assign Manager
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => router.push(`/org-structure/departments/${dept._id}`)}
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => router.push(`/org-structure/departments/${dept._id}/edit`)}
                          title="Edit Department"
                        >
                          Edit
                        </button>
                        {dept.isActive ? (
                          <button
                            className={`${styles.actionButton} ${styles.danger}`}
                            onClick={() => handleDeactivate(dept._id)}
                            title="Deactivate Department"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className={`${styles.actionButton} ${styles.success}`}
                            onClick={() => handleActivate(dept._id)}
                            title="Reactivate Department"
                          >
                            Reactivate
                          </button>
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
    </ProtectedRoute>
  );
}