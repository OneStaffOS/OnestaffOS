'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios-config';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { SystemRole as Role } from '@/lib/roles';
import styles from '../../templates.module.css';

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

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT' | 'AD_HOC'>('ANNUAL');
  const [ratingScale, setRatingScale] = useState<RatingScale>({
    type: 'FIVE_POINT',
    min: 1,
    max: 5,
    step: 1,
    labels: ['Poor', 'Below Average', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'],
  });
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/performance/templates/${templateId}`);
      const template = response.data;

      setName(template.name);
      setDescription(template.description || '');
      setTemplateType(template.templateType);
      setRatingScale(template.ratingScale);
      setCriteria(template.criteria || []);
      setInstructions(template.instructions || '');
      setIsActive(template.isActive);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingScaleTypeChange = (type: 'THREE_POINT' | 'FIVE_POINT' | 'TEN_POINT') => {
    const scaleConfigs = {
      THREE_POINT: { min: 1, max: 3, step: 1, labels: ['Needs Improvement', 'Satisfactory', 'Excellent'] },
      FIVE_POINT: { min: 1, max: 5, step: 1, labels: ['Poor', 'Below Average', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'] },
      TEN_POINT: { min: 1, max: 10, step: 1, labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
    };

    setRatingScale({ type, ...scaleConfigs[type] });
  };

  const handleAddCriterion = () => {
    setCriteria([
      ...criteria,
      {
        key: `criterion_${criteria.length + 1}`,
        title: '',
        details: '',
        weight: 0,
        required: false,
      },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (index: number, field: keyof Criterion, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name,
        description,
        templateType,
        ratingScale: {
          type: ratingScale.type,
          min: ratingScale.min,
          max: ratingScale.max,
          step: ratingScale.step,
          labels: ratingScale.labels,
        },
        criteria: criteria.map((c) => ({
          key: c.key,
          title: c.title,
          details: c.details || '',
          weight: c.weight || 0,
          maxScore: c.maxScore,
          required: c.required || false,
        })),
        instructions,
        isActive,
      };

      await axios.put(`/performance/templates/${templateId}`, payload);
      alert('Template updated successfully!');
      router.push(`/dashboard/hr/performance/templates/${templateId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update template');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
        <DashboardLayout title="Edit Template" role="HR Manager">
          <div className={styles.container}>
            <p>Loading template...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error && !name) {
    return (
      <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
        <DashboardLayout title="Edit Template" role="HR Manager">
          <div className={styles.container}>
            <div className={styles.errorMessage}>{error}</div>
            <button onClick={() => router.push('/dashboard/hr/performance/templates')} className={styles.button}>
              Back to Templates
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Edit Template" role="HR Manager">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Edit Template</h1>
              <p className={styles.subtitle}>Update appraisal template settings</p>
            </div>
            <button onClick={() => router.push(`/dashboard/hr/performance/templates/${templateId}`)} className={styles.secondaryButton}>
              Cancel
            </button>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formSection}>
              <h2>Basic Information</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Template Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Annual Performance Review 2024"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="templateType">Template Type *</label>
                  <select
                    id="templateType"
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as any)}
                    required
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="SEMI_ANNUAL">Semi-Annual</option>
                    <option value="PROBATIONARY">Probationary</option>
                    <option value="PROJECT">Project</option>
                    <option value="AD_HOC">Ad Hoc</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of this template's purpose"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    {' '}Active Template
                  </label>
                  <small>Only active templates can be used in new appraisal cycles</small>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2>Rating Scale</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="ratingScaleType">Scale Type *</label>
                  <select
                    id="ratingScaleType"
                    value={ratingScale.type}
                    onChange={(e) => handleRatingScaleTypeChange(e.target.value as any)}
                    required
                  >
                    <option value="THREE_POINT">3-Point Scale</option>
                    <option value="FIVE_POINT">5-Point Scale</option>
                    <option value="TEN_POINT">10-Point Scale</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Min Value</label>
                  <input type="number" value={ratingScale.min} readOnly />
                </div>

                <div className={styles.formGroup}>
                  <label>Max Value</label>
                  <input type="number" value={ratingScale.max} readOnly />
                </div>

                <div className={styles.formGroup}>
                  <label>Step</label>
                  <input type="number" value={ratingScale.step} readOnly />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Rating Labels</label>
                  <div className={styles.labelInputs}>
                    {ratingScale.labels.map((label, index) => (
                      <input
                        key={index}
                        type="text"
                        value={label}
                        onChange={(e) => {
                          const newLabels = [...ratingScale.labels];
                          newLabels[index] = e.target.value;
                          setRatingScale({ ...ratingScale, labels: newLabels });
                        }}
                        placeholder={`Label for ${ratingScale.min + index * ratingScale.step}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h2>Evaluation Criteria</h2>
                <button type="button" onClick={handleAddCriterion} className={styles.addButton}>
                  + Add Criterion
                </button>
              </div>

              {criteria.map((criterion, index) => (
                <div key={index} className={styles.criterionBox}>
                  <div className={styles.criterionBoxHeader}>
                    <h3>Criterion {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(index)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Key (Unique ID) *</label>
                      <input
                        type="text"
                        value={criterion.key}
                        onChange={(e) => handleCriterionChange(index, 'key', e.target.value)}
                        required
                        placeholder="e.g., job_knowledge"
                      />
                      <small>Use lowercase with underscores (e.g., job_knowledge, teamwork)</small>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Title *</label>
                      <input
                        type="text"
                        value={criterion.title}
                        onChange={(e) => handleCriterionChange(index, 'title', e.target.value)}
                        required
                        placeholder="e.g., Job Knowledge"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Weight (%)</label>
                      <input
                        type="number"
                        value={criterion.weight || 0}
                        onChange={(e) => handleCriterionChange(index, 'weight', parseFloat(e.target.value))}
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Max Score</label>
                      <input
                        type="number"
                        value={criterion.maxScore || ''}
                        onChange={(e) => handleCriterionChange(index, 'maxScore', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Optional"
                      />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label>Details</label>
                      <textarea
                        value={criterion.details || ''}
                        onChange={(e) => handleCriterionChange(index, 'details', e.target.value)}
                        rows={2}
                        placeholder="Additional information about this criterion"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        <input
                          type="checkbox"
                          checked={criterion.required || false}
                          onChange={(e) => handleCriterionChange(index, 'required', e.target.checked)}
                        />
                        {' '}Required Criterion
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              {criteria.length === 0 && (
                <p className={styles.emptyState}>No criteria added yet. Click "Add Criterion" to get started.</p>
              )}
            </div>

            <div className={styles.formSection}>
              <h2>Instructions (Optional)</h2>
              <div className={styles.formGroup}>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  placeholder="Provide guidance for managers and employees on how to use this template..."
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/hr/performance/templates/${templateId}`)}
                className={styles.secondaryButton}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className={styles.button} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Template'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
