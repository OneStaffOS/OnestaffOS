/**
 * Create Job Template Page
 * Route: /dashboard/hr/recruitment/job-templates/create
 * HR Manager can create standardized job templates
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../../dashboard.module.css';

export default function CreateJobTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    qualifications: [''],
    skills: [''],
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/organization-structure/departments');
      const activeDepts = response.data
        .filter((dept: any) => dept.isActive)
        .map((dept: any) => dept.name)
        .sort();
      setDepartments(activeDepts);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'qualifications' | 'skills', index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field: 'qualifications' | 'skills') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'qualifications' | 'skills', index: number) => {
    if (formData[field].length <= 1) {
      alert(`At least one ${field === 'qualifications' ? 'qualification' : 'skill'} is required`);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      alert('Please enter a job title');
      return;
    }

    if (!formData.department) {
      alert('Please select a department');
      return;
    }

    const validQualifications = formData.qualifications.filter(q => q.trim());
    if (validQualifications.length === 0) {
      alert('Please enter at least one qualification');
      return;
    }

    const validSkills = formData.skills.filter(s => s.trim());
    if (validSkills.length === 0) {
      alert('Please enter at least one skill');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        title: formData.title.trim(),
        department: formData.department,
        description: formData.description.trim() || undefined,
        qualifications: validQualifications,
        skills: validSkills,
      };

      await axios.post('/recruitment/job-templates', payload);
      alert('Job template created successfully!');
      router.push('/dashboard/hr/recruitment/job-templates');
    } catch (error: any) {
      console.error('Failed to create template:', error);
      alert('Failed to create template: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER]}>
      <DashboardLayout title="Create Job Template" role="Human Resources">
        <div className={styles.section}>
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.5rem 1rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                marginBottom: '1rem'
              }}
            >
              ← Back
            </button>
            <h1 style={{ marginBottom: '0.5rem' }}>Create Job Template</h1>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Define a standardized job description template for consistent postings
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              {/* Basic Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#374151' }}>
                  Basic Information
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Job Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Department <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a department</option>
                    {(departments || []).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Job Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Brief description of the role and responsibilities..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Qualifications */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', color: '#374151' }}>
                    Required Qualifications <span style={{ color: '#ef4444' }}>*</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => addArrayItem('qualifications')}
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
                    + Add Qualification
                  </button>
                </div>

                {formData.qualifications.map((qual, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={qual}
                      onChange={(e) => handleArrayChange('qualifications', index, e.target.value)}
                      placeholder={`Qualification ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('qualifications', index)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', color: '#374151' }}>
                    Required Skills <span style={{ color: '#ef4444' }}>*</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => addArrayItem('skills')}
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
                    + Add Skill
                  </button>
                </div>

                {formData.skills.map((skill, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={skill}
                      onChange={(e) => handleArrayChange('skills', index, e.target.value)}
                      placeholder={`Skill ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('skills', index)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'flex-end',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
