/**
 * Special Absence Types Page
 * Configure bereavement, Hajj, jury duty, medical quarantine, etc.
 * Accessible by: HR Admin, System Admin
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './special-types.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface LeaveCategory {
  _id: string;
  name: string;
  description?: string;
}

interface LeaveType {
  _id: string;
  name: string;
  code: string;
  categoryId: string | LeaveCategory; // Can be string or populated object
  description?: string;
  paid: boolean;
  deductible?: boolean;
  requiresAttachment: boolean;
  attachmentType?: string;
  minTenureMonths?: number | null;
  maxDurationDays?: number | null;
}

interface FormData {
  name: string;
  code: string;
  categoryId: string;
  description: string;
  paid: boolean;
  requiresAttachment: boolean;
  attachmentType: string;
  maxDurationDays: number;
}

// Category IDs
const PAID_LEAVE_CATEGORY_ID = '693067b35249cbf0de031a0a';
const UNPAID_LEAVE_CATEGORY_ID = '6930a73b314d2ad32cf70f77';

interface SpecialLeaveTemplate {
  name: string;
  code: string;
  categoryId: string;
  description: string;
  paid: boolean;
  deductible: boolean;
  requiresAttachment: boolean;
  attachmentType?: string;
  minTenureMonths: number;
  maxDurationDays: number;
}

const specialLeaveTemplates: SpecialLeaveTemplate[] = [
  { 
    name: 'Bereavement Leave', 
    code: 'BEREAVEMENT', 
    categoryId: PAID_LEAVE_CATEGORY_ID,
    description: 'Leave for death of immediate family member', 
    paid: true,
    deductible: false,
    requiresAttachment: true,
    attachmentType: 'document',
    minTenureMonths: 0,
    maxDurationDays: 5
  },
  { 
    name: 'Jury Duty', 
    code: 'JURY', 
    categoryId: PAID_LEAVE_CATEGORY_ID,
    description: 'Leave for jury service', 
    paid: true,
    deductible: false,
    requiresAttachment: true,
    attachmentType: 'document',
    minTenureMonths: 0,
    maxDurationDays: 0
  },
  { 
    name: 'Medical Quarantine', 
    code: 'QUARANTINE', 
    categoryId: PAID_LEAVE_CATEGORY_ID,
    description: 'Mandatory quarantine due to contagious illness', 
    paid: true,
    deductible: false,
    requiresAttachment: true,
    attachmentType: 'medical',
    minTenureMonths: 0,
    maxDurationDays: 14
  },
  { 
    name: 'Military Service', 
    code: 'MILITARY', 
    categoryId: UNPAID_LEAVE_CATEGORY_ID,
    description: 'Leave for military reserve duty', 
    paid: false,
    deductible: false,
    requiresAttachment: true,
    attachmentType: 'document',
    minTenureMonths: 0,
    maxDurationDays: 30
  },
  { 
    name: 'Wedding Leave', 
    code: 'WEDDING', 
    categoryId: PAID_LEAVE_CATEGORY_ID,
    description: 'Leave for employee\'s own wedding', 
    paid: true,
    deductible: false,
    requiresAttachment: true,
    attachmentType: 'document',
    minTenureMonths: 0,
    maxDurationDays: 5
  },
  { 
    name: 'Study Leave', 
    code: 'STUDY', 
    categoryId: UNPAID_LEAVE_CATEGORY_ID,
    description: 'Leave for examinations or educational purposes', 
    paid: false,
    deductible: false,
    requiresAttachment: true,
    attachmentType: 'document',
    minTenureMonths: 0,
    maxDurationDays: 10
  },
  { 
    name: 'Compassionate Leave', 
    code: 'COMPASSIONATE', 
    categoryId: PAID_LEAVE_CATEGORY_ID,
    description: 'Leave for family emergencies', 
    paid: true,
    deductible: false,
    requiresAttachment: true,
    attachmentType: 'document',
    minTenureMonths: 0,
    maxDurationDays: 3
  },
  { 
    name: 'Sick Leave', 
    code: 'SICK', 
    categoryId: PAID_LEAVE_CATEGORY_ID,
    description: 'Leave for personal illness or medical appointments', 
    paid: true,
    deductible: true,
    requiresAttachment: true,
    attachmentType: 'medical',
    minTenureMonths: 0,
    maxDurationDays: 0
  },
];

export default function SpecialTypesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [specialTypes, setSpecialTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingType, setDeletingType] = useState<LeaveType | null>(null);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    categoryId: '',
    description: '',
    paid: true,
    requiresAttachment: false,
    attachmentType: '',
    maxDurationDays: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesRes, typesRes] = await Promise.all([
        axios.get('/leaves/categories').catch(() => ({ data: [] })),
        axios.get('/leaves/types').catch(() => ({ data: [] })),
      ]);

      setCategories(categoriesRes.data);
      
      // Show all leave types - no filtering needed
      setSpecialTypes(typesRes.data);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load special leave types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (type?: LeaveType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        code: type.code,
        categoryId: getCategoryId(type.categoryId),
        description: type.description || '',
        paid: type.paid,
        requiresAttachment: type.requiresAttachment,
        attachmentType: type.attachmentType || '',
        maxDurationDays: type.maxDurationDays || 0,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        code: '',
        categoryId: categories.length > 0 ? categories[0]._id : '',
        description: '',
        paid: true,
        requiresAttachment: false,
        attachmentType: '',
        maxDurationDays: 0,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
    setError('');
  };

  const applyTemplate = (template: SpecialLeaveTemplate) => {
    setFormData({
      name: template.name,
      code: template.code,
      categoryId: template.categoryId,
      description: template.description,
      paid: template.paid,
      requiresAttachment: template.requiresAttachment,
      attachmentType: template.attachmentType || 'document',
      maxDurationDays: template.maxDurationDays,
    });
    setShowTemplateModal(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code || !formData.categoryId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        categoryId: formData.categoryId,
        description: formData.description,
        paid: formData.paid,
        deductible: true,
        requiresAttachment: formData.requiresAttachment,
        attachmentType: formData.requiresAttachment ? formData.attachmentType : undefined,
        maxDurationDays: formData.maxDurationDays || undefined,
      };

      if (editingType) {
        // Update - Note: API may not support PUT for leave types
        setError('Editing is not supported. Please delete and recreate.');
      } else {
        await axios.post('/leaves/types', payload);
      }

      setSuccess(editingType ? 'Special leave type updated' : 'Special leave type created');
      setTimeout(() => setSuccess(''), 3000);
      closeModal();
      fetchData();
    } catch (err: any) {
      console.error('Failed to save special leave type:', err);
      setError(err.response?.data?.message || 'Failed to save special leave type');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryName = (categoryId: string | LeaveCategory) => {
    // If categoryId is a populated object, return its name directly
    if (typeof categoryId === 'object' && categoryId !== null) {
      return categoryId.name;
    }
    // Otherwise, find the category by ID
    const category = categories.find(c => c._id === categoryId);
    return category?.name || 'Unknown';
  };

  const getCategoryId = (categoryId: string | LeaveCategory): string => {
    if (typeof categoryId === 'object' && categoryId !== null) {
      return categoryId._id;
    }
    return categoryId;
  };

  const confirmDelete = (type: LeaveType) => {
    setDeletingType(type);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setDeletingType(null);
    setShowDeleteConfirm(false);
  };

  const handleDelete = async () => {
    if (!deletingType) return;

    try {
      setSubmitting(true);
      await axios.delete(`/leaves/types/${deletingType._id}`);
      setSuccess(`"${deletingType.name}" deleted successfully`);
      setTimeout(() => setSuccess(''), 3000);
      cancelDelete();
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete leave type:', err);
      setError(err.response?.data?.message || 'Failed to delete leave type');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Special Absence Types" role="HR Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Special Absence Types</h1>
              <p className={styles.subtitle}>
                Configure special leave types like bereavement, Hajj, jury duty, etc.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                Back to Leave Management
              </button>
              <button 
                className={styles.templateButton}
                onClick={() => setShowTemplateModal(true)}
              >
                Use Template
              </button>
              <button 
                className={styles.primaryButton}
                onClick={() => openModal()}
              >
                Add Special Type
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {/* Special Types Grid */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Configured Special Leave Types</h2>

            {loading ? (
              <Spinner message="Loading special leave types..." />
            ) : specialTypes.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No special leave types configured yet.</p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => setShowTemplateModal(true)}
                >
                  Create from Template
                </button>
              </div>
            ) : (
              <div className={styles.typesGrid}>
                {specialTypes.map((type) => (
                  <div key={type._id} className={styles.typeCard}>
                    <div className={styles.typeHeader}>
                      <h3 className={styles.typeName}>{type.name}</h3>
                      <span className={`${styles.badge} ${type.paid ? styles.badgePaid : styles.badgeUnpaid}`}>
                        {type.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    <p className={styles.typeCode}>{type.code}</p>
                    {type.description && (
                      <p className={styles.typeDescription}>{type.description}</p>
                    )}
                    <div className={styles.typeDetails}>
                      <div className={styles.detailRow}>
                        <span>Category:</span>
                        <span>{getCategoryName(type.categoryId)}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Max Duration:</span>
                        <span>{type.maxDurationDays ? `${type.maxDurationDays} days` : 'Unlimited'}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Attachment:</span>
                        <span>{type.requiresAttachment ? `Required (${type.attachmentType})` : 'Not required'}</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => openModal(type)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => confirmDelete(type)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Template Selection Modal */}
        {showTemplateModal && (
          <div className={styles.modalOverlay} onClick={() => setShowTemplateModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Select Template</h2>
                <button className={styles.closeButton} onClick={() => setShowTemplateModal(false)}>×</button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.templateGrid}>
                  {specialLeaveTemplates.map((template, index) => (
                    <button
                      key={index}
                      className={styles.templateCard}
                      onClick={() => applyTemplate(template)}
                    >
                      <h3>{template.name}</h3>
                      <p>{template.description}</p>
                      <div className={styles.templateMeta}>
                        <span>{template.maxDurationDays > 0 ? `${template.maxDurationDays} days` : 'Varies'}</span>
                        <span>{template.paid ? 'Paid' : 'Unpaid'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{editingType ? 'Edit Special Leave Type' : 'Add Special Leave Type'}</h2>
                <button className={styles.closeButton} onClick={closeModal}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Name *</label>
                      <input
                        type="text" className={styles.input}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Bereavement Leave" required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Code *</label>
                      <input
                        type="text" className={styles.input}
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., BEREAVEMENT" required
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Category *</label>
                    <select
                      className={styles.select}
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                      className={styles.textarea}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Describe when this leave type applies..."
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Max Duration (days)</label>
                      <input
                        type="number" className={styles.input}
                        value={formData.maxDurationDays}
                        onChange={(e) => setFormData({ ...formData, maxDurationDays: parseInt(e.target.value) || 0 })}
                        min="0" placeholder="0 = unlimited"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox" checked={formData.paid}
                          onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                        />
                        Paid Leave
                      </label>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox" checked={formData.requiresAttachment}
                        onChange={(e) => setFormData({ ...formData, requiresAttachment: e.target.checked })}
                      />
                      Requires Supporting Document
                    </label>
                  </div>

                  {formData.requiresAttachment && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Attachment Type</label>
                      <select
                        className={styles.select}
                        value={formData.attachmentType}
                        onChange={(e) => setFormData({ ...formData, attachmentType: e.target.value })}
                      >
                        <option value="document">General Document</option>
                        <option value="medical">Medical Certificate</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton} disabled={submitting}>
                    {submitting ? 'Saving...' : editingType ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && deletingType && (
          <div className={styles.modalOverlay} onClick={cancelDelete}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Confirm Delete</h2>
                <button className={styles.closeButton} onClick={cancelDelete}>×</button>
              </div>
              <div className={styles.modalBody}>
                <p>Are you sure you want to delete <strong>{deletingType.name}</strong>?</p>
                <p className={styles.warningText}>This action cannot be undone.</p>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={cancelDelete}>
                  Cancel
                </button>
                <button 
                  type="button" className={styles.deleteConfirmButton} 
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}