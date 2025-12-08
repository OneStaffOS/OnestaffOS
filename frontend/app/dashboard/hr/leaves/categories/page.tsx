/**
 * Leave Categories Management Page
 * REQ-006: Create and manage leave categories
 * Accessible by: HR Admin, System Admin
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './categories.module.css';

interface LeaveCategory {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  description: string;
}

export default function LeaveCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LeaveCategory | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/leaves/categories');
      setCategories(response.data);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenModal = (category?: LeaveCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (editingCategory) {
        // Update existing category
        await axios.put(`/leaves/categories/${editingCategory._id}`, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        setSuccess('Category updated successfully!');
      } else {
        // Create new category
        await axios.post('/leaves/categories', {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        setSuccess('Category created successfully!');
      }

      handleCloseModal();
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save category:', err);
      setError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      setSubmitting(true);
      await axios.delete(`/leaves/categories/${categoryId}`);
      setSuccess('Category deleted successfully!');
      setDeleteConfirm(null);
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      setError(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leave Categories" role="HR Admin">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>📁 Leave Categories</h1>
              <p className={styles.subtitle}>
                Manage leave categories to organize leave types
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
                + Add Category
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Categories Table */}
          <div className={styles.tableContainer}>
            {loading ? (
              <Spinner message="Loading categories..." />
            ) : categories.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📁</span>
                <h3>No Categories Found</h3>
                <p>Create your first leave category to get started.</p>
                <button 
                  className={styles.addButton}
                  onClick={() => handleOpenModal()}
                >
                  + Add Category
                </button>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category._id}>
                      <td>
                        <span className={styles.categoryName}>{category.name}</span>
                      </td>
                      <td>
                        <span className={styles.categoryDescription}>
                          {category.description || '-'}
                        </span>
                      </td>
                      <td>{formatDate(category.createdAt)}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.editButton}
                            onClick={() => handleOpenModal(category)}
                            title="Edit Category"
                          >
                            ✏️
                          </button>
                          {deleteConfirm === category._id ? (
                            <div className={styles.deleteConfirm}>
                              <button
                                className={styles.confirmDeleteButton}
                                onClick={() => handleDelete(category._id)}
                                disabled={submitting}
                              >
                                ✓
                              </button>
                              <button
                                className={styles.cancelDeleteButton}
                                onClick={() => setDeleteConfirm(null)}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              className={styles.deleteButton}
                              onClick={() => setDeleteConfirm(category._id)}
                              title="Delete Category"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal */}
          {showModal && (
            <div className={styles.modalOverlay} onClick={handleCloseModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
                  <button className={styles.closeButton} onClick={handleCloseModal}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Category Name *</label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Statutory Leave, Personal Leave"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description for this category"
                      rows={3}
                    />
                  </div>
                  {error && <div className={styles.formError}>{error}</div>}
                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={handleCloseModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
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
