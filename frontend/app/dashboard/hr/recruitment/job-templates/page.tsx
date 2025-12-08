/**
 * Job Templates Management Page
 * Route: /dashboard/hr/recruitment/job-templates
 * HR Manager can create, view, edit, and delete standardized job templates
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../dashboard.module.css';

interface JobTemplate {
  _id: string;
  title: string;
  department: string;
  qualifications: string[];
  skills: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function JobTemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/recruitment/job-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch job templates:', error);
      alert('Failed to load job templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the template "${title}"?`)) {
      return;
    }

    try {
      await axios.delete(`/recruitment/job-templates/${id}`);
      alert('Template deleted successfully');
      fetchTemplates();
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template: ' + (error.response?.data?.message || error.message));
    }
  };

  // Get unique departments for filtering
  const departments = Array.from(new Set(templates.map(t => t.department))).sort();

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === '' || template.department === filterDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER]}>
      <DashboardLayout title="Job Templates" role="Human Resources">
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ marginBottom: '0.5rem' }}>Job Description Templates</h1>
              <p style={{ color: '#666', fontSize: '0.95rem' }}>
                Create and manage standardized job templates for consistent postings
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/hr/recruitment/job-templates/create')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              + Create Template
            </button>
          </div>

          {/* Filters */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              placeholder="Search by title or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: '1',
                minWidth: '250px',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem'
              }}
            />
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              style={{
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                minWidth: '200px',
                cursor: 'pointer'
              }}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Templates List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              background: '#f9fafb',
              borderRadius: '8px',
              color: '#666'
            }}>
              {searchTerm || filterDepartment ? (
                <>
                  <p style={{ marginBottom: '1rem' }}>No templates match your filters</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterDepartment('');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: '1rem' }}>No job templates created yet</p>
                  <button
                    onClick={() => router.push('/dashboard/hr/recruitment/job-templates/create')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Create First Template
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredTemplates.map(template => (
                <div
                  key={template._id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{template.title}</h3>
                      <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                        <strong>Department:</strong> {template.department}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => router.push(`/dashboard/hr/recruitment/job-templates/edit/${template._id}`)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(template._id, template.title)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {template.description && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ color: '#374151', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        {template.description}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Required Qualifications
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#374151' }}>
                        {template.qualifications.map((qual, idx) => (
                          <li key={idx} style={{ marginBottom: '0.25rem' }}>{qual}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Required Skills
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#374151' }}>
                        {template.skills.map((skill, idx) => (
                          <li key={idx} style={{ marginBottom: '0.25rem' }}>{skill}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: '1rem', 
                    paddingTop: '1rem', 
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '0.85rem',
                    color: '#9ca3af'
                  }}>
                    Last updated: {new Date(template.updatedAt).toLocaleDateString()} at {new Date(template.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {!loading && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: '#f9fafb',
              borderRadius: '6px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.9rem'
            }}>
              Showing {filteredTemplates.length} of {templates.length} template{templates.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
