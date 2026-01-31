/**
 * Assign Position Page (Route: /org-structure/positions/[id]/assign)
 * Assign a position to an employee
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { Position } from '@/lib/types/organizational-structure.types';
import { SystemRole as Role } from '@/lib/roles';
import styles from './assign.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  currentPosition?: string;
}

export default function AssignPositionPage() {
  const router = useRouter();
  const params = useParams();
  const positionId = params.id as string;
  
  const [position, setPosition] = useState<Position | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (positionId) {
      fetchData();
    }
  }, [positionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [positionResponse, employeesResponse, assignmentsResponse] = await Promise.all([
        axios.get(`/organization-structure/positions/${positionId}`),
        axios.get('/employee-profile'),
        axios.get('/organization-structure/assignments').catch(() => ({ data: [] }))
      ]);
      
      // Debug logs removed
      
      // Get list of employee profile IDs that already have active assignments
      const assignedEmployeeIds = new Set(
        (assignmentsResponse.data || [])
          .filter((assignment: any) => !assignment.endDate) // Only active assignments
          .map((assignment: any) => assignment.employeeProfileId)
      );
      
      // Debug log removed
      
      // Filter out employees who already have active position assignments
      const availableEmployees = employeesResponse.data.filter(
        (emp: Employee) => !assignedEmployeeIds.has(emp._id)
      );
      
      // Debug log removed
      
      setPosition(positionResponse.data);
      setEmployees(availableEmployees);
      setError('');
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployeeId) {
      setError('Please select an employee');
      return;
    }

    if (!startDate) {
      setError('Please select a start date');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const departmentId = typeof position?.departmentId === 'string' 
        ? position.departmentId 
        : position?.departmentId?._id;
      
      const payload = {
        employeeProfileId: selectedEmployeeId,
        positionId,
        departmentId: departmentId,
        startDate
      };
      
      // Debug log removed
        
      const response = await axios.post('/organization-structure/assignments', payload);
      
      // Debug log removed
      alert('Position assigned successfully!');
      router.push(`/org-structure/positions/${positionId}`);
    } catch (err: any) {
      console.error('Assignment failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to assign position');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true; // Show all if no search term
    const searchLower = searchTerm.toLowerCase();
    // Search only by employeeId (e.g., EMP-00001)
    return emp.employeeId?.toLowerCase().includes(searchLower);
  });

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]}>
        <div className={styles.container}>
          <Spinner message="Loading..." />
        </div>
      </ProtectedRoute>
    );
  }

  if (!position) {
    return (
      <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]}>
        <div className={styles.container}>
          <div className={styles.error}>Position not found</div>
          <button
            className={styles.backButton}
            onClick={() => router.push('/org-structure/positions')}
          >
            ← Back to Positions
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.push(`/org-structure/positions/${positionId}`)}
          >
            ← Back to Position Details
          </button>
          <h1 className={styles.title}>Assign Position to Employee</h1>
          <p className={styles.subtitle}>
            Position: <strong>{position.title}</strong> ({position.code})
          </p>
        </div>

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorBox}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Position Information</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Position Title</span>
                  <span className={styles.value}>{position.title}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Position Code</span>
                  <span className={styles.value}>{position.code}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Department</span>
                  <span className={styles.value}>
                    {position.departmentId?.name || 'Unknown'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Reports To</span>
                  <span className={styles.value}>
                    {position.reportsToPositionId?.title || 'Top Level'}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Employee Selection</h2>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Search by Employee ID
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Employee ID (e.g., EMP-00001)..."
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Select Employee <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.select}
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                >
                  <option value="">-- Select an Employee --</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName}
                      {emp.employeeId ? ` (${emp.employeeId})` : ''}
                      {emp.email ? ` - ${emp.email}` : ''}
                      {emp.currentPosition ? ` - Current: ${emp.currentPosition}` : ' - No Position'}
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>
                  {filteredEmployees.length} available employee(s) without position assignments
                </span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Start Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  className={styles.input}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
                <span className={styles.hint}>
                  Date when the employee will start in this position
                </span>
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => router.push(`/org-structure/positions/${positionId}`)}
                className={styles.cancelButton}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || !selectedEmployeeId}
              >
                {submitting ? 'Assigning...' : 'Assign Position'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}