/**
 * Edit Appraisal Cycle Page
 * Allow HR Manager and HR Employee to edit existing appraisal cycles
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '../../../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../../employees/employees.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Template {
  _id: string;
  name: string;
  templateType: string;
  isActive: boolean;
}

interface Department {
  _id: string;
  name: string;
  isActive: boolean;
}

interface TemplateAssignment {
  templateId: string;
  departmentIds: string[];
  managerEmployeeId?: string;
}

export default function EditCyclePage() {
  const router = useRouter();
  const params = useParams();
  const cycleId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cycleType: 'ANNUAL' as 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT' | 'AD_HOC',
    startDate: '',
    endDate: '',
    managerDueDate: '',
    employeeAcknowledgementDueDate: '',
    templateAssignments: [] as TemplateAssignment[],
  });

  useEffect(() => {
    fetchData();
  }, [cycleId]);

  const fetchData = async () => {
    try {
      setInitialLoading(true);
      
      const [cycleRes, templatesRes, deptRes, employeesRes] = await Promise.all([
        axios.get(`/performance/cycles/${cycleId}`),
        axios.get('/performance/templates'),
        axios.get('/organization-structure/departments')
        ,axios.get('/employee-profile')
      ]);

      const cycle = cycleRes.data;
      
      // Filter only active templates and departments
      const activeTemplates = templatesRes.data.filter((t: Template) => t.isActive);
      setTemplates(activeTemplates);
      
      const activeDepartments = deptRes.data.filter((dept: Department) => dept.isActive);
      setDepartments(activeDepartments);
      setEmployees(employeesRes?.data || []);

      // Populate form with cycle data
      setFormData({
        name: cycle.name || '',
        description: cycle.description || '',
        cycleType: cycle.cycleType || 'ANNUAL',
        startDate: cycle.startDate ? new Date(cycle.startDate).toISOString().split('T')[0] : '',
        endDate: cycle.endDate ? new Date(cycle.endDate).toISOString().split('T')[0] : '',
        managerDueDate: cycle.managerDueDate ? new Date(cycle.managerDueDate).toISOString().split('T')[0] : '',
        employeeAcknowledgementDueDate: cycle.employeeAcknowledgementDueDate ? new Date(cycle.employeeAcknowledgementDueDate).toISOString().split('T')[0] : '',
        templateAssignments: cycle.templateAssignments?.map((assignment: any) => ({
          templateId: assignment.templateId?._id || assignment.templateId,
          departmentIds: assignment.departmentIds?.map((dept: any) => dept._id || dept) || [],
          managerEmployeeId: assignment.managerEmployeeId || ''
        })) || []
      });
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load cycle data: ' + (error.response?.data?.message || error.message));
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.cycleType || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      alert('End date must be after start date');
      return;
    }

    if (formData.managerDueDate && new Date(formData.managerDueDate) <= new Date(formData.endDate)) {
      alert('Manager due date must be after end date');
      return;
    }

    if (formData.employeeAcknowledgementDueDate && new Date(formData.employeeAcknowledgementDueDate) <= new Date(formData.managerDueDate || formData.endDate)) {
      alert('Employee acknowledgement due date must be after manager due date');
      return;
    }

    if (formData.templateAssignments.length === 0) {
      alert('Please assign at least one template to a department');
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/performance/cycles/${cycleId}`, formData);
      alert('Appraisal cycle updated successfully!');
      router.push(`/dashboard/hr/performance/cycles/${cycleId}`);
    } catch (error: any) {
      console.error('Failed to update cycle:', error);
      alert('Failed to update cycle: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const addTemplateAssignment = () => {
    setFormData(prev => ({
      ...prev,
      templateAssignments: [
        ...prev.templateAssignments,
        { templateId: '', departmentIds: [] }
      ]
    }));
  };

  const removeTemplateAssignment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      templateAssignments: prev.templateAssignments.filter((_, i) => i !== index)
    }));
  };

  const updateTemplateAssignment = (index: number, field: 'templateId' | 'departmentIds', value: any) => {
    setFormData(prev => ({
      ...prev,
      templateAssignments: prev.templateAssignments.map((assignment, i) => 
        i === index ? { ...assignment, [field]: value } : assignment
      )
    }));
  };

  const updateManagerAssignment = (index: number, managerId: string) => {
    setFormData(prev => ({
      ...prev,
      templateAssignments: prev.templateAssignments.map((assignment, i) => 
        i === index ? { ...assignment, managerEmployeeId: managerId } : assignment
      )
    }));
    // Persist mapping to localStorage so Bulk Assignment can pick it up
    try {
      const key = `cycle-manager-overrides:${cycleId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      const templateId = formData.templateAssignments[index].templateId;
      const newMap = { ...existing, [templateId]: managerId };
      localStorage.setItem(key, JSON.stringify(newMap));
    } catch (err) {
      // Debug log removed
    }
  };

  const toggleDepartment = (assignmentIndex: number, deptId: string) => {
    const assignment = formData.templateAssignments[assignmentIndex];
    const newDeptIds = assignment.departmentIds.includes(deptId)
      ? assignment.departmentIds.filter(id => id !== deptId)
      : [...assignment.departmentIds, deptId];
    
    updateTemplateAssignment(assignmentIndex, 'departmentIds', newDeptIds);
  };

  if (initialLoading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_EMPLOYEE]}>
        <DashboardLayout title="Loading..." role="HR Manager">
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading cycle data...</div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_EMPLOYEE]}>
      <DashboardLayout title="Edit Appraisal Cycle" role="HR Manager">
        <div className={styles.container}>
          <div style={{ marginBottom: '2rem' }}>
            <h1>Edit Appraisal Cycle</h1>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Update the appraisal cycle configuration
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Basic Information */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Basic Information</h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Cycle Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Q1 2024 Performance Review"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose and scope of this appraisal cycle"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="cycleType" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Cycle Type *
                </label>
                <select
                  id="cycleType"
                  value={formData.cycleType}
                  onChange={(e) => setFormData({ ...formData, cycleType: e.target.value as any })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="ANNUAL">Annual Review</option>
                  <option value="SEMI_ANNUAL">Semi-Annual Review</option>
                  <option value="PROBATIONARY">Probationary Review</option>
                  <option value="PROJECT">Project-Based Review</option>
                  <option value="AD_HOC">Ad-Hoc Review</option>
                </select>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Timeline</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor="startDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="endDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label htmlFor="managerDueDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Manager Review Due Date
                  </label>
                  <input
                    type="date"
                    id="managerDueDate"
                    value={formData.managerDueDate}
                    onChange={(e) => setFormData({ ...formData, managerDueDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="employeeAcknowledgementDueDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Employee Acknowledgement Due Date
                  </label>
                  <input
                    type="date"
                    id="employeeAcknowledgementDueDate"
                    value={formData.employeeAcknowledgementDueDate}
                    onChange={(e) => setFormData({ ...formData, employeeAcknowledgementDueDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                <strong>Note:</strong> Manager due date should be after the cycle end date. Employee acknowledgement is after manager review.
              </p>
            </div>

            {/* Template Assignments */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                  Template Assignments ({formData.templateAssignments.length})
                </h2>
                <button
                  type="button"
                  onClick={addTemplateAssignment}
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
                  + Add Assignment
                </button>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
                Assign appraisal templates to specific departments. Each department will use the assigned template for this cycle.
              </p>

              {formData.templateAssignments.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  border: '2px dashed #ddd',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  No template assignments yet. Click "Add Assignment" to start.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {formData.templateAssignments.map((assignment, index) => (
                    <div key={index} style={{
                      padding: '1.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: '#f9fafb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', margin: 0 }}>Assignment #{index + 1}</h3>
                        <button
                          type="button"
                          onClick={() => removeTemplateAssignment(index)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                          Appraisal Template *
                        </label>
                        <select
                          value={assignment.templateId}
                          onChange={(e) => updateTemplateAssignment(index, 'templateId', e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            background: 'white'
                          }}
                        >
                          <option value="">Select a template</option>
                          {(templates || []).map(template => (
                            <option key={template._id} value={template._id}>
                              {template.name} ({template.templateType})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                          Manager (Optional)
                        </label>
                        <select
                          value={formData.templateAssignments[index].managerEmployeeId || ''}
                          onChange={(e) => updateManagerAssignment(index, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            background: 'white'
                          }}
                        >
                          <option value="">Select a manager (optional)</option>
                          {employees
                            .filter(emp => formData.templateAssignments[index].departmentIds.length === 0 || formData.templateAssignments[index].departmentIds.includes(emp.department?._id))
                            .map(emp => (
                              <option key={emp._id} value={emp._id}>
                                {emp.firstName} {emp.lastName} • {emp.jobTitle}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                          Departments ({assignment.departmentIds.length} selected)
                        </label>
                        <div style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          background: 'white'
                        }}>
                          {(departments || []).length === 0 ? (
                            <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>
                              No departments available
                            </p>
                          ) : (
                            <div style={{ display: 'grid', gap: '0.25rem' }}>
                              {(departments || []).map(dept => (
                                <label
                                  key={dept._id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0.5rem',
                                    background: assignment.departmentIds.includes(dept._id) ? '#e6f2ff' : 'transparent',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={assignment.departmentIds.includes(dept._id)}
                                    onChange={() => toggleDepartment(index, dept._id)}
                                    style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                                  />
                                  {dept.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/hr/performance/cycles/${cycleId}`)}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || templates.length === 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: loading || templates.length === 0 ? '#9ca3af' : '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading || templates.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Updating...' : 'Update Cycle'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
