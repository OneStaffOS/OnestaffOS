/**
 * Support Ticket Page
 * User Stories:
 * - As a user, I want to create new support tickets
 * - As a user, I want to categorize my ticket based on issue types
 * - As a user, I want to choose sub-category and have priorities assigned
 * - As a user, I want a custom workflow provided by the assigned agent
 * - As a user, I want to chat with support agents in real-time
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import DashboardLayout from '../components/DashboardLayout';
import Spinner from '../components/Spinner';
import TicketChat from '../components/TicketChat';
import axios from '@/lib/axios-config';
import { SystemRole } from '@/lib/roles';
import styles from './support.module.css';

interface Ticket {
  _id: string;
  title: string;
  description: string;
  type: string;
  subCategory?: string;
  priority: string;
  status: string;
  assignedAgent?: string;
  assignedTo?: any;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  customWorkflow?: {
    steps: Array<{
      order: number;
      title: string;
      description: string;
      completed: boolean;
      completedAt?: string;
    }>;
  };
  comments: Array<{
    userId: string;
    userName: string;
    comment: string;
    createdAt: string;
  }>;
  statusHistory: Array<{
    status: string;
    changedAt: string;
    note: string;
  }>;
}

const TICKET_TYPES = [
  { value: 'software', label: 'Software' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'network', label: 'Network' },
];

const SUB_CATEGORIES = {
  software: [
    { value: 'application_error', label: 'Application Error' },
    { value: 'installation', label: 'Installation' },
    { value: 'license', label: 'License Issue' },
    { value: 'performance', label: 'Performance' },
    { value: 'other', label: 'Other' },
  ],
  hardware: [
    { value: 'computer', label: 'Computer' },
    { value: 'printer', label: 'Printer' },
    { value: 'phone', label: 'Phone' },
    { value: 'monitor', label: 'Monitor' },
    { value: 'keyboard_mouse', label: 'Keyboard/Mouse' },
    { value: 'other', label: 'Other' },
  ],
  network: [
    { value: 'connectivity', label: 'Connectivity' },
    { value: 'wifi', label: 'WiFi' },
    { value: 'vpn', label: 'VPN' },
    { value: 'email', label: 'Email' },
    { value: 'slow_speed', label: 'Slow Speed' },
    { value: 'other', label: 'Other' },
  ],
};

const PRIORITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

const STATUS_COLORS = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  pending: '#8b5cf6',
  resolved: '#10b981',
  closed: '#6b7280',
};

export default function SupportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    subCategory: '',
  });

  // Comment state
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  // Handle navigation from notification - open specific ticket
  useEffect(() => {
    const ticketIdFromUrl = searchParams.get('ticket');
    if (ticketIdFromUrl && tickets.length > 0) {
      handleViewTicket(ticketIdFromUrl);
    }
  }, [searchParams, tickets]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/tickets/my-tickets');
      setTickets(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/tickets', formData);
      setSuccess('Ticket created successfully!');
      setShowCreateForm(false);
      setFormData({ title: '', description: '', type: '', subCategory: '' });
      await fetchTickets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticketId: string) => {
    try {
      const response = await axios.get(`/tickets/${ticketId}`);
      setSelectedTicket(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch ticket details');
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newComment.trim()) return;

    try {
      await axios.post(`/tickets/${selectedTicket._id}/comments`, {
        comment: newComment,
      });
      setNewComment('');
      await handleViewTicket(selectedTicket._id);
      setSuccess('Comment added successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const getSubCategories = () => {
    if (!formData.type) return [];
    return SUB_CATEGORIES[formData.type as keyof typeof SUB_CATEGORIES] || [];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && tickets.length === 0) {
    return (
      <ProtectedRoute
        requiredRoles={[
          SystemRole.DEPARTMENT_EMPLOYEE,
          SystemRole.DEPARTMENT_HEAD,
          SystemRole.HR_MANAGER,
          SystemRole.HR_ADMIN,
          SystemRole.SYSTEM_ADMIN,
        ]}
      >
        <DashboardLayout title="Support Tickets" role="Support">
          <Spinner fullScreen />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute
      requiredRoles={[
        SystemRole.DEPARTMENT_EMPLOYEE,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.HR_MANAGER,
        SystemRole.HR_ADMIN,
        SystemRole.SYSTEM_ADMIN,
      ]}
    >
      <DashboardLayout title="Support Tickets" role="Support">
        <div className={styles.container}>
          {/* Success/Error Messages */}
          {success && <div className={styles.successAlert}>{success}</div>}
          {error && <div className={styles.errorAlert}>{error}</div>}

          {/* Knowledge Base Banner */}
          <div className={styles.kbBanner}>
            <div className={styles.kbBannerContent}>
              <span className={styles.kbIcon}>📚</span>
              <div>
                <h4>Looking for quick answers?</h4>
                <p>Browse our Knowledge Base for solutions to common issues</p>
              </div>
            </div>
            <a href="/knowledge-base" className={styles.kbBtn}>
              Browse Knowledge Base →
            </a>
          </div>

          {/* Header */}
          <div className={styles.header}>
            <div>
              <h2>My Support Tickets</h2>
              <p>Report issues and request technical assistance</p>
            </div>
            <button
              className={styles.createBtn}
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ New Ticket'}
            </button>
          </div>

          {/* Create Ticket Form */}
          {showCreateForm && (
            <div className={styles.formCard}>
              <h3>Create New Ticket</h3>
              <form onSubmit={handleCreateTicket}>
                <div className={styles.formGroup}>
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    placeholder="Brief description of the issue"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Issue Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value,
                        subCategory: '',
                      })
                    }
                    required
                  >
                    <option value="">Select type</option>
                    {TICKET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.type && (
                  <div className={styles.formGroup}>
                    <label>Sub-Category</label>
                    <select
                      value={formData.subCategory}
                      onChange={(e) =>
                        setFormData({ ...formData, subCategory: e.target.value })
                      }
                    >
                      <option value="">Select sub-category</option>
                      {getSubCategories().map((sub) => (
                        <option key={sub.value} value={sub.value}>
                          {sub.label}
                        </option>
                      ))}
                    </select>
                    <small>
                      Priority will be automatically assigned based on your
                      selection
                    </small>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                    rows={5}
                    placeholder="Provide detailed information about your issue..."
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  Submit Ticket
                </button>
              </form>
            </div>
          )}

          {/* Tickets List */}
          {!selectedTicket ? (
            <div className={styles.ticketsList}>
              {tickets.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No tickets yet. Create your first support ticket!</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className={styles.ticketCard}
                    onClick={() => handleViewTicket(ticket._id)}
                  >
                    <div className={styles.ticketHeader}>
                      <h4>{ticket.title}</h4>
                      <div className={styles.badges}>
                        <span
                          className={styles.badge}
                          style={{
                            backgroundColor:
                              STATUS_COLORS[
                                ticket.status as keyof typeof STATUS_COLORS
                              ],
                          }}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span
                          className={styles.badge}
                          style={{
                            backgroundColor:
                              PRIORITY_COLORS[
                                ticket.priority as keyof typeof PRIORITY_COLORS
                              ],
                          }}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                    <p className={styles.ticketDescription}>
                      {ticket.description.substring(0, 150)}
                      {ticket.description.length > 150 ? '...' : ''}
                    </p>
                    <div className={styles.ticketMeta}>
                      <span>Type: {ticket.type}</span>
                      <span>Created: {formatDate(ticket.createdAt)}</span>
                      {ticket.assignedAgent && (
                        <span>Agent: {ticket.assignedAgent}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Ticket Details View */
            <div className={styles.ticketDetails}>
              <button
                className={styles.backBtn}
                onClick={() => {
                  setSelectedTicket(null);
                  setShowChat(false);
                }}
              >
                ← Back to Tickets
              </button>

              <div className={styles.detailsCard}>
                <div className={styles.detailsHeader}>
                  <div>
                    <h3>{selectedTicket.title}</h3>
                    <div className={styles.badges}>
                      <span
                        className={styles.badge}
                        style={{
                          backgroundColor:
                            STATUS_COLORS[
                              selectedTicket.status as keyof typeof STATUS_COLORS
                            ],
                        }}
                      >
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span
                        className={styles.badge}
                        style={{
                          backgroundColor:
                            PRIORITY_COLORS[
                              selectedTicket.priority as keyof typeof PRIORITY_COLORS
                            ],
                        }}
                      >
                        {selectedTicket.priority} priority
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.detailsSection}>
                  <h4>Description</h4>
                  <p>{selectedTicket.description}</p>
                </div>

                <div className={styles.detailsGrid}>
                  <div>
                    <strong>Type:</strong> {selectedTicket.type}
                  </div>
                  {selectedTicket.subCategory && (
                    <div>
                      <strong>Sub-Category:</strong> {selectedTicket.subCategory}
                    </div>
                  )}
                  <div>
                    <strong>Created:</strong> {formatDate(selectedTicket.createdAt)}
                  </div>
                  {selectedTicket.assignedAgent && (
                    <div>
                      <strong>Assigned Agent:</strong>{' '}
                      {selectedTicket.assignedAgent}
                    </div>
                  )}
                </div>

                {/* Custom Workflow */}
                {selectedTicket.customWorkflow &&
                  selectedTicket.customWorkflow.steps.length > 0 && (
                    <div className={styles.detailsSection}>
                      <h4>Resolution Workflow</h4>
                      <div className={styles.workflow}>
                        {selectedTicket.customWorkflow.steps.map((step) => (
                          <div
                            key={step.order}
                            className={`${styles.workflowStep} ${
                              step.completed ? styles.completed : ''
                            }`}
                          >
                            <div className={styles.stepNumber}>{step.order}</div>
                            <div className={styles.stepContent}>
                              <h5>{step.title}</h5>
                              <p>{step.description}</p>
                              {step.completed && step.completedAt && (
                                <small>
                                  Completed: {formatDate(step.completedAt)}
                                </small>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Resolution */}
                {selectedTicket.resolution && (
                  <div className={styles.detailsSection}>
                    <h4>Resolution</h4>
                    <p className={styles.resolution}>{selectedTicket.resolution}</p>
                  </div>
                )}

                {/* Comments */}
                <div className={styles.detailsSection}>
                  <h4>Comments</h4>
                  <div className={styles.comments}>
                    {selectedTicket.comments.length === 0 ? (
                      <p className={styles.noComments}>No comments yet</p>
                    ) : (
                      selectedTicket.comments.map((comment, index) => (
                        <div key={index} className={styles.comment}>
                          <div className={styles.commentHeader}>
                            <strong>{comment.userName}</strong>
                            <span>{formatDate(comment.createdAt)}</span>
                          </div>
                          <p>{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedTicket.status !== 'closed' && (
                    <div className={styles.addComment}>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className={styles.commentBtn}
                      >
                        Add Comment
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Chat Button */}
                {selectedTicket.status !== 'closed' && selectedTicket.assignedTo && (
                  <div className={styles.liveChatSection}>
                    <button
                      className={styles.liveChatBtn}
                      onClick={() => setShowChat(true)}
                    >
                      💬 Start Live Chat with Support Agent
                    </button>
                    <p className={styles.liveChatInfo}>
                      Chat in real-time with your assigned support agent
                    </p>
                  </div>
                )}

                {/* Status History */}
                {selectedTicket.statusHistory.length > 0 && (
                  <div className={styles.detailsSection}>
                    <h4>Status History</h4>
                    <div className={styles.statusHistory}>
                      {selectedTicket.statusHistory.map((history, index) => (
                        <div key={index} className={styles.historyItem}>
                          <div className={styles.historyDot}></div>
                          <div>
                            <strong>{history.status.replace('_', ' ')}</strong>
                            <p>{history.note}</p>
                            <small>{formatDate(history.changedAt)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Chat Component */}
          {selectedTicket && (
            <TicketChat
              ticketId={selectedTicket._id}
              ticketNumber={`TKT-${selectedTicket._id.slice(-6).toUpperCase()}`}
              isOpen={showChat}
              onClose={() => setShowChat(false)}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
