/**
 * HR Admin - Department Management Page (Route: /hr/departments)
 * Manage departments and positions
 * Phase III: HR/Admin Processing & Master Data
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { SystemRole as Role } from '@/lib/roles';
import styles from './departments.module.css';

interface Department {
  _id: string;
  code: string;
  name: string;
  description: string;
  headOfDepartment?: string;
  numberOfEmployees: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState({
    code: '',
    name: '',
    description: '',
  });

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

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/organization-structure/departments', newDepartment);
      setShowAddModal(false);
      setNewDepartment({ code: '', name: '', description: '' });
      fetchDepartments();
      alert('Department created successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create department');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this department?')) {
      return;
    }
    try {
      await axios.put(`/organization-structure/departments/${id}/deactivate`);
      fetchDepartments();
      alert('Department deactivated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate department');
    }
  };

  const handleReactivate = async (id: string) => {
    if (!confirm('Are you sure you want to reactivate this department?')) {
      return;
    }
    try {
      await axios.put(`/organization-structure/departments/${id}/reactivate`);
      fetchDepartments();
      alert('Department reactivated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reactivate department');
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Department Management</h1>
            <p className={styles.subtitle}>Manage organizational departments and structure</p>
          </div>
          <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
            Add Department
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <Spinner message="Loading departments..." />
        ) : filteredDepartments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No departments found</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Employees</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr key={dept._id}>
                    <td>{dept.code}</td>
                    <td className={styles.deptName}>{dept.name}</td>
                    <td className={styles.description}>{dept.description}</td>
                    <td>{dept.numberOfEmployees || 0}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${dept.isActive ? styles.active : styles.inactive}`}>
                        {dept.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>{formatDate(dept.createdAt)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {dept.isActive ? (
                          <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={() => handleDeactivate(dept._id)}
                            title="Deactivate"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className={`${styles.actionButton} ${styles.successButton}`}
                            onClick={() => handleReactivate(dept._id)}
                            title="Reactivate"
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

        {showAddModal && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Add New Department</h2>
                <button className={styles.closeButton} onClick={() => setShowAddModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddDepartment}>
                <div className={styles.formGroup}>
                  <label>Department Code</label>
                  <input
                    type="text"
                    required
                    value={newDepartment.code}
                    onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value })}
                    placeholder="e.g., IT, HR, FIN"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Department Name</label>
                  <input
                    type="text"
                    required
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    placeholder="e.g., Information Technology"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    required
                    value={newDepartment.description}
                    onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                    placeholder="e.g., HR: Manages recruitment, employee relations, payroll, benefits administration, and compliance with labor regulations"
                    rows={4}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelButton} onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton}>
                    Create Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
