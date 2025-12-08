/**
 * Create Performance Template (Route: /hr/performance/templates/create)
 * REQ-PP-01: Configure standardized appraisal templates and rating scales
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../../components/ProtectedRoute';
import DashboardLayout from '../../../../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../templates.module.css';

interface Criterion {
  key: string;
  title: string;
  details: string;
  weight: number;
}

export default function CreateTemplatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    templateType: 'ANNUAL' as 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT' | 'AD_HOC',
    ratingScale: {
      type: 'FIVE_POINT' as 'THREE_POINT' | 'FIVE_POINT' | 'TEN_POINT',
      min: 1,
      max: 5,
      step: 1,
      labels: ['Poor', 'Below Average', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'],
    },
    instructions: '',
  });
  const [criteria, setCriteria] = useState<Criterion[]>([
    { key: 'job_knowledge', title: 'Job Knowledge', details: 'Understanding of role and responsibilities', weight: 20 },
    { key: 'quality_of_work', title: 'Quality of Work', details: 'Accuracy and thoroughness', weight: 20 },
    { key: 'productivity', title: 'Productivity', details: 'Volume and timeliness of work', weight: 15 },
    { key: 'communication', title: 'Communication', details: 'Clarity and effectiveness', weight: 15 },
    { key: 'teamwork', title: 'Teamwork', details: 'Collaboration and cooperation', weight: 15 },
    { key: 'initiative', title: 'Initiative', details: 'Proactiveness and problem-solving', weight: 15 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addCriterion = () => {
    setCriteria([...criteria, { key: '', title: '', details: '', weight: 0 }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: keyof Criterion, value: string | number) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleRatingScaleTypeChange = (type: 'THREE_POINT' | 'FIVE_POINT' | 'TEN_POINT') => {
    const configs = {
      THREE_POINT: { min: 1, max: 3, step: 1, labels: ['Poor', 'Satisfactory', 'Excellent'] },
      FIVE_POINT: { min: 1, max: 5, step: 1, labels: ['Poor', 'Below Average', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'] },
      TEN_POINT: { min: 1, max: 10, step: 1, labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
    };
    setFormData({
      ...formData,
      ratingScale: { type, ...configs[type] },
    });
  };

  const updateRatingLabel = (index: number, value: string) => {
    const updated = [...formData.ratingScale.labels];
    updated[index] = value;
    setFormData({
      ...formData,
      ratingScale: { ...formData.ratingScale, labels: updated },
    });
  };

  const calculateTotalWeight = () => {
    return criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalWeight = calculateTotalWeight();
    if (totalWeight !== 100) {
      alert(`Total weight must equal 100%. Currently: ${totalWeight}%`);
      return;
    }

    if (criteria.some(c => !c.key || !c.title)) {
      alert('All criteria must have a key and title');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post('/performance/templates', {
        name: formData.name,
        description: formData.description,
        templateType: formData.templateType,
        ratingScale: {
          type: formData.ratingScale.type,
          min: formData.ratingScale.min,
          max: formData.ratingScale.max,
          step: formData.ratingScale.step,
          labels: formData.ratingScale.labels,
        },
        criteria: criteria.map(c => ({
          key: c.key,
          title: c.title,
          details: c.details,
          weight: c.weight,
        })),
        instructions: formData.instructions,
        isActive: true,
      });

      alert('Template created successfully!');
      router.push('/dashboard/hr/performance/templates');
    } catch (error: any) {
      console.error('Failed to create template:', error);
      alert('Failed to create template: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Create Appraisal Template" role="HR Manager">
        <div className={styles.container}>
          <div className={styles.formHeader}>
            <h1>Create New Appraisal Template</h1>
            <p className={styles.subtitle}>Configure a standardized template for performance evaluations</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Basic Information */}
            <div className={styles.formSection}>
              <h2>Basic Information</h2>
              
              <div className={styles.formGroup}>
                <label>Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Performance Review 2025"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose and scope of this template..."
                  required
                  rows={3}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Template Type *</label>
                <select
                  value={formData.templateType}
                  onChange={(e) => setFormData({ ...formData, templateType: e.target.value as any })}
                  required
                  className={styles.select}
                >
                  <option value="ANNUAL">Annual Review</option>
                  <option value="SEMI_ANNUAL">Semi-Annual Review</option>
                  <option value="PROBATIONARY">Probationary Review</option>
                  <option value="PROJECT">Project-Based Review</option>
                  <option value="AD_HOC">Ad-Hoc Review</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Instructions (optional)</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Provide instructions for managers on how to complete this appraisal..."
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>

            {/* Rating Scale */}
            <div className={styles.formSection}>
              <h2>Rating Scale</h2>
              
              <div className={styles.formGroup}>
                <label>Scale Type *</label>
                <select
                  value={formData.ratingScale.type}
                  onChange={(e) => handleRatingScaleTypeChange(e.target.value as any)}
                  required
                  className={styles.select}
                >
                  <option value="THREE_POINT">3-Point Scale (1-3)</option>
                  <option value="FIVE_POINT">5-Point Scale (1-5)</option>
                  <option value="TEN_POINT">10-Point Scale (1-10)</option>
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Minimum Value</label>
                  <input
                    type="number"
                    value={formData.ratingScale.min}
                    readOnly
                    className={styles.input}
                    style={{ background: '#f9fafb' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Maximum Value</label>
                  <input
                    type="number"
                    value={formData.ratingScale.max}
                    readOnly
                    className={styles.input}
                    style={{ background: '#f9fafb' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Step</label>
                  <input
                    type="number"
                    value={formData.ratingScale.step}
                    readOnly
                    className={styles.input}
                    style={{ background: '#f9fafb' }}
                  />
                </div>
              </div>

              <h3>Rating Labels</h3>
              <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
                Customize the labels for each rating point
              </p>
              {formData.ratingScale.labels.map((label, index) => (
                <div key={index} className={styles.ratingLabelRow}>
                  <div style={{ 
                    background: '#2563eb', 
                    color: 'white', 
                    padding: '0.5rem 0.75rem', 
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => updateRatingLabel(index, e.target.value)}
                    placeholder={`Label for ${index + 1}`}
                    className={styles.input}
                    required
                  />
                </div>
              ))}
            </div>

            {/* Evaluation Criteria */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h2>Evaluation Criteria</h2>
                <div className={styles.weightIndicator}>
                  Total Weight: <strong className={calculateTotalWeight() === 100 ? styles.validWeight : styles.invalidWeight}>
                    {calculateTotalWeight()}%
                  </strong>
                </div>
              </div>

              {criteria.map((criterion, index) => (
                <div key={index} className={styles.criterionCard}>
                  <div className={styles.criterionHeader}>
                    <h4>Criterion {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className={styles.removeButton}
                      disabled={criteria.length <= 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup} style={{ flex: 1 }}>
                      <label>Key (unique identifier) *</label>
                      <input
                        type="text"
                        value={criterion.key}
                        onChange={(e) => updateCriterion(index, 'key', e.target.value)}
                        placeholder="e.g., communication_skills"
                        required
                        className={styles.input}
                      />
                      <small style={{ color: '#666', fontSize: '0.8rem' }}>
                        Use lowercase with underscores (e.g., job_knowledge)
                      </small>
                    </div>
                    <div className={styles.formGroup} style={{ flex: 2 }}>
                      <label>Title *</label>
                      <input
                        type="text"
                        value={criterion.title}
                        onChange={(e) => updateCriterion(index, 'title', e.target.value)}
                        placeholder="e.g., Communication Skills"
                        required
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroup} style={{ flex: 1 }}>
                      <label>Weight (%) *</label>
                      <input
                        type="number"
                        value={criterion.weight}
                        onChange={(e) => updateCriterion(index, 'weight', Number(e.target.value))}
                        min={0}
                        max={100}
                        required
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Details</label>
                    <textarea
                      value={criterion.details}
                      onChange={(e) => updateCriterion(index, 'details', e.target.value)}
                      placeholder="Describe what this criterion evaluates..."
                      rows={2}
                      className={styles.textarea}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addCriterion}
                className={styles.addButton}
              >
                + Add Criterion
              </button>
            </div>

            {/* Form Actions */}
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => router.back()}
                className={styles.cancelButton}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || calculateTotalWeight() !== 100}
              >
                {submitting ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
