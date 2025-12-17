"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../payroll.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  primaryDepartmentId?: { _id: string; name: string };
  primaryPositionId?: { _id: string; title: string };
  payGradeId?: {
    _id: string;
    grade: string;
    baseSalary: number;
    grossSalary: number;
  };
  status: string;
}

interface PayGrade {
  _id: string;
  grade: string;
  baseSalary: number;
  grossSalary: number;
  status: string;
}

interface Position {
  _id: string;
  title: string;
  description?: string;
  departmentId?: { _id: string; name: string };
  isActive: boolean;
}

export default function EmployeePayrollAssignmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPayGrade, setSelectedPayGrade] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, payGradesRes] = await Promise.all([
        axios.get('/employee-profile'),
        axios.get('/payroll-configuration/pay-grades'),
      ]);

      setEmployees(employeesRes.data || []);
      setPayGrades((payGradesRes.data || []).filter((pg: PayGrade) => pg.status === 'approved'));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignPayGrade() {
    if (!selectedEmployee || !selectedPayGrade) {
      setError('Please select a pay grade to assign');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.patch(`/employee-profile/${selectedEmployee._id}`, {
        payGradeId: selectedPayGrade
      });

      setSuccess(`Successfully assigned pay grade to ${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
      
      // Reload employees to reflect changes
      await loadData();
      
      // Clear selection
      setSelectedEmployee(null);
      setSelectedPayGrade('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  }

  function handleSelectEmployee(employee: Employee) {
    setSelectedEmployee(employee);
    setSelectedPayGrade(employee.payGradeId?._id || '');
    setError(null);
    setSuccess(null);
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || emp.status?.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const assignedCount = employees.filter(e => e.payGradeId).length;
  const unassignedCount = employees.filter(e => !e.payGradeId).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Employee Payroll Assignments" role="Payroll Specialist">
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/dashboard/payroll" className={styles.backLink}>
            ← Back to Payroll Dashboard
          </Link>

          {/* Header */}
          <div className={styles.pageHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>👥 Employee Payroll Assignments</h1>
              <p className={styles.pageSubtitle}>
                Assign pay grades and payroll information to employees
              </p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}
          {success && <div className={styles.successMessage}>✅ {success}</div>}

          {loading ? (
            <Spinner message="Loading employee data..." />
          ) : (
            <>
              {/* Stats */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{employees.length}</span>
                  <span className={styles.statLabel}>Total Employees</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue} style={{ color: '#10b981' }}>
                    {assignedCount}
                  </span>
                  <span className={styles.statLabel}>Assigned Pay Grades</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue} style={{ color: '#f59e0b' }}>
                    {unassignedCount}
                  </span>
                  <span className={styles.statLabel}>Unassigned</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{payGrades.length}</span>
                  <span className={styles.statLabel}>Available Pay Grades</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Employees List */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Employees</h2>
                  </div>

                  {/* Filters */}
                  <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Search by name or employee number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={styles.formInput}
                      style={{ flex: 1 }}
                    />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={styles.formInput}
                      style={{ width: '150px' }}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Employee List */}
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {filteredEmployees.length === 0 ? (
                      <div className={styles.emptyState}>
                        <p>No employees found</p>
                      </div>
                    ) : (
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Position</th>
                            <th>Pay Grade</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEmployees.map((emp) => (
                            <tr
                              key={emp._id}
                              style={{
                                backgroundColor: selectedEmployee?._id === emp._id ? '#f0f9ff' : 'transparent',
                              }}
                            >
                              <td>
                                <div>
                                  <strong>{emp.firstName} {emp.lastName}</strong>
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {emp.employeeNumber}
                                  </div>
                                </div>
                              </td>
                              <td>
                                {emp.primaryPositionId?.title || '-'}
                              </td>
                              <td>
                                {emp.payGradeId ? (
                                  <div>
                                    <strong>{emp.payGradeId.grade}</strong>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                      {formatCurrency(emp.payGradeId.baseSalary)}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#f59e0b' }}>Not Assigned</span>
                                )}
                              </td>
                              <td>
                                <button
                                  className={styles.btnSecondary}
                                  onClick={() => handleSelectEmployee(emp)}
                                  disabled={saving}
                                >
                                  {selectedEmployee?._id === emp._id ? 'Selected' : 'Assign'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Assignment Panel */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Assign Pay Grade & Position</h2>
                  </div>

                  {selectedEmployee ? (
                    <>
                      {/* Employee Info Card */}
                      <div style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                        color: 'white', 
                        padding: '20px', 
                        borderRadius: '12px',
                        marginBottom: '24px'
                      }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Selected Employee</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                          <div>
                            <div style={{ opacity: 0.8, marginBottom: '4px' }}>Name</div>
                            <div style={{ fontWeight: '600' }}>{selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                          </div>
                          <div>
                            <div style={{ opacity: 0.8, marginBottom: '4px' }}>Employee Number</div>
                            <div style={{ fontWeight: '600' }}>{selectedEmployee.employeeNumber}</div>
                          </div>
                          <div>
                            <div style={{ opacity: 0.8, marginBottom: '4px' }}>Department</div>
                            <div style={{ fontWeight: '600' }}>{selectedEmployee.primaryDepartmentId?.name || 'Not Assigned'}</div>
                          </div>
                          <div>
                            <div style={{ opacity: 0.8, marginBottom: '4px' }}>Current Position</div>
                            <div style={{ fontWeight: '600' }}>{selectedEmployee.primaryPositionId?.title || 'Not Assigned'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Pay Grade Assignment */}
                      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                        <label className={styles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span>💰 Pay Grade</span>
                        </label>
                        <select
                          value={selectedPayGrade}
                          onChange={(e) => setSelectedPayGrade(e.target.value)}
                          className={styles.formInput}
                          disabled={saving}
                          style={{ fontSize: '14px' }}
                        >
                          <option value="">-- Select Pay Grade --</option>
                          {payGrades.map((pg) => (
                            <option key={pg._id} value={pg._id}>
                              {pg.grade} - Base: {formatCurrency(pg.baseSalary)} | Gross: {formatCurrency(pg.grossSalary)}
                            </option>
                          ))}
                        </select>
                        <span className={styles.formHint} style={{ display: 'block', marginTop: '8px' }}>
                          Only approved pay grades are available for assignment
                        </span>
                      </div>

                      {/* Pay Grade Details Preview */}
                      {selectedPayGrade && (
                        <div style={{ 
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                          border: '2px solid #86efac',
                          padding: '20px', 
                          borderRadius: '12px',
                          marginTop: '16px'
                        }}>
                          <h4 style={{ margin: '0 0 16px 0', color: '#059669', fontSize: '16px', fontWeight: '600' }}>
                            📊 Selected Pay Grade Details
                          </h4>
                          {payGrades.find(pg => pg._id === selectedPayGrade) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div style={{ 
                                background: 'white', 
                                padding: '16px', 
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0'
                              }}>
                                <div style={{ color: '#059669', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Grade</div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#047857' }}>
                                  {payGrades.find(pg => pg._id === selectedPayGrade)?.grade}
                                </div>
                              </div>
                              <div style={{ 
                                background: 'white', 
                                padding: '16px', 
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0'
                              }}>
                                <div style={{ color: '#059669', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Base Salary</div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#047857' }}>
                                  {formatCurrency(payGrades.find(pg => pg._id === selectedPayGrade)?.baseSalary || 0)}
                                </div>
                              </div>
                              <div style={{ 
                                background: 'white', 
                                padding: '16px', 
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0',
                                gridColumn: 'span 2'
                              }}>
                                <div style={{ color: '#059669', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Gross Salary</div>
                                <div style={{ fontSize: '24px', fontWeight: '700', color: '#047857' }}>
                                  {formatCurrency(payGrades.find(pg => pg._id === selectedPayGrade)?.grossSalary || 0)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button
                          className={styles.btnPrimary}
                          onClick={handleAssignPayGrade}
                          disabled={saving || !selectedPayGrade}
                          style={{ flex: 1, padding: '12px', fontSize: '15px', fontWeight: '600' }}
                        >
                          {saving ? '⏳ Saving...' : '✅ Save Assignment'}
                        </button>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => {
                            setSelectedEmployee(null);
                            setSelectedPayGrade('');
                            setError(null);
                            setSuccess(null);
                          }}
                          disabled={saving}
                          style={{ padding: '12px 24px', fontSize: '15px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.emptyState}>
                      <p>👈 Select an employee from the list to assign pay grade</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Information Section */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>ℹ️ Important Information</h2>
                </div>
                <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.8' }}>
                  <ul style={{ marginLeft: '20px' }}>
                    <li>Only <strong>approved pay grades</strong> can be assigned to employees</li>
                    <li>Pay grade assignment determines the employee's <strong>base salary and gross salary</strong></li>
                    <li>Allowances, taxes, and insurance are applied <strong>automatically</strong> during payroll execution based on system-wide configurations</li>
                    <li>Signing bonuses are assigned during the <strong>onboarding process</strong> for new hires</li>
                    <li>Termination benefits are processed during the <strong>offboarding workflow</strong></li>
                    <li>All changes are logged for <strong>audit purposes</strong></li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
