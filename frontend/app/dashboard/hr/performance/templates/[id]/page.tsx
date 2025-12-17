'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios-config';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { SystemRole as Role } from '@/lib/roles';
import styles from '../templates.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface RatingScale {
  type: 'THREE_POINT' | 'FIVE_POINT' | 'TEN_POINT';
  min: number;
  max: number;
  step: number;
  labels: string[];
}

interface Criterion {
  key: string;
  title: string;
  details?: string;
  weight?: number;
  maxScore?: number;
  required?: boolean;
}

interface Template {
  _id: string;
  name: string;
  description?: string;
  templateType: 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT' | 'AD_HOC';
  ratingScale: RatingScale;
  criteria: Criterion[];
  instructions?: string;
  applicableDepartmentIds?: any[];
  applicablePositionIds?: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ViewTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/performance/templates/${templateId}`);
      setTemplate(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/hr/performance/templates/${templateId}/edit`);
  };

  const handleToggleActive = async () => {
    if (!template) return;

    try {
      const response = await axios.put(`/performance/templates/${templateId}`, {
        isActive: !template.isActive,
      });
      setTemplate(response.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update template status');
    }
  };

  const formatTemplateType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
        <DashboardLayout title="Template Details" role="HR Manager">
          <div className={styles.container}>
            <p>Loading template...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !template) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
        <DashboardLayout title="Template Details" role="HR Manager">
          <div className={styles.container}>
            <div className={styles.errorMessage}>{error || 'Template not found'}</div>
            <button onClick={() => router.push('/dashboard/hr/performance/templates')} className={styles.button}>
              Back to Templates
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Template Details" role="HR Manager">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Template Details</h1>
              <p className={styles.subtitle}>View appraisal template information</p>
            </div>
            <div className={styles.headerActions}>
              <button onClick={() => router.push('/hr/performance/templates')} className={styles.secondaryButton}>
                Back to List
              </button>
              <button onClick={handleEdit} className={styles.button}>
                Edit Template
              </button>
              <button
                onClick={handleToggleActive}
                className={template.isActive ? styles.dangerButton : styles.button}
              >
                {template.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>

          <div className={styles.viewCard}>
            <div className={styles.statusBadge} data-active={template.isActive}>
              {template.isActive ? 'Active' : 'Inactive'}
            </div>

            <section className={styles.viewSection}>
              <h2>Basic Information</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Template Name</label>
                  <p>{template.name}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>Template Type</label>
                  <p>{formatTemplateType(template.templateType)}</p>
                </div>
                {template.description && (
                  <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <p>{template.description}</p>
                  </div>
                )}
                <div className={styles.infoItem}>
                  <label>Created</label>
                  <p>{formatDate(template.createdAt)}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>Last Updated</label>
                  <p>{formatDate(template.updatedAt)}</p>
                </div>
              </div>
            </section>

            <section className={styles.viewSection}>
              <h2>Rating Scale</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Scale Type</label>
                  <p>{formatTemplateType(template.ratingScale.type)}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>Range</label>
                  <p>{template.ratingScale.min} to {template.ratingScale.max}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>Step</label>
                  <p>{template.ratingScale.step}</p>
                </div>
                {template.ratingScale.labels && template.ratingScale.labels.length > 0 && (
                  <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                    <label>Rating Labels</label>
                    <div className={styles.labelList}>
                      {template.ratingScale.labels.map((label, index) => (
                        <span key={index} className={styles.labelChip}>
                          {template.ratingScale.min + index * template.ratingScale.step}: {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className={styles.viewSection}>
              <h2>Evaluation Criteria ({template.criteria.length})</h2>
              <div className={styles.criteriaList}>
                {template.criteria.map((criterion, index) => (
                  <div key={index} className={styles.criterionCard}>
                    <div className={styles.criterionHeader}>
                      <h3>{criterion.title}</h3>
                      {criterion.weight && (
                        <span className={styles.weightBadge}>{criterion.weight}%</span>
                      )}
                    </div>
                    <div className={styles.criterionMeta}>
                      <span className={styles.metaItem}>Key: <code>{criterion.key}</code></span>
                      {criterion.maxScore && (
                        <span className={styles.metaItem}>Max Score: {criterion.maxScore}</span>
                      )}
                      {criterion.required && (
                        <span className={styles.requiredBadge}>Required</span>
                      )}
                    </div>
                    {criterion.details && (
                      <p className={styles.criterionDetails}>{criterion.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {template.instructions && (
              <section className={styles.viewSection}>
                <h2>Instructions</h2>
                <div className={styles.instructionsBox}>
                  {template.instructions}
                </div>
              </section>
            )}

            {template.applicableDepartmentIds && template.applicableDepartmentIds.length > 0 && (
              <section className={styles.viewSection}>
                <h2>Applicable Departments</h2>
                <p>{template.applicableDepartmentIds.length} department(s) configured</p>
              </section>
            )}

            {template.applicablePositionIds && template.applicablePositionIds.length > 0 && (
              <section className={styles.viewSection}>
                <h2>Applicable Positions</h2>
                <p>{template.applicablePositionIds.length} position(s) configured</p>
              </section>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
