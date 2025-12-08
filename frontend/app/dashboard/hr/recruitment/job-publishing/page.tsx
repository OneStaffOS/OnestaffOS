/**
 * Job Publishing Page
 * Route: /dashboard/hr/recruitment/job-publishing
 * HR Employee can preview and publish job requisitions to the careers page
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
  templateId: JobTemplate;
  openings: number;
  location: string;
  hiringManagerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  publishStatus: 'draft' | 'published' | 'closed';
  postingDate?: string;
  expiryDate?: string;
  createdAt: string;
}

export default function JobPublishingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewingJob, setPreviewingJob] = useState<JobRequisition | null>(null);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/recruitment/job-requisitions');
      setRequisitions(response.data);
    } catch (error) {
      console.error('Failed to fetch job requisitions:', error);
      alert('Failed to load job requisitions');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string, status: 'published' | 'draft' | 'closed') => {
    const action = status === 'published' ? 'publish' : status === 'draft' ? 'unpublish' : 'close';
    
    if (!confirm(`Are you sure you want to ${action} this job posting?`)) {
      return;
    }

    try {
      await axios.patch(`/recruitment/job-requisitions/${id}/publish`, {
        publishStatus: status
      });
      alert(`Job ${action}ed successfully!`);
      fetchRequisitions();
      setPreviewingJob(null);
    } catch (error: any) {
      console.error(`Failed to ${action} job:`, error);
      alert(`Failed to ${action} job: ` + (error.response?.data?.message || error.message));
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

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Filter requisitions
  const filteredRequisitions = requisitions.filter(req => {
    const matchesStatus = filterStatus === 'all' || req.publishStatus === filterStatus;
    const matchesSearch = searchTerm === '' || 
      req.templateId?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requisitionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  return (
    <ProtectedRoute requiredRoles={[Role.HR_EMPLOYEE, Role.HR_MANAGER]}>
      <DashboardLayout title="Job Publishing" role="Human Resources">
        <div className={styles.section}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ marginBottom: '0.5rem' }}>Job Publishing & Careers Page Management</h1>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Preview and publish job requisitions to the company careers page with professional employer branding
            </p>
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
              placeholder="Search by title, ID, or location..."
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                minWidth: '150px',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Jobs List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              Loading job requisitions...
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              background: '#f9fafb',
              borderRadius: '8px',
              color: '#666'
            }}>
              {searchTerm || filterStatus !== 'all' ? (
                <>
                  <p style={{ marginBottom: '1rem' }}>No job requisitions match your filters</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
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
                <p>No job requisitions available for publishing</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredRequisitions.map(req => (
                <div
                  key={req._id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
                          {req.templateId?.title || 'Untitled Position'}
                        </h3>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: getStatusColor(req.publishStatus),
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {getStatusLabel(req.publishStatus)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                        <div>
                          <strong>ID:</strong> {req.requisitionId}
                        </div>
                        <div>
                          <strong>Department:</strong> {req.templateId?.department || 'N/A'}
                        </div>
                        <div>
                          <strong>Location:</strong> {req.location || 'Not specified'}
                        </div>
                        <div>
                          <strong>Openings:</strong> {req.openings}
                        </div>
                      </div>

                      {req.postingDate && (
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                          Posted: {new Date(req.postingDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => setPreviewingJob(req)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#6366f1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        👁️ Preview
                      </button>

                      {req.publishStatus === 'draft' && (
                        <button
                          onClick={() => handlePublish(req._id, 'published')}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          📢 Publish
                        </button>
                      )}

                      {req.publishStatus === 'published' && (
                        <>
                          <button
                            onClick={() => handlePublish(req._id, 'draft')}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            📝 Unpublish
                          </button>
                          <button
                            onClick={() => handlePublish(req._id, 'closed')}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            🔒 Close
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview Modal */}
          {previewingJob && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '2rem',
                position: 'relative'
              }}>
                <button
                  onClick={() => setPreviewingJob(null)}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>

                {/* Careers Page Preview */}
                <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
                  <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    CAREERS PAGE PREVIEW
                  </div>
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                    {previewingJob.templateId?.title}
                  </h2>
                  
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    <div>
                      <strong>📍 Location:</strong> {previewingJob.location || 'Remote'}
                    </div>
                    <div>
                      <strong>🏢 Department:</strong> {previewingJob.templateId?.department}
                    </div>
                    <div>
                      <strong>👥 Openings:</strong> {previewingJob.openings}
                    </div>
                  </div>

                  {previewingJob.templateId?.description && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>About the Role</h3>
                      <p style={{ color: '#374151', lineHeight: '1.6' }}>
                        {previewingJob.templateId.description}
                      </p>
                    </div>
                  )}

                  {previewingJob.templateId?.qualifications && previewingJob.templateId.qualifications.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Required Qualifications</h3>
                      <ul style={{ paddingLeft: '1.5rem', color: '#374151', lineHeight: '1.8' }}>
                        {previewingJob.templateId.qualifications.map((qual, idx) => (
                          <li key={idx}>{qual}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {previewingJob.templateId?.skills && previewingJob.templateId.skills.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Required Skills</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {previewingJob.templateId.skills.map((skill, idx) => (
                          <span key={idx} style={{
                            padding: '0.5rem 1rem',
                            background: '#eff6ff',
                            color: '#1e40af',
                            borderRadius: '20px',
                            fontSize: '0.9rem'
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  {previewingJob.publishStatus === 'draft' && (
                    <button
                      onClick={() => handlePublish(previewingJob._id, 'published')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                      }}
                    >
                      📢 Publish to Careers Page
                    </button>
                  )}
                  
                  {previewingJob.publishStatus === 'published' && (
                    <button
                      onClick={() => handlePublish(previewingJob._id, 'draft')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                      }}
                    >
                      📝 Unpublish
                    </button>
                  )}

                  <button
                    onClick={() => setPreviewingJob(null)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
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
              Showing {filteredRequisitions.length} of {requisitions.length} job requisition{requisitions.length !== 1 ? 's' : ''}
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
