/**
 * Bulk Assignment Page for Appraisal Cycle
 * REQ-PP-05: Assign appraisal forms in bulk to employees
 * Accessible by: HR Manager, HR Employee
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '../../../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../../employees/employees.module.css';

interface Cycle {
  _id: string;
  name: string;
  cycleType: string;
  status: string;
  templateAssignments: {
    templateId: {
      _id: string;
      name: string;
      templateType: string;
    };
    departmentIds: {
      _id: string;
      name: string;
    }[];
  }[];
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: {
    _id: string;
    name: string;
  };
  status: string;
}

interface Assignment {
  _id: string;
  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  managerProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  templateId: {
    _id: string;
    name: string;
  };
  departmentId: {
    _id: string;
    name: string;
  };
  status: string;
  assignedAt: string;
  dueDate?: string;
}

export default function BulkAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const cycleId = params?.id as string;

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');

  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManager, setSelectedManager] = useState('');

  useEffect(() => {
    if (cycleId) {
      fetchData();
    }
  }, [cycleId]);

  useEffect(() => {
    // If there's a manager override stored for this cycle and selected template, prefill the manager
    try {
      const key = `cycle-manager-overrides:${cycleId}`;
      const overrides = JSON.parse(localStorage.getItem(key) || '{}');
      if (selectedTemplate && overrides[selectedTemplate]) {
        setSelectedManager(overrides[selectedTemplate]);
      } else {
        setSelectedManager('');
      }
    } catch (err) {
      // ignore
    }
  }, [selectedTemplate, cycleId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Debug log removed
      
      const [cycleRes, employeesRes, assignmentsRes, departmentsRes] = await Promise.all([
        axios.get(`/performance/cycles/${cycleId}`).catch(err => {
          console.error('Cycle fetch error:', err);
          throw err;
        }),
        axios.get('/employee-profile').catch(err => {
          console.error('Employee fetch error:', err.response?.data || err.message);
          return { data: [] };
        }),
        axios.get(`/performance/cycles/${cycleId}/assignments`).catch(err => {
          console.error('Assignments fetch error:', err.response?.data || err.message);
          return { data: [] };
        }),
        axios.get('/organization-structure/departments').catch(err => {
          console.error('Departments fetch error:', err.response?.data || err.message);
          return { data: [] };
        }),
      ]);

      // Debug logs removed
      
      setCycle(cycleRes.data);
      
      // Store all departments
      const activeDepartments = departmentsRes.data.filter((dept: any) => dept.isActive !== false);
      setAllDepartments(activeDepartments);
      
      // Map employees to ensure proper structure
      const allEmployees = employeesRes.data.map((emp: any) => {
        // Find department details from the departments list
        let departmentObj = null;
        const deptField = emp.primaryDepartmentId || emp.currentDepartment;
        
        if (deptField) {
          const deptId = typeof deptField === 'string' ? deptField : deptField._id;
          const foundDept = activeDepartments.find((d: any) => d._id === deptId);
          if (foundDept) {
            departmentObj = {
              _id: foundDept._id,
              name: foundDept.name
            };
          } else if (typeof deptField === 'object' && deptField.name) {
            departmentObj = {
              _id: deptField._id,
              name: deptField.name
            };
          }
        }
        
        return {
          _id: emp._id,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          email: emp.email || '',
          jobTitle: emp.jobTitle || '',
          department: departmentObj,
          status: emp.status || 'ACTIVE'
        };
      });
      
      // Filter only active employees
      const activeEmployees = allEmployees.filter(
        (emp: any) => emp.status === 'ACTIVE' || emp.status === 'Active' || emp.status === 'PROBATION'
      );
      
      // Debug logs removed
      setEmployees(activeEmployees);
      setAssignments(assignmentsRes.data || []);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }

    if (selectedEmployees.length === 0 && selectedDepartments.length === 0) {
      alert('Please select at least one employee or department');
      return;
    }

    const confirmMsg = selectedEmployees.length > 0
      ? `Assign appraisals to ${selectedEmployees.length} selected employee(s)?`
      : `Assign appraisals to all employees in ${selectedDepartments.length} department(s)?`;

    if (!confirm(confirmMsg)) return;

    try {
      setSubmitting(true);
      
      const payload: any = {
        cycleId,
        templateId: selectedTemplate,
      };

      if (selectedEmployees.length > 0) {
        payload.employeeIds = selectedEmployees;
      } else if (selectedDepartments.length > 0) {
        payload.departmentIds = selectedDepartments;
      }

      if (dueDate) {
        payload.dueDate = new Date(dueDate).toISOString();
      }

      if (selectedManager) {
        payload.managerEmployeeId = selectedManager;
      }

      await axios.post('/performance/assignments/bulk', payload);
      
      alert('Bulk assignment created successfully!');
      
      // Reset form and refresh data
      setSelectedTemplate('');
      setSelectedDepartments([]);
      setSelectedEmployees([]);
      setDueDate('');
      fetchData();
    } catch (error: any) {
      console.error('Failed to create bulk assignment:', error);
      alert('Failed to create assignments: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments(prev =>
      prev.includes(deptId)
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(filteredEmployees.map(emp => emp._id));
  };

  const deselectAllEmployees = () => {
    setSelectedEmployees([]);
  };

  const isEmployeeAssigned = (employeeId: string, templateId: string) => {
    return assignments.some(
      assignment =>
        assignment.employeeProfileId._id === employeeId &&
        assignment.templateId._id === templateId
    );
  };

  // Use the allDepartments state which was fetched from the API
  const availableDepartments = allDepartments;

  // Filter employees based on search and department filter
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      searchQuery === '' ||
      (emp.firstName && emp.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.lastName && emp.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.jobTitle && emp.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDepartment =
      filterDepartment === '' ||
      emp.department?._id === filterDepartment;

    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
        <DashboardLayout title="Loading..." role="HR Manager">
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading assignment data...</div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!cycle) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
        <DashboardLayout title="Error" role="HR Manager">
          <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
            Cycle not found
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Bulk Assignment" role="HR Manager">
        <div className={styles.container}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h1>Bulk Assignment</h1>
                <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                  Cycle: <strong>{cycle.name}</strong>
                </p>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>
                  REQ-PP-05: Assign appraisal forms to employees in bulk
                </p>
              </div>
              <button
                onClick={() => router.push(`/dashboard/hr/performance/cycles/${cycleId}`)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Back to Cycle
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              padding: '1.5rem',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.5rem' }}>
                Total Employees
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0c4a6e' }}>
                {employees.length}
              </p>
            </div>
            <div style={{
              padding: '1.5rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#15803d', marginBottom: '0.5rem' }}>
                Assigned
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#166534' }}>
                {assignments.length}
              </p>
            </div>
            <div style={{
              padding: '1.5rem',
              background: '#fefce8',
              border: '1px solid #fef08a',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#a16207', marginBottom: '0.5rem' }}>
                Unassigned
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#854d0e' }}>
                {employees.length - assignments.length}
              </p>
            </div>
          </div>

          {/* Assignment Form */}
          <div style={{
            padding: '2rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
              Create Bulk Assignment
            </h2>

            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Template Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Select Template *
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    background: 'white'
                  }}
                >
                  <option value="">Choose a template</option>
                  {cycle.templateAssignments?.map(ta => (
                    <option key={ta.templateId._id} value={ta.templateId._id}>
                      {ta.templateId.name} ({ta.templateId.templateType})
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Manager (Optional)
                  </label>
                  <select
                    value={selectedManager}
                    onChange={(e) => setSelectedManager(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      background: 'white'
                    }}
                  >
                    <option value="">Select a Manager (optional)</option>
                    {employees
                      .filter(emp => selectedDepartments.length === 0 || selectedDepartments.includes(emp.department?._id))
                      .map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} • {emp.jobTitle}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    background: 'white'
                  }}
                />
              </div>

              {/* Assignment Method */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Assignment Method
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDepartments([]);
                      setSelectedEmployees([]);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: selectedEmployees.length > 0 || selectedDepartments.length === 0 ? '#0066cc' : '#e5e7eb',
                      color: selectedEmployees.length > 0 || selectedDepartments.length === 0 ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}
                  >
                    Select Individual Employees
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployees([]);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: selectedDepartments.length > 0 && selectedEmployees.length === 0 ? '#0066cc' : '#e5e7eb',
                      color: selectedDepartments.length > 0 && selectedEmployees.length === 0 ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}
                  >
                    Select by Department
                  </button>
                </div>
              </div>

              {/* Department Selection (if method is by department) */}
              {selectedEmployees.length === 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Select Departments ({selectedDepartments.length} selected)
                  </label>
                  <div style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    background: 'white'
                  }}>
                    {availableDepartments.length === 0 ? (
                      <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>
                        No departments configured for this cycle
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        {availableDepartments.map(dept => (
                          <label
                            key={dept._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0.5rem',
                              background: selectedDepartments.includes(dept._id) ? '#e6f2ff' : 'transparent',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDepartments.includes(dept._id)}
                              onChange={() => toggleDepartment(dept._id)}
                              style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                            />
                            {dept.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleBulkAssign}
              disabled={submitting || !selectedTemplate || (selectedEmployees.length === 0 && selectedDepartments.length === 0)}
              style={{
                padding: '0.75rem 2rem',
                background: submitting || !selectedTemplate ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting || !selectedTemplate ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                width: '100%'
              }}
            >
              {submitting ? 'Assigning...' : `Create Assignment for ${selectedEmployees.length > 0 ? selectedEmployees.length + ' Employee(s)' : selectedDepartments.length + ' Department(s)'}`}
            </button>
          </div>

          {/* Employee Selection (if method is individual) */}
          {selectedDepartments.length === 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                  Select Employees ({selectedEmployees.length} selected)
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={selectAllEmployees}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllEmployees}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Filter by Department
                  </label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '0.95rem'
                    }}
                  >
                    <option value="">All Departments</option>
                    {availableDepartments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Search Employees
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or job title..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              </div>

              {/* Employee List */}
              <div style={{
                maxHeight: '500px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: 'white'
              }}>
                {filteredEmployees.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                    No employees found
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem', padding: '1rem' }}>
                    {filteredEmployees.map(employee => {
                      const alreadyAssigned = selectedTemplate ? isEmployeeAssigned(employee._id, selectedTemplate) : false;
                      
                      return (
                        <label
                          key={employee._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1rem',
                            background: selectedEmployees.includes(employee._id) 
                              ? '#e6f2ff' 
                              : alreadyAssigned 
                              ? '#f3f4f6' 
                              : 'white',
                            border: selectedEmployees.includes(employee._id) 
                              ? '2px solid #0066cc' 
                              : '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: alreadyAssigned ? 'not-allowed' : 'pointer',
                            opacity: alreadyAssigned ? 0.6 : 1,
                            transition: 'all 0.2s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(employee._id)}
                            onChange={() => toggleEmployee(employee._id)}
                            disabled={alreadyAssigned}
                            style={{ marginRight: '1rem', cursor: alreadyAssigned ? 'not-allowed' : 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                              {employee.firstName} {employee.lastName}
                              {alreadyAssigned && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  padding: '0.125rem 0.5rem',
                                  background: '#10b981',
                                  color: 'white',
                                  borderRadius: '10px',
                                  fontSize: '0.75rem'
                                }}>
                                  Already Assigned
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#666' }}>
                              {employee.jobTitle} • {employee.department?.name || 'No Department'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                              {employee.email}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Existing Assignments */}
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              Existing Assignments ({assignments.length})
            </h2>
            {assignments.length === 0 ? (
              <div style={{
                padding: '2rem',
                border: '2px dashed #ddd',
                borderRadius: '6px',
                textAlign: 'center',
                color: '#666'
              }}>
                No assignments created yet
              </div>
            ) : (
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: 'white'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        Employee
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        Manager
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        Template
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        Department
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        Status
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        Due Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(assignment => (
                      <tr key={assignment._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.75rem' }}>
                          {assignment.employeeProfileId.firstName} {assignment.employeeProfileId.lastName}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {assignment.managerProfileId.firstName} {assignment.managerProfileId.lastName}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {assignment.templateId.name}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {assignment.departmentId.name}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: assignment.status === 'NOT_STARTED' ? '#fef3c7' : 
                                       assignment.status === 'IN_PROGRESS' ? '#dbeafe' :
                                       assignment.status === 'SUBMITTED' ? '#d1fae5' : '#e0e7ff',
                            color: assignment.status === 'NOT_STARTED' ? '#92400e' : 
                                  assignment.status === 'IN_PROGRESS' ? '#1e40af' :
                                  assignment.status === 'SUBMITTED' ? '#065f46' : '#3730a3',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {assignment.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          {assignment.dueDate 
                            ? new Date(assignment.dueDate).toLocaleDateString() 
                            : 'No due date'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
