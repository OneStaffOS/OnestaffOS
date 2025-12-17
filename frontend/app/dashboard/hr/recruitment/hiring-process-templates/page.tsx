/**
 * Hiring Process Templates Page
 * Route: /dashboard/hr/recruitment/hiring-process-templates
 * HR Manager can view the standardized hiring process stages
 * Stages are defined in ApplicationStage enum: Screening, Department Interview, HR Interview, Offer
 */

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import styles from '../../../dashboard.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
// Fixed hiring process stages as defined in ApplicationStage enum
const HIRING_STAGES = [
  { 
    name: 'Screening', 
    value: 'screening',
    order: 1, 
    description: 'Initial application review and resume screening',
    progress: 25
  },
  { 
    name: 'Department Interview', 
    value: 'department_interview',
    order: 2, 
    description: 'Technical/functional interview with department team',
    progress: 50
  },
  { 
    name: 'HR Interview', 
    value: 'hr_interview',
    order: 3, 
    description: 'HR interview for cultural fit and final evaluation',
    progress: 75
  },
  { 
    name: 'Offer', 
    value: 'offer',
    order: 4, 
    description: 'Job offer extended to successful candidate',
    progress: 100
  },
];

export default function HiringProcessTemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER]}>
      <DashboardLayout title="Hiring Process" role="Human Resources">
        <div className={styles.section}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ marginBottom: '0.5rem' }}>Standard Hiring Process</h1>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Applications are automatically tracked through these defined stages. 
              Progress percentage is calculated based on the current stage.
            </p>
          </div>

          {/* Process Overview */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#374151' }}>
              Hiring Process Flow
            </h2>

            {/* Visual Stage Flow */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '1rem',
              marginBottom: '2rem'
            }}>
              {HIRING_STAGES.map((stage, index) => (
                <div key={stage.value} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius: '12px',
                    minWidth: '140px',
                    textAlign: 'center',
                    color: 'white',
                    boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
                  }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      opacity: 0.9,
                      marginBottom: '0.25rem'
                    }}>
                      Stage {stage.order}
                    </div>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '0.95rem'
                    }}>
                      {stage.name}
                    </div>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      opacity: 0.9,
                      marginTop: '0.25rem'
                    }}>
                      {stage.progress}%
                    </div>
                  </div>
                  {index < HIRING_STAGES.length - 1 && (
                    <div style={{
                      width: '40px',
                      height: '3px',
                      background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'absolute',
                        right: '-6px',
                        top: '-5px',
                        width: 0,
                        height: 0,
                        borderLeft: '10px solid #2563eb',
                        borderTop: '6px solid transparent',
                        borderBottom: '6px solid transparent'
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stage Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {HIRING_STAGES.map((stage) => (
                <div
                  key={stage.value}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', margin: 0, color: '#374151' }}>
                      {stage.order}. {stage.name}
                    </h3>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {stage.progress}%
                    </span>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    {stage.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1e40af' }}>
              How Progress Tracking Works
            </h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  flexShrink: 0
                }}>1</div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e40af' }}>Application Submitted</h4>
                  <p style={{ margin: 0, color: '#3b82f6', fontSize: '0.9rem' }}>
                    When a candidate applies, their application starts at the Screening stage (25% progress)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  flexShrink: 0
                }}>2</div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e40af' }}>Stage Advancement</h4>
                  <p style={{ margin: 0, color: '#3b82f6', fontSize: '0.9rem' }}>
                    HR moves applications through stages. Each advancement automatically updates the progress percentage
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  flexShrink: 0
                }}>3</div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e40af' }}>Offer Stage</h4>
                  <p style={{ margin: 0, color: '#3b82f6', fontSize: '0.9rem' }}>
                    When an application reaches the Offer stage, it shows 100% progress and is ready for offer generation
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            marginTop: '2rem', 
            display: 'flex', 
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => router.push('/dashboard/hr/recruitment/job-templates')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Manage Job Templates
            </button>

            <button
              onClick={() => router.push('/dashboard/hr/recruitment/requisitions')}
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
              View Job Requisitions
            </button>

            <button
              onClick={() => router.back()}
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
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
