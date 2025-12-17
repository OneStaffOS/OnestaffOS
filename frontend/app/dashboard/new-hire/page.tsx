/**
 * New Hire Dashboard (Route: /dashboard/new-hire)
 * Onboarding portal for new employees with pre-boarding checklist
 */

'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import { useAuth } from '@/app/context/AuthContext';
import axios from '@/lib/axios-config';
import styles from './newHire.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface OnboardingTask {
  name: string;
  department: string;
  status: 'pending' | 'in_progress' | 'completed';
  deadline?: Date;
  completedAt?: Date;
  documentId?: string;
  notes?: string;
}

interface PreBoarding {
  _id: string;
  employeeId: string;
  contractId: string;
  tasks: OnboardingTask[];
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

export default function NewHireDashboard() {
  const [preBoarding, setPreBoarding] = useState<PreBoarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTask, setSelectedTask] = useState<OnboardingTask | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user?.sub) {
      fetchOnboardingChecklist();
    }
  }, [user]);

  const fetchOnboardingChecklist = async () => {
    setLoading(true);
    setError('');

    try {
      const userId = user?.sub;
      const response = await axios.get(`/recruitment/onboarding/employee/${userId}`);
      setPreBoarding(response.data);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No onboarding checklist has been created yet. Your HR manager will set this up for you.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskIndex: number, status: string) => {
    if (!preBoarding) return;

    try {
      setError('');
      await axios.patch(`/recruitment/onboarding/${preBoarding._id}/tasks/${taskIndex}`, {
        status,
        completedAt: status === 'completed' ? new Date() : undefined,
        notes: taskNotes || undefined,
      });
      
      setSuccess(`Task status updated!`);
      setTaskNotes('');
      setTimeout(() => setSuccess(''), 3000);
      
      const updatedChecklist = await fetchOnboardingChecklist();
      
      // Check if onboarding is completed
      if (updatedChecklist?.completed) {
        setShowCompletionModal(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDaysUntil = (dateString: Date | string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressPercentage = () => {
    if (!preBoarding || !preBoarding.tasks || preBoarding.tasks.length === 0) return 0;
    const completed = preBoarding.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / preBoarding.tasks.length) * 100);
  };

  const tasksCompleted = preBoarding?.tasks?.filter(t => t.status === 'completed').length || 0;
  const totalTasks = preBoarding?.tasks?.length || 0;

  const handleFileUpload = async (taskIndex: number, file: File) => {
    if (!preBoarding) return;

    try {
      setUploadingFile(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);

      await axios.post(
        `/recruitment/onboarding/${preBoarding._id}/tasks/${taskIndex}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSuccess('File uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      const updatedChecklist = await fetchOnboardingChecklist();
      
      // Check if onboarding is completed
      if (updatedChecklist?.completed) {
        setShowCompletionModal(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadDocument = async (taskIndex: number) => {
    if (!preBoarding) return;

    try {
      const response = await axios.get(
        `/recruitment/onboarding/${preBoarding._id}/tasks/${taskIndex}/document`
      );
      
      if (response.data && response.data.fileName) {
        window.open(`/api/recruitment/documents/${response.data._id}`, '_blank');
      }
    } catch (err: any) {
      setError('Failed to retrieve document');
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.NEW_HIRE]}>
      <DashboardLayout title="Welcome to OneStaff OS" role="New Hire">
        {success && <div className={styles.success}>{success}</div>}
        {error && !loading && <div className={styles.error}>{error}</div>}

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button 
            className={styles.quickActionButton}
            onClick={() => window.location.href = '/dashboard/new-hire/id-card'}
          >
            🆔 View ID Card
          </button>
          <button 
            className={styles.quickActionButton}
            onClick={() => window.location.href = '/dashboard/employee/inbox'}
          >
            📬 View Notifications
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Onboarding Progress</h3>
            <p className={styles.statValue}>{tasksCompleted}/{totalTasks}</p>
            <span className={styles.statLabel}>Tasks completed</span>
          </div>
          
          <div className={styles.statCard}>
            <h3>Completion Rate</h3>
            <p className={styles.statValue}>{getProgressPercentage()}%</p>
            <span className={styles.statLabel}>Overall progress</span>
          </div>
          
          <div className={styles.statCard}>
            <h3>Pending Tasks</h3>
            <p className={styles.statValue}>{totalTasks - tasksCompleted}</p>
            <span className={styles.statLabel}>Remaining</span>
          </div>
          
          <div className={styles.statCard}>
            <h3>Created</h3>
            <p className={styles.statValue}>
              {preBoarding ? formatDate(preBoarding.createdAt) : '-'}
            </p>
            <span className={styles.statLabel}>Checklist date</span>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your onboarding checklist...</p>
          </div>
        ) : preBoarding ? (
          <>
            {preBoarding.completed && (
              <div className={styles.completedBanner}>
                🎊 Congratulations! You've completed all onboarding tasks!
              </div>
            )}

            <div className={styles.section}>
              <h2>📋 Onboarding Checklist</h2>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              <div className={styles.tasksList}>
                {preBoarding.tasks?.map((task, index) => {
                  const daysUntil = task.deadline ? getDaysUntil(task.deadline) : null;
                  const isOverdue = daysUntil !== null && daysUntil < 0;
                  
                  return (
                    <div 
                      key={index} 
                      className={`${styles.taskCard} ${task.status === 'completed' ? styles.taskCompleted : ''}`}
                    >
                      <div className={styles.taskHeader}>
                        <div className={styles.taskTitle}>
                          {task.status === 'completed' && <span className={styles.checkmark}>✓</span>}
                          <h3>{task.name}</h3>
                        </div>
                        <div className={styles.taskBadges}>
                          <span 
                            className={styles.statusBadge}
                            style={{ backgroundColor: getStatusColor(task.status) }}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className={styles.taskMeta}>
                        <div className={styles.taskMetaItem}>
                          <strong>Department:</strong> {task.department}
                        </div>
                        {task.deadline && (
                          <div className={`${styles.taskMetaItem} ${isOverdue ? styles.overdue : ''}`}>
                            <strong>Deadline:</strong> {formatDate(task.deadline)}
                            {daysUntil !== null && (
                              <span className={styles.daysRemaining}>
                                {isOverdue 
                                  ? ` (${Math.abs(daysUntil)} days overdue)` 
                                  : ` (${daysUntil} days remaining)`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* File Upload Section */}
                      <div className={styles.fileSection}>
                        {task.documentId ? (
                          <div className={styles.fileUploaded}>
                            <span>📎 Document uploaded</span>
                            <button
                              onClick={() => handleDownloadDocument(index)}
                              className={styles.downloadBtn}
                            >
                              View Document
                            </button>
                          </div>
                        ) : (
                          <div className={styles.fileUpload}>
                            <label htmlFor={`file-upload-${index}`} className={styles.uploadLabel}>
                              📎 Upload Document
                            </label>
                            <input
                              id={`file-upload-${index}`}
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(index, file);
                              }}
                              style={{ display: 'none' }}
                            />
                            {uploadingFile && <span className={styles.uploading}>Uploading...</span>}
                          </div>
                        )}
                      </div>

                      {task.status !== 'completed' && (
                        <div className={styles.taskActions}>
                          {task.status === 'pending' && (
                            <button
                              onClick={() => updateTaskStatus(index, 'in_progress')}
                              className={styles.startBtn}
                            >
                              Start Task
                            </button>
                          )}
                          
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => updateTaskStatus(index, 'completed')}
                              className={styles.completeBtn}
                            >
                              Mark as Complete
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedTask(task as any);
                              setSelectedTaskIndex(index);
                              setTaskNotes(task.notes || '');
                            }}
                            className={styles.addNoteBtn}
                          >
                            Add Note
                          </button>
                        </div>
                      )}

                      {task.status === 'completed' && task.completedAt && (
                        <div className={styles.completedInfo}>
                          ✅ Completed on {formatDate(task.completedAt)}
                        </div>
                      )}

                      {task.notes && (
                        <div className={styles.taskNotes}>
                          <strong>Notes:</strong> {task.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>📋 Your onboarding checklist will be created by your HR manager after you accept your offer.</p>
            <p>Check back soon or contact HR if you have questions!</p>
          </div>
        )}

        {/* Add Note Modal */}
        {selectedTask && (
          <div className={styles.modalOverlay} onClick={() => setSelectedTask(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Add Note to Task</h3>
                <button className={styles.closeBtn} onClick={() => setSelectedTask(null)}>×</button>
              </div>
              <div className={styles.modalContent}>
                <p><strong>{(selectedTask as any)?.name || 'Task'}</strong></p>
                <textarea
                  className={styles.notesTextarea}
                  placeholder="Add any notes or comments about this task..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <div className={styles.modalFooter}>
                <button 
                  className={styles.cancelBtn} 
                  onClick={() => {
                    setSelectedTask(null);
                    setTaskNotes('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className={styles.saveBtn}
                  onClick={async () => {
                    if (!preBoarding || !selectedTask) return;
                    const taskIndex = preBoarding.tasks.findIndex(t => t === selectedTask);
                    if (taskIndex === -1) return;
                    
                    try {
                      await axios.patch(`/recruitment/onboarding/${preBoarding._id}/tasks/${taskIndex}`, {
                        notes: taskNotes
                      });
                      setSuccess('Note saved successfully!');
                      setTimeout(() => setSuccess(''), 3000);
                      setSelectedTask(null);
                      setTaskNotes('');
                      fetchOnboardingChecklist();
                    } catch (err: any) {
                      setError('Failed to save note');
                    }
                  }}
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Completion Modal */}
        {showCompletionModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>🎉 Congratulations!</h3>
              </div>
              <div className={styles.modalContent}>
                <p className={styles.completionMessage}>
                  You have successfully completed all onboarding tasks!
                </p>
                <p className={styles.completionMessage}>
                  Your role has been updated from <strong>New Hire</strong> to <strong>Department Employee</strong>.
                </p>
                <p className={styles.completionMessage}>
                  ✅ <strong>Leave entitlements have been automatically assigned</strong> to your account with zero carry-over balance.
                </p>
                <p className={styles.completionMessage}>
                  ✅ <strong>All approved allowances have been automatically assigned</strong> to your account and will be included in your payroll.
                </p>
                <p className={styles.completionMessage}>
                  Please log out and log back in for all changes to take effect.
                </p>
              </div>
              <div className={styles.modalFooter}>
                <button 
                  className={styles.logoutBtn}
                  onClick={() => {
                    logout();
                  }}
                >
                  Logout Now
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
