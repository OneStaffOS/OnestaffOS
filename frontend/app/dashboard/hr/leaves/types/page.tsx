/**
 * Leave Types Management Page
 * REQ-006: Create and manage leave types
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
import styles from './types.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface LeaveCategory {
  _id: string;
  name: string;
}

interface LeaveType {
  _id: string;
  code: string;
  name: string;
  categoryId: LeaveCategory | string;
  description?: string;
  paid: boolean;
  deductible: boolean;
  requiresAttachment: boolean;
  attachmentType?: 'medical' | 'document' | 'other';
  minTenureMonths?: number;
  maxDurationDays?: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  code: string;
  name: string;
  categoryId: string;
  description: string;
  paid: boolean;
  deductible: boolean;
  requiresAttachment: boolean;
  attachmentType: string;
  minTenureMonths: string;
  maxDurationDays: string;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  categoryId: '',
  description: '',
  paid: true,
  deductible: true,
  requiresAttachment: false,
  attachmentType: '',
  minTenureMonths: '',
  maxDurationDays: '',
};

export default function LeaveTypesPage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [typesRes, categoriesRes] = await Promise.all([
        axios.get('/leaves/types'),
        axios.get('/leaves/categories'),
      ]);
      setLeaveTypes(typesRes.data);
      setCategories(categoriesRes.data);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load leave types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (leaveType?: LeaveType) => {
    if (leaveType) {
      setEditingType(leaveType);
      setFormData({
        code: leaveType.code,
        name: leaveType.name,
        categoryId: typeof leaveType.categoryId === 'object' ? leaveType.categoryId._id : leaveType.categoryId,
        description: leaveType.description || '',
        paid: leaveType.paid,
        deductible: leaveType.deductible,
        requiresAttachment: leaveType.requiresAttachment,
        attachmentType: leaveType.attachmentType || '',
        minTenureMonths: leaveType.minTenureMonths?.toString() || '',
        maxDurationDays: leaveType.maxDurationDays?.toString() || '',
      });
    } else {
      setEditingType(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData(initialFormData);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim() || !formData.categoryId) {
      setError('Code, Name, and Category are required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        description: formData.description.trim() || undefined,
        paid: formData.paid,
        deductible: formData.deductible,
        requiresAttachment: formData.requiresAttachment,
        attachmentType: formData.requiresAttachment ? formData.attachmentType || undefined : undefined,
        minTenureMonths: formData.minTenureMonths ? parseInt(formData.minTenureMonths) : undefined,
        maxDurationDays: formData.maxDurationDays ? parseInt(formData.maxDurationDays) : undefined,
      };

      if (editingType) {
        // Update existing leave type
        await axios.put(`/leaves/types/${editingType._id}`, payload);
        setSuccess('Leave type updated successfully!');
      } else {
        await axios.post('/leaves/types', payload);
        setSuccess('Leave type created successfully!');
      }

      handleCloseModal();
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save leave type:', err);
      setError(err.response?.data?.message || 'Failed to save leave type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (typeId: string) => {
    try {
      setSubmitting(true);
      await axios.delete(`/leaves/types/${typeId}`);
      setSuccess('Leave type deleted successfully!');
      setDeleteConfirm(null);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete leave type:', err);
      setError(err.response?.data?.message || 'Failed to delete leave type');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryName = (categoryId: LeaveCategory | string): string => {
    if (typeof categoryId === 'object' && categoryId !== null) {
      return categoryId.name;
    }
    const category = categories.find(c => c._id === categoryId);
    return category?.name || 'Unknown';
  };

  const filteredTypes = filterCategory === 'all' 
    ? leaveTypes 
    : leaveTypes.filter(t => {
        const catId = typeof t.categoryId === 'object' ? t.categoryId._id : t.categoryId;
        return catId === filterCategory;
      });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leave Types" role="HR Admin">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}> Leave Types</h1>
              <p className={styles.subtitle}>
                Manage leave types and their configurations
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                ← Back
              </button>
              <button 
                className={styles.addButton}
                onClick={() => handleOpenModal()}
              >
                + Add Leave Type
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Filter */}
          <div className={styles.filterBar}>
            <label htmlFor="categoryFilter">Filter by Category:</label>
            <select
              id="categoryFilter" value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
            <span className={styles.filterCount}>
              {filteredTypes.length} leave type{filteredTypes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Leave Types Grid */}
          <div className={styles.cardsContainer}>
            {loading ? (
              <Spinner message="Loading leave types..." />
            ) : filteredTypes.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}></span>
                <h3>No Leave Types Found</h3>
                <p>Create your first leave type to get started.</p>
                <button 
                  className={styles.addButton}
                  onClick={() => handleOpenModal()}
                >
                  + Add Leave Type
                </button>
              </div>
            ) : (
              <div className={styles.cardsGrid}>
                {filteredTypes.map((leaveType) => (
                  <div key={leaveType._id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardCode}>{leaveType.code}</span>
                      <div className={styles.cardBadges}>
                        {leaveType.paid && <span className={styles.badgePaid}>Paid</span>}
                        {!leaveType.paid && <span className={styles.badgeUnpaid}>Unpaid</span>}
                        {leaveType.requiresAttachment && (
                          <span className={styles.badgeAttachment}></span>
                        )}
                      </div>
                    </div>
                    <h3 className={styles.cardTitle}>{leaveType.name}</h3>
                    <p className={styles.cardCategory}>
                       {getCategoryName(leaveType.categoryId)}
                    </p>
                    {leaveType.description && (
                      <p className={styles.cardDescription}>{leaveType.description}</p>
                    )}
                    <div className={styles.cardDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Deductible:</span>
                        <span>{leaveType.deductible ? 'Yes' : 'No'}</span>
                      </div>
                      {leaveType.minTenureMonths && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Min Tenure:</span>
                          <span>{leaveType.minTenureMonths} months</span>
                        </div>
                      )}
                      {leaveType.maxDurationDays && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Max Duration:</span>
                          <span>{leaveType.maxDurationDays} days</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleOpenModal(leaveType)}
                      >
                         Edit
                      </button>
                      {deleteConfirm === leaveType._id ? (
                        <div className={styles.deleteConfirm}>
                          <button
                            className={styles.confirmDeleteButton}
                            onClick={() => handleDelete(leaveType._id)}
                            disabled={submitting}
                          >
                             Confirm
                          </button>
                          <button
                            className={styles.cancelDeleteButton}
                            onClick={() => setDeleteConfirm(null)}
                          >
                            
                          </button>
                        </div>
                      ) : (
                        <button
                          className={styles.deleteButton}
                          onClick={() => setDeleteConfirm(leaveType._id)}
                        >
                           Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal */}
          {showModal && (
            <div className={styles.modalOverlay} onClick={handleCloseModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>{editingType ? 'Edit Leave Type' : 'Add New Leave Type'}</h2>
                  <button className={styles.closeButton} onClick={handleCloseModal}>
                    
                  </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="code">Code *</label>
                      <input
                        type="text" id="code" value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., ANN, SICK, MAT" required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="name">Name *</label>
                      <input
                        type="text" id="name" value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Annual Leave" required
                      />
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="categoryId">Category *</label>
                    <select
                      id="categoryId" value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                    {categories.length === 0 && (
                      <p className={styles.formHint}>
                        No categories found. <a href="/dashboard/hr/leaves/categories">Create one first</a>.
                      </p>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description" value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description for this leave type" rows={2}
                    />
                  </div>

                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox" checked={formData.paid}
                        onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                      />
                      <span>Paid Leave</span>
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox" checked={formData.deductible}
                        onChange={(e) => setFormData({ ...formData, deductible: e.target.checked })}
                      />
                      <span>Deductible from balance</span>
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox" checked={formData.requiresAttachment}
                        onChange={(e) => setFormData({ ...formData, requiresAttachment: e.target.checked })}
                      />
                      <span>Requires Attachment</span>
                    </label>
                  </div>

                  {formData.requiresAttachment && (
                    <div className={styles.formGroup}>
                      <label htmlFor="attachmentType">Attachment Type</label>
                      <select
                        id="attachmentType" value={formData.attachmentType}
                        onChange={(e) => setFormData({ ...formData, attachmentType: e.target.value })}
                      >
                        <option value="">Select type</option>
                        <option value="medical">Medical Certificate</option>
                        <option value="document">Document</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  )}

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="minTenureMonths">Min Tenure (months)</label>
                      <input
                        type="number" id="minTenureMonths" value={formData.minTenureMonths}
                        onChange={(e) => setFormData({ ...formData, minTenureMonths: e.target.value })}
                        placeholder="e.g., 12" min="0"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="maxDurationDays">Max Duration (days)</label>
                      <input
                        type="number" id="maxDurationDays" value={formData.maxDurationDays}
                        onChange={(e) => setFormData({ ...formData, maxDurationDays: e.target.value })}
                        placeholder="e.g., 30" min="1"
                      />
                    </div>
                  </div>

                  {error && <div className={styles.formError}>{error}</div>}
                  
                  <div className={styles.modalActions}>
                    <button
                      type="button" className={styles.cancelButton}
                      onClick={handleCloseModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" className={styles.submitButton}
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : editingType ? 'Update Type' : 'Create Type'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}