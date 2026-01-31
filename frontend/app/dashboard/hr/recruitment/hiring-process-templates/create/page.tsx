/**
 * Create Hiring Process Template Page
 * Route: /dashboard/hr/recruitment/hiring-process-templates/create
 * HR Manager can create hiring process templates with custom stages
 */

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../../../dashboard.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface ProcessStage {
  name: string;
  order: number;
  description: string;
}

export default function CreateHiringProcessTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    isActive: true,
  });

  const [stages, setStages] = useState<ProcessStage[]>([
    { name: 'Screening', order: 1, description: 'Initial application review' },
    { name: 'Shortlisting', order: 2, description: 'Select qualified candidates' },
    { name: 'Interview', order: 3, description: 'Conduct interviews' },
    { name: 'Offer', order: 4, description: 'Extend job offer' },
    { name: 'Hired', order: 5, description: 'Candidate hired' },
  ]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStageChange = (index: number, field: keyof ProcessStage, value: string | number) => {
    setStages(prev => {
      const newStages = [...prev];
      newStages[index] = { ...newStages[index], [field]: value };
      return newStages;
    });
  };

  const addStage = () => {
    const newOrder = stages.length + 1;
    setStages(prev => [...prev, {
      name: '',
      order: newOrder,
      description: ''
    }]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 2) {
      alert('A hiring process must have at least 2 stages');
      return;
    }

    // Remove the stage and reorder
    const newStages = stages.filter((_, i) => i !== index);
    const reorderedStages = newStages.map((stage, idx) => ({
      ...stage,
      order: idx + 1
    }));
    setStages(reorderedStages);
  };

  const moveStageUp = (index: number) => {
    if (index === 0) return;
    
    const newStages = [...stages];
    [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
    
    // Reorder
    const reorderedStages = newStages.map((stage, idx) => ({
      ...stage,
      order: idx + 1
    }));
    setStages(reorderedStages);
  };

  const moveStageDown = (index: number) => {
    if (index === stages.length - 1) return;
    
    const newStages = [...stages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    
    // Reorder
    const reorderedStages = newStages.map((stage, idx) => ({
      ...stage,
      order: idx + 1
    }));
    setStages(reorderedStages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (stages.length < 2) {
      alert('Please define at least 2 stages');
      return;
    }

    const invalidStages = stages.filter(s => !s.name.trim());
    if (invalidStages.length > 0) {
      alert('All stages must have a name');
      return;
    }

    // Check for duplicate stage names
    const stageNames = stages.map(s => s.name.trim().toLowerCase());
    const duplicates = stageNames.filter((name, index) => stageNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      alert('Stage names must be unique');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
        stages: stages.map(stage => ({
          name: stage.name.trim(),
          order: stage.order,
          description: stage.description.trim() || undefined
        }))
      };

      await axios.post('/recruitment/hiring-process-templates', payload);
      alert('Hiring process template created successfully!');
      router.push('/dashboard/hr/recruitment/hiring-process-templates');
    } catch (error: any) {
      console.error('Failed to create template:', error);
      alert('Failed to create template: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER]}>
      <DashboardLayout title="Create Hiring Process Template" role="Human Resources">
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
            <h1 style={{ marginBottom: '0.5rem' }}>Create Hiring Process Template</h1>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Define standardized stages for tracking application progress automatically
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
                    Template Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text" value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Standard Hiring Process" required
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
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Brief description of this hiring process..." rows={3}
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

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={formData.isActive}
                      onChange={(e) => handleChange('isActive', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ color: '#374151', fontWeight: '500' }}>Active</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={formData.isDefault}
                      onChange={(e) => handleChange('isDefault', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ color: '#374151', fontWeight: '500' }}>Set as Default Template</span>
                  </label>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  The default template will be used for new job requisitions automatically
                </p>
              </div>

              {/* Process Stages */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', color: '#374151', marginBottom: '0.25rem' }}>
                      Process Stages <span style={{ color: '#ef4444' }}>*</span>
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                      Define the stages applications will go through. Progress is calculated as: (current stage / total stages) × 100%
                    </p>
                  </div>
                  <button
                    type="button" onClick={addStage}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + Add Stage
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {stages.map((stage, index) => (
                    <div
                      key={index}
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: '0.25rem',
                          minWidth: '60px'
                        }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: '#6b7280',
                            fontWeight: '500'
                          }}>
                            Stage {stage.order}
                          </span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              type="button" onClick={() => moveStageUp(index)}
                              disabled={index === 0}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: index === 0 ? '#d1d5db' : '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '0.75rem'
                              }}
                              title="Move up"
                            >
                              
                            </button>
                            <button
                              type="button" onClick={() => moveStageDown(index)}
                              disabled={index === stages.length - 1}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: index === stages.length - 1 ? '#d1d5db' : '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: index === stages.length - 1 ? 'not-allowed' : 'pointer',
                                fontSize: '0.75rem'
                              }}
                              title="Move down"
                            >
                              
                            </button>
                          </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input
                            type="text" value={stage.name}
                            onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                            placeholder="Stage name (e.g., Screening, Interview)" required
                            style={{
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '1rem'
                            }}
                          />
                          <input
                            type="text" value={stage.description}
                            onChange={(e) => handleStageChange(index, 'description', e.target.value)}
                            placeholder="Optional description" style={{
                              padding: '0.5rem 0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        <button
                          type="button" onClick={() => removeStage(index)}
                          style={{
                            padding: '0.75rem 1rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            alignSelf: 'flex-start'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#6b7280',
                        marginTop: '0.5rem',
                        paddingLeft: '0.5rem'
                      }}>
                        Progress at this stage: {Math.round(((stage.order) / stages.length) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visual Preview */}
                <div style={{ 
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: '#f0f9ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ fontSize: '1rem', color: '#1e40af', marginBottom: '1rem' }}>
                    Process Flow Preview
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    overflowX: 'auto',
                    paddingBottom: '0.5rem'
                  }}>
                    {stages.map((stage, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: 'white',
                          border: '2px solid #3b82f6',
                          borderRadius: '8px',
                          minWidth: '100px',
                          textAlign: 'center'
                        }}>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            {stage.order}
                          </div>
                          <div style={{ 
                            fontWeight: '500', 
                            color: '#1e40af',
                            fontSize: '0.85rem'
                          }}>
                            {stage.name || '(unnamed)'}
                          </div>
                        </div>
                        {index < stages.length - 1 && (
                          <div style={{
                            width: '30px',
                            height: '2px',
                            background: '#3b82f6',
                            position: 'relative'
                          }}>
                            <div style={{
                              position: 'absolute',
                              right: '-5px',
                              top: '-4px',
                              width: 0,
                              height: 0,
                              borderLeft: '8px solid #3b82f6',
                              borderTop: '5px solid transparent',
                              borderBottom: '5px solid transparent'
                            }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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
                  type="button" onClick={() => router.back()}
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
                  type="submit" disabled={loading}
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