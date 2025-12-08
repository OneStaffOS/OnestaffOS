/**
 * Policy Configuration Initiation Page
 * Initiate leave configuration process, define and manage leave policies
 * Accessible by: HR Admin, System Admin
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './policy-config.module.css';

interface ConfigurationStatus {
  categories: { count: number; configured: boolean };
  leaveTypes: { count: number; configured: boolean };
  policies: { count: number; configured: boolean };
  calendar: { configured: boolean };
  entitlements: { count: number; configured: boolean };
}

export default function PolicyConfigurationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ConfigurationStatus>({
    categories: { count: 0, configured: false },
    leaveTypes: { count: 0, configured: false },
    policies: { count: 0, configured: false },
    calendar: { configured: false },
    entitlements: { count: 0, configured: false },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfigurationStatus();
  }, []);

  const fetchConfigurationStatus = async () => {
    try {
      setLoading(true);
      const [categoriesRes, typesRes, policiesRes, calendarRes] = await Promise.all([
        axios.get('/leaves/categories').catch(() => ({ data: [] })),
        axios.get('/leaves/types').catch(() => ({ data: [] })),
        axios.get('/leaves/policies').catch(() => ({ data: [] })),
        axios.get(`/leaves/calendars/${new Date().getFullYear()}`).catch(() => ({ data: null })),
      ]);

      setStatus({
        categories: { 
          count: categoriesRes.data.length, 
          configured: categoriesRes.data.length > 0 
        },
        leaveTypes: { 
          count: typesRes.data.length, 
          configured: typesRes.data.length > 0 
        },
        policies: { 
          count: policiesRes.data.length, 
          configured: policiesRes.data.length > 0 
        },
        calendar: { 
          configured: calendarRes.data !== null 
        },
        entitlements: { 
          count: 0, 
          configured: false 
        },
      });
    } catch (error) {
      console.error('Failed to fetch configuration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const configurationSteps = [
    {
      step: 1,
      title: 'Create Leave Categories',
      description: 'Define categories like Paid Leave, Unpaid Leave, Special Leave',
      route: '/dashboard/hr/leaves/categories',
      status: status.categories.configured,
      count: status.categories.count,
      countLabel: 'categories',
    },
    {
      step: 2,
      title: 'Define Leave Types',
      description: 'Create specific leave types (Annual, Sick, Maternity, etc.)',
      route: '/dashboard/hr/leaves/types',
      status: status.leaveTypes.configured,
      count: status.leaveTypes.count,
      countLabel: 'leave types',
    },
  ];

  const completedSteps = configurationSteps.filter(s => s.status).length;
  const progressPercentage = (completedSteps / configurationSteps.length) * 100;

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Policy Configuration" role="HR Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Policy Configuration Initiation</h1>
              <p className={styles.subtitle}>
                Follow these steps to configure your leave management system
              </p>
            </div>
            <button 
              className={styles.backButton}
              onClick={() => router.push('/dashboard/hr/leaves')}
            >
              Back to Leave Management
            </button>
          </div>

          {/* Progress Overview */}
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <h2>Configuration Progress</h2>
              <span className={styles.progressText}>
                {completedSteps} of {configurationSteps.length} steps completed
              </span>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Configuration Steps */}
          <div className={styles.stepsGrid}>
            {configurationSteps.map((step) => (
              <div 
                key={step.step}
                className={`${styles.stepCard} ${step.status ? styles.completed : ''}`}
              >
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>
                    {step.status ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      step.step
                    )}
                  </div>
                  <div className={styles.stepStatus}>
                    {step.status ? 'Configured' : 'Pending'}
                  </div>
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
                {step.count !== null && step.count > 0 && (
                  <p className={styles.stepCount}>
                    {step.count} {step.countLabel} created
                  </p>
                )}
                <button
                  className={styles.stepButton}
                  onClick={() => router.push(step.route)}
                >
                  {step.status ? 'Manage' : 'Configure'}
                </button>
              </div>
            ))}
          </div>

          {/* Refresh Button */}
          <div className={styles.refreshSection}>
            <button 
              className={styles.refreshButton}
              onClick={fetchConfigurationStatus}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Configuration Status'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
