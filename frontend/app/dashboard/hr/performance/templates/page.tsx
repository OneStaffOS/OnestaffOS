/**
 * Performance Templates Management (Route: /hr/performance/templates)
 * REQ-PP-01: Configure standardized appraisal templates and rating scales
 * Accessible by: HR Manager, HR Admin
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './templates.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Template {
  _id: string;
  name: string;
  description: string;
  type: 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT_BASED';
  ratingScale: {
    min: number;
    max: number;
    labels: { value: number; label: string; description?: string }[];
  };
  criteria: {
    name: string;
    description: string;
    weight: number;
    category?: string;
  }[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function PerformanceTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [showInactive]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/performance/templates?includeInactive=${showInactive}`);
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      alert('Failed to load templates: ' + (error.response?.data?.message || error.message));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this template?`)) return;

    try {
      await axios.put(`/performance/templates/${id}`, { isActive: !currentStatus });
      alert('Template status updated successfully');
      fetchTemplates();
    } catch (error: any) {
      console.error('Failed to toggle template status:', error);
      alert('Failed to update template: ' + (error.response?.data?.message || error.message));
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ANNUAL: 'Annual Review',
      SEMI_ANNUAL: 'Semi-Annual Review',
      PROBATIONARY: 'Probationary Review',
      PROJECT_BASED: 'Project-Based Review',
    };
    return labels[type] || type;
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Performance Appraisal Templates" role="HR Manager">
        <div className={styles.container}>
          {/* Header Actions */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1>Appraisal Templates</h1>
              <p className={styles.subtitle}>
                Configure standardized templates for consistent and fair evaluations (REQ-PP-01)
              </p>
            </div>
            <div className={styles.headerRight}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox" checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                <span>Show Inactive</span>
              </label>
              <button
                className={styles.actionButton}
                onClick={() => router.push('/dashboard/hr/performance/templates/create')}
              >
                + Create Template
              </button>
            </div>
          </div>

          {/* Templates List */}
          {loading ? (
            <Spinner message="Loading templates..." />
          ) : templates.length === 0 ? (
            <div className={styles.empty}>
              <p>No templates found</p>
              <button
                className={styles.primaryButton}
                onClick={() => router.push('/dashboard/hr/performance/templates/create')}
              >
                Create Your First Template
              </button>
            </div>
          ) : (
            <div className={styles.templateGrid}>
              {(templates || []).map((template) => (
                <div
                  key={template._id}
                  className={`${styles.templateCard} ${!template.isActive ? styles.inactive : ''}`}
                >
                  <div className={styles.templateHeader}>
                    <div>
                      <h3>{template.name}</h3>
                      <span className={styles.templateType}>{getTypeLabel(template.type)}</span>
                    </div>
                    <div className={styles.statusBadge}>
                      {template.isActive ? (
                        <span className={styles.active}>Active</span>
                      ) : (
                        <span className={styles.inactive}>Inactive</span>
                      )}
                    </div>
                  </div>

                  <p className={styles.description}>{template.description}</p>

                  <div className={styles.templateDetails}>
                    <div className={styles.detailItem}>
                      <strong>Rating Scale:</strong> {template.ratingScale.min} - {template.ratingScale.max}
                    </div>
                    <div className={styles.detailItem}>
                      <strong>Criteria:</strong> {template.criteria.length} evaluation criteria
                    </div>
                    <div className={styles.detailItem}>
                      <strong>Total Weight:</strong> {template.criteria.reduce((sum, c) => sum + c.weight, 0)}%
                    </div>
                  </div>

                  <div className={styles.ratingLabels}>
                    {template.ratingScale.labels.map((label, idx) => (
                      <div key={idx} className={styles.ratingLabel}>
                        <span className={styles.ratingValue}>{label.value}</span>
                        <span className={styles.ratingText}>{label.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.templateActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => router.push(`/dashboard/hr/performance/templates/${template._id}`)}
                    >
                      View Details
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => router.push(`/dashboard/hr/performance/templates/${template._id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className={template.isActive ? styles.dangerButton : styles.successButton}
                      onClick={() => handleToggleActive(template._id, template.isActive)}
                    >
                      {template.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  <div className={styles.templateFooter}>
                    <small>
                      Created {new Date(template.createdAt).toLocaleDateString()} | 
                      Updated {new Date(template.updatedAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}