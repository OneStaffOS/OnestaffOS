/**
 * Create Appraisal Cycle Page
 * REQ-PP-02: HR Manager and HR Employee can create new performance appraisal cycles
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../context/AuthContext';
import ProtectedRoute from '../../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../employees/employees.module.css';

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

// Template assignments are handled via bulk assignment flow (createBulkAssignments)
// and are intentionally omitted from the cycle creation UI.

export default function CreateCyclePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cycleType: 'ANNUAL' as 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT' | 'AD_HOC',
    startDate: '',
    endDate: '',
    managerDueDate: '',
    employeeAcknowledgementDueDate: '',
  });

  useEffect(() => {
    fetchTemplatesAndDepartments();
  }, []);

  const fetchTemplatesAndDepartments = async () => {
    try {
      const templatesRes = await axios.get('/performance/templates');
      const activeTemplates = templatesRes.data.filter((t: Template) => t.isActive);
      setTemplates(activeTemplates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      alert('Failed to load templates');
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

    // Note: Template assignments moved to bulk assignment workflow.

    try {
      setLoading(true);
      const response = await axios.post('/performance/cycles', formData);
      const newCycle = response.data;
      // Template assignment and manager overrides are handled in the bulk assignment flow.
      alert('Appraisal cycle created successfully!');
      router.push('/dashboard/hr/performance/cycles');
    } catch (error: any) {
      console.error('Failed to create cycle:', error);
      alert('Failed to create cycle: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_EMPLOYEE]}>
      <DashboardLayout title="Create Appraisal Cycle" role="HR Manager">
        <div className={styles.container}>
          <div style={{ marginBottom: '2rem' }}>
            <h1>Create New Appraisal Cycle</h1>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Set up a new performance appraisal cycle for your organization (REQ-PP-02)
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

            {/* Template assignments have been moved to the bulk assignment workflow. */}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
              <button
                type="button"
                onClick={() => router.push('/dashboard/hr/performance/cycles')}
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
                {loading ? 'Creating...' : 'Create Cycle'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
