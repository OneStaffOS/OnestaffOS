/**
 * Job Requisitions Management Page
 * Route: /dashboard/hr/recruitment/requisitions
 * HR Manager can create and manage job requisitions
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
}

interface JobRequisition {
  _id: string;
  requisitionId: string;
  templateId: JobTemplate | string;
  openings: number;
  location: string;
  hiringManagerId: any;
  publishStatus: 'draft' | 'published' | 'closed';
  postingDate?: string;
  expiryDate?: string;
  createdAt: string;
}

export default function JobRequisitionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    templateId: '',
    openings: '' as any,
    location: '',
    expiryDate: ''
  });

  useEffect(() => {
    fetchRequisitions();
    fetchTemplates();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/recruitment/job-requisitions');
      setRequisitions(response.data);
    } catch (error) {
      console.error('Failed to fetch requisitions:', error);
      alert('Failed to load job requisitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/recruitment/job-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.templateId || !formData.location || formData.openings < 1) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const payload: any = {
        templateId: formData.templateId,
        openings: formData.openings,
        location: formData.location,
        hiringManagerId: user?.sub
      };
      
      // Only include expiryDate if it's provided
      if (formData.expiryDate) {
        payload.expiryDate = formData.expiryDate;
      }
      
      await axios.post('/recruitment/job-requisitions', payload);
      alert('Job requisition created successfully!');
      setShowCreateForm(false);
      setFormData({
        templateId: '',
        openings: '' as any,
        location: '',
        expiryDate: ''
      });
      fetchRequisitions();
    } catch (error: any) {
      console.error('Failed to create requisition:', error);
      alert('Failed to create job requisition: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job requisition?')) {
      return;
    }

    try {
      await axios.delete(`/recruitment/job-requisitions/${id}`);
      alert('Job requisition deleted successfully!');
      fetchRequisitions();
    } catch (error: any) {
      console.error('Failed to delete requisition:', error);
      alert('Failed to delete: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return '#10b981';
      case 'draft':
        return '#f59e0b';
      case 'closed':
        return '#6b7280';
      default:
        return '#9ca3af';
    }
  };

  const getTemplateTitle = (templateId: any) => {
    if (typeof templateId === 'object' && templateId?.title) {
      return templateId.title;
    }
    const template = templates.find(t => t._id === templateId);
    return template?.title || 'Unknown Template';
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER]}>
      <DashboardLayout title="Job Requisitions" role="Human Resources">
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ marginBottom: '0.5rem' }}>Job Requisitions Management</h1>
              <p style={{ color: '#666', fontSize: '0.95rem' }}>
                Create and manage job requisitions based on approved templates
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                padding: '0.75rem 1.5rem',
                background: showCreateForm ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {showCreateForm ? 'Cancel' : '+ Create Requisition'}
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateRequisition} style={{
              background: '#f9fafb',
              padding: '2rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '2px solid #e5e7eb'
            }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Create New Job Requisition</h2>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Job Template <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    value={formData.templateId}
                    onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select a job template...</option>
                    {(templates || []).map(template => (
                      <option key={template._id} value={template._id}>
                        {template.title} - {template.department}
                      </option>
                    ))}
                  </select>
                  {(templates || []).length === 0 && (
                    <p style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      No templates available. <a href="/dashboard/hr/recruitment/job-templates/create" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Create a template first</a>
                    </p>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Number of Openings <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g., 1, 2, 5"
                      value={formData.openings}
                      onChange={(e) => setFormData({ ...formData, openings: e.target.value ? parseInt(e.target.value) : '' as any })}
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Location <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., New York, Remote, Hybrid"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1.05rem',
                    fontWeight: '600'
                  }}
                >
                  Create Job Requisition
                </button>
              </div>
            </form>
          )}

          {/* Requisitions List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              Loading job requisitions...
            </div>
          ) : requisitions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              background: '#f9fafb',
              borderRadius: '8px',
              color: '#666'
            }}>
              <p style={{ marginBottom: '1rem' }}>No job requisitions created yet</p>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Create Your First Requisition
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requisitions.map(req => (
                <div
                  key={req._id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
                          {typeof req.templateId === 'object' ? req.templateId.title : getTemplateTitle(req.templateId)}
                        </h3>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: getStatusColor(req.publishStatus),
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {req.publishStatus.toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        <div>
                          <strong>ID:</strong> {req.requisitionId}
                        </div>
                        <div>
                          <strong>Location:</strong> {req.location}
                        </div>
                        <div>
                          <strong>Openings:</strong> {req.openings}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                        Created: {new Date(req.createdAt).toLocaleDateString()}
                        {req.postingDate && ` • Published: ${new Date(req.postingDate).toLocaleDateString()}`}
                        {req.expiryDate && ` • Expires: ${new Date(req.expiryDate).toLocaleDateString()}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => router.push(`/dashboard/hr/recruitment/requisitions/edit/${req._id}`)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(req._id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {!loading && requisitions.length > 0 && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: '#f9fafb',
              borderRadius: '6px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.9rem'
            }}>
              Total: {requisitions.length} requisition{requisitions.length !== 1 ? 's' : ''}
              {' • '}
              {requisitions.filter(r => r.publishStatus === 'published').length} published
              {' • '}
              {requisitions.filter(r => r.publishStatus === 'draft').length} draft
              {' • '}
              {requisitions.filter(r => r.publishStatus === 'closed').length} closed
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
