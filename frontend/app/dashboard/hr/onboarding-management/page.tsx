'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './onboarding.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface OnboardingTask {
  name: string;
  department: string;
  status: 'pending' | 'in_progress' | 'completed';
  deadline: Date;
  completedAt?: Date;
  notes?: string;
}

interface OnboardingChecklist {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  contractId: string;
  tasks: OnboardingTask[];
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

interface NewHire {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
}

export default function OnboardingManagement() {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<OnboardingChecklist[]>([]);
  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [tasks, setTasks] = useState<Array<{ name: string; department: string; deadline: string; notes: string }>>([
    { name: '', department: '', deadline: '', notes: '' }
  ]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await fetchChecklists();
    await fetchNewHires();
  };

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/recruitment/onboarding');
      setChecklists(response.data);
      return response.data;
    } catch (err: any) {
      console.error('Failed to fetch checklists:', err);
      setError('Failed to load onboarding checklists');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchNewHires = async () => {
    try {
      // Fetch all employees
      const employeesRes = await axios.get('/employee-profile');
      const allEmployees = employeesRes.data;
      
      // Fetch all employees' system roles and filter for NEW_HIRE
      const newHiresList = [];
      
      for (const emp of allEmployees) {
        try {
          // Get employee's roles
          const rolesRes = await axios.get(`/employee-profile/${emp._id}/roles`);
          const hasNewHireRole = rolesRes.data.roles?.includes(Role.NEW_HIRE);
          
          if (hasNewHireRole) {
            newHiresList.push({
              _id: emp._id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              email: emp.email,
              employeeNumber: emp.employeeNumber
            });
          }
        } catch (err) {
          // If no roles found, skip this employee
          continue;
        }
      }
      
      setNewHires(newHiresList);
    } catch (err: any) {
      console.error('Failed to fetch new hires:', err);
    }
  };

  const addTask = () => {
    setTasks([...tasks, { name: '', department: '', deadline: '', notes: '' }]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setTasks(updatedTasks);
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }

    const validTasks = tasks.filter(t => t.name.trim() && t.department.trim());
    if (validTasks.length === 0) {
      setError('Please add at least one task');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Find contract for the employee
      const contractsRes = await axios.get('/recruitment/offers');
      const contracts = contractsRes.data;
      const employeeContract = contracts.find((c: any) => c.candidateId?._id === selectedEmployee);
      
      if (!employeeContract) {
        setError('No contract found for this employee');
        return;
      }

      const checklistData = {
        employeeId: selectedEmployee,
        contractId: employeeContract._id,
        tasks: validTasks.map(t => ({
          name: t.name,
          department: t.department,
          deadline: t.deadline ? new Date(t.deadline) : undefined,
          notes: t.notes || undefined,
        })),
      };

      await axios.post('/recruitment/onboarding', checklistData);
      
      setSuccess('Onboarding checklist created successfully!');
      setShowCreateModal(false);
      setSelectedEmployee('');
      setTasks([{ name: '', department: '', deadline: '', notes: '' }]);
      
      setTimeout(() => setSuccess(''), 3000);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to create checklist:', err);
      setError(err.response?.data?.message || 'Failed to create onboarding checklist');
    } finally {
      setLoading(false);
    }
  };

  const deleteChecklist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this onboarding checklist?')) return;

    try {
      await axios.delete(`/recruitment/onboarding/${id}`);
      setSuccess('Checklist deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to delete checklist:', err);
      setError('Failed to delete checklist');
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getProgressPercentage = (tasks: OnboardingTask[]) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#f59e0b';
      case 'pending':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER]}>
      <DashboardLayout title="Onboarding Management" role="HR Manager">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1>Onboarding Checklist Management</h1>
              <p>Create and manage onboarding tasks for new hires</p>
            </div>
            <button 
              className={styles.createBtn}
              onClick={() => setShowCreateModal(true)}
            >
              + Create New Checklist
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && <div className={styles.success}>{success}</div>}
          {error && <div className={styles.error}>{error}</div>}

          {/* Loading State */}
          {loading && !showCreateModal && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading checklists...</p>
            </div>
          )}

          {/* Checklists List */}
          {!loading && checklists.length === 0 && (
            <div className={styles.emptyState}>
              <p>No onboarding checklists created yet</p>
              <button onClick={() => setShowCreateModal(true)}>
                Create First Checklist
              </button>
            </div>
          )}

          {!loading && checklists.length > 0 && (
            <div className={styles.checklistsGrid}>
              {checklists.map(checklist => (
                <div key={checklist._id} className={styles.checklistCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3>{checklist.employeeId.firstName} {checklist.employeeId.lastName}</h3>
                      <p className={styles.email}>{checklist.employeeId.email}</p>
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteChecklist(checklist._id)}
                      title="Delete checklist"
                    >
                      ×
                    </button>
                  </div>

                  <div className={styles.progressSection}>
                    <div className={styles.progressInfo}>
                      <span>Progress: {getProgressPercentage(checklist.tasks)}%</span>
                      <span>{checklist.tasks.filter(t => t.status === 'completed').length}/{checklist.tasks.length} tasks completed</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ width: `${getProgressPercentage(checklist.tasks)}%` }}
                      />
                    </div>
                  </div>

                  <div className={styles.tasksList}>
                    {checklist.tasks.map((task, idx) => (
                      <div key={idx} className={styles.taskItem}>
                        <div className={styles.taskInfo}>
                          <div className={styles.taskName}>
                            {task.status === 'completed' && <span className={styles.checkmark}>✓</span>}
                            {task.name}
                          </div>
                          <div className={styles.taskMeta}>
                            <span className={styles.department}>{task.department}</span>
                            <span 
                              className={styles.statusBadge}
                              style={{ background: getStatusColor(task.status) }}
                            >
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        {task.deadline && (
                          <div className={styles.deadline}>
                            Due: {formatDate(task.deadline)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className={styles.cardFooter}>
                    <small>Created: {formatDate(checklist.createdAt)}</small>
                    {checklist.completed && checklist.completedAt && (
                      <small className={styles.completed}>
                        Completed: {formatDate(checklist.completedAt)}
                      </small>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    <button 
                      className={styles.equipmentButton}
                      onClick={() => window.location.href = `/dashboard/hr/onboarding-management/${checklist._id}/equipment`}
                    >
                      🏢 Manage Equipment & Facilities
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showCreateModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h2>Create Onboarding Checklist</h2>
                  <button 
                    className={styles.closeBtn}
                    onClick={() => setShowCreateModal(false)}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateChecklist}>
                  <div className={styles.modalContent}>
                    {/* Employee Selection */}
                    <div className={styles.formGroup}>
                      <label>Select New Hire *</label>
                      <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        required
                      >
                        <option value="">-- Select Employee --</option>
                        {newHires.map(hire => (
                          <option key={hire._id} value={hire._id}>
                            {hire.employeeNumber} - {hire.firstName} {hire.lastName} ({hire.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tasks */}
                    <div className={styles.formGroup}>
                      <div className={styles.tasksHeader}>
                        <label>Onboarding Tasks *</label>
                        <button 
                          type="button" 
                          className={styles.addTaskBtn}
                          onClick={addTask}
                        >
                          + Add Task
                        </button>
                      </div>

                      {tasks.map((task, index) => (
                        <div key={index} className={styles.taskForm}>
                          <div className={styles.taskFormHeader}>
                            <h4>Task {index + 1}</h4>
                            {tasks.length > 1 && (
                              <button
                                type="button"
                                className={styles.removeTaskBtn}
                                onClick={() => removeTask(index)}
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="Task Name *"
                            value={task.name}
                            onChange={(e) => updateTask(index, 'name', e.target.value)}
                            required
                          />

                          <input
                            type="text"
                            placeholder="Department/Responsible Party *"
                            value={task.department}
                            onChange={(e) => updateTask(index, 'department', e.target.value)}
                            required
                          />

                          <input
                            type="date"
                            placeholder="Deadline (optional)"
                            value={task.deadline}
                            onChange={(e) => updateTask(index, 'deadline', e.target.value)}
                          />

                          <textarea
                            placeholder="Notes (optional)"
                            value={task.notes}
                            onChange={(e) => updateTask(index, 'notes', e.target.value)}
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.modalFooter}>
                    <button 
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className={styles.submitBtn}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Checklist'}
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
