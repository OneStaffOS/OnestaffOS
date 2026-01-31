"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import TicketChat from '../../../components/TicketChat';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './tickets.module.css';

interface Ticket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  type: string;
  subCategory: string;
  priority: string;
  status: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  agentType?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  customWorkflow?: Array<{
    step: number;
    title: string;
    description: string;
    completed: boolean;
  }>;
  comments?: Array<{
    userId: string;
    userName: string;
    comment: string;
    createdAt: string;
  }>;
}

interface AgentOption {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AdminTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Resolution form
  const [resolution, setResolution] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  
  // Assignment form
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Comment form
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchAgents();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      // Fetch employees with System Admin role who can be agents
      const response = await axios.get('/tickets/agents');
      const agentsList = Array.isArray(response.data) ? response.data : [];
      setAgents(agentsList);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleAssignTicket = async (ticketId: string) => {
    if (!selectedAgent) {
      alert('Please select an agent');
      return;
    }

    try {
      setIsAssigning(true);
      await axios.post(`/tickets/${ticketId}/assign`, {
        assignedTo: selectedAgent,
        assignedAgent: 'Agent 1' // Default agent type
      });
      alert('Ticket assigned successfully');
      setSelectedAgent('');
      fetchTickets();
      if (selectedTicket?._id === ticketId) {
        const response = await axios.get(`/tickets/${ticketId}`);
        setSelectedTicket(response.data);
      }
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      alert(error.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    if (!resolution.trim()) {
      alert('Please provide a resolution');
      return;
    }

    try {
      setIsResolving(true);
      await axios.post(`/tickets/${ticketId}/close`, {
        resolution: resolution.trim()
      });
      alert('Ticket resolved successfully');
      setResolution('');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error: any) {
      console.error('Error resolving ticket:', error);
      alert(error.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setIsResolving(false);
    }
  };

  const handleAddComment = async (ticketId: string) => {
    if (!newComment.trim()) {
      alert('Please enter a comment');
      return;
    }

    try {
      setIsCommenting(true);
      await axios.post(`/tickets/${ticketId}/comments`, {
        comment: newComment.trim()
      });
      setNewComment('');
      // Refresh ticket details
      const response = await axios.get(`/tickets/${ticketId}`);
      setSelectedTicket(response.data);
      fetchTickets();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      alert(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
    if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false;
    if (filterType !== 'all' && ticket.type !== filterType) return false;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'pending': return '#8b5cf6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN, Role.HR_ADMIN, Role.HR_MANAGER]}>
      <DashboardLayout title="Ticket Management" role="Admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1> Support Ticket Management</h1>
            <p>Manage and resolve employee support tickets</p>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Status:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Priority:</label>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Type:</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All</option>
                <option value="software">Software</option>
                <option value="hardware">Hardware</option>
                <option value="network">Network</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading tickets...</div>
          ) : (
            <div className={styles.content}>
              {/* Tickets List */}
              <div className={styles.ticketsList}>
                <h2>Tickets ({filteredTickets.length})</h2>
                {filteredTickets.length === 0 ? (
                  <div className={styles.noTickets}>No tickets found</div>
                ) : (
                  <div className={styles.ticketsGrid}>
                    {filteredTickets.map(ticket => (
                      <div 
                        key={ticket._id} 
                        className={`${styles.ticketCard} ${selectedTicket?._id === ticket._id ? styles.selected : ''}`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className={styles.ticketHeader}>
                          <span className={styles.ticketNumber}>{ticket.ticketNumber}</span>
                          <span 
                            className={styles.priority} 
                            style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <h3>{ticket.title}</h3>
                        <div className={styles.ticketMeta}>
                          <span className={styles.type}>{ticket.type}</span>
                          <span 
                            className={styles.status}
                            style={{ backgroundColor: getStatusColor(ticket.status) }}
                          >
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className={styles.ticketFooter}>
                          <span> {ticket.employeeId.firstName} {ticket.employeeId.lastName}</span>
                          <span> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                        {ticket.assignedTo && (
                          <div className={styles.assignedTo}>
                            Assigned to: {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ticket Details */}
              {selectedTicket && (
                <div className={styles.ticketDetails}>
                  <div className={styles.detailsHeader}>
                    <h2>Ticket Details</h2>
                    <button 
                      className={styles.closeBtn}
                      onClick={() => setSelectedTicket(null)}
                    >
                      
                    </button>
                  </div>

                  <div className={styles.detailsContent}>
                    <div className={styles.detailsSection}>
                      <h3>{selectedTicket.title}</h3>
                      <div className={styles.badges}>
                        <span 
                          className={styles.badge}
                          style={{ backgroundColor: getPriorityColor(selectedTicket.priority) }}
                        >
                          {selectedTicket.priority} priority
                        </span>
                        <span 
                          className={styles.badge}
                          style={{ backgroundColor: getStatusColor(selectedTicket.status) }}
                        >
                          {selectedTicket.status.replace('_', ' ')}
                        </span>
                        <span className={styles.badge}>{selectedTicket.type}</span>
                      </div>
                    </div>

                    <div className={styles.detailsSection}>
                      <label>Description:</label>
                      <p>{selectedTicket.description}</p>
                    </div>

                    <div className={styles.detailsSection}>
                      <label>Sub-Category:</label>
                      <p>{selectedTicket.subCategory}</p>
                    </div>

                    <div className={styles.detailsSection}>
                      <label>Created By:</label>
                      <p>
                        {selectedTicket.employeeId.firstName} {selectedTicket.employeeId.lastName}
                        {selectedTicket.employeeId.email && ` (${selectedTicket.employeeId.email})`}
                      </p>
                    </div>

                    {selectedTicket.assignedTo && (
                      <div className={styles.detailsSection}>
                        <label>Assigned To:</label>
                        <p>
                          {selectedTicket.assignedTo.firstName} {selectedTicket.assignedTo.lastName}
                        </p>
                      </div>
                    )}

                    {/* Workflow */}
                    {selectedTicket.customWorkflow && selectedTicket.customWorkflow.length > 0 && (
                      <div className={styles.detailsSection}>
                        <label>Workflow Steps:</label>
                        <div className={styles.workflow}>
                          {selectedTicket.customWorkflow.map(step => (
                            <div 
                              key={step.step} 
                              className={`${styles.workflowStep} ${step.completed ? styles.completed : ''}`}
                            >
                              <div className={styles.stepNumber}>{step.step}</div>
                              <div className={styles.stepContent}>
                                <h4>{step.title}</h4>
                                <p>{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {selectedTicket.comments && selectedTicket.comments.length > 0 && (
                      <div className={styles.detailsSection}>
                        <label>Comments:</label>
                        <div className={styles.comments}>
                          {selectedTicket.comments.map((comment, index) => (
                            <div key={index} className={styles.comment}>
                              <div className={styles.commentHeader}>
                                <strong>{comment.userName}</strong>
                                <span>{new Date(comment.createdAt).toLocaleString()}</span>
                              </div>
                              <p>{comment.comment}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className={styles.detailsSection}>
                      <label>Add Comment:</label>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Enter your comment..." rows={3}
                      />
                      <button 
                        onClick={() => handleAddComment(selectedTicket._id)}
                        disabled={isCommenting || !newComment.trim()}
                        className={styles.commentBtn}
                      >
                        {isCommenting ? 'Adding...' : 'Add Comment'}
                      </button>
                    </div>

                    {/* Assign Agent */}
                    {selectedTicket.status !== 'closed' && (
                      <div className={styles.detailsSection}>
                        <label>{selectedTicket.assignedTo ? 'Reassign to Agent:' : 'Assign to Agent:'}</label>
                        <select 
                          value={selectedAgent}
                          onChange={(e) => setSelectedAgent(e.target.value)}
                        >
                          <option value="">Select a System Admin agent...</option>
                          {agents.map(agent => (
                            <option key={agent._id} value={agent._id}>
                              {agent.firstName} {agent.lastName} ({agent.email})
                            </option>
                          ))}
                        </select>
                        {agents.length === 0 && (
                          <p className={styles.noAgents}>No System Admin agents available. Please ensure users have the System Admin role assigned.</p>
                        )}
                        <button 
                          onClick={() => handleAssignTicket(selectedTicket._id)}
                          disabled={isAssigning || !selectedAgent}
                          className={styles.assignBtn}
                        >
                          {isAssigning ? 'Assigning...' : selectedTicket.assignedTo ? 'Reassign Ticket' : 'Assign Ticket'}
                        </button>
                      </div>
                    )}

                    {/* Resolve Ticket */}
                    {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                      <div className={styles.detailsSection}>
                        <label>Resolve Ticket:</label>
                        <textarea
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          placeholder="Enter resolution details..." rows={4}
                        />
                        <button 
                          onClick={() => handleResolveTicket(selectedTicket._id)}
                          disabled={isResolving || !resolution.trim()}
                          className={styles.resolveBtn}
                        >
                          {isResolving ? 'Resolving...' : 'Resolve & Close Ticket'}
                        </button>
                      </div>
                    )}

                    {selectedTicket.resolution && (
                      <div className={styles.detailsSection}>
                        <label>Resolution:</label>
                        <div className={styles.resolution}>
                          {selectedTicket.resolution}
                        </div>
                      </div>
                    )}

                    {/* Live Chat */}
                    {selectedTicket.status !== 'closed' && (
                      <div className={styles.liveChatSection}>
                        <button 
                          className={styles.liveChatBtn}
                          onClick={() => setShowChat(true)}
                        >
                           Start Live Chat with Employee
                        </button>
                        <p className={styles.liveChatInfo}>
                          Communicate in real-time with the ticket submitter
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Chat Component */}
          {selectedTicket && (
            <TicketChat
              ticketId={selectedTicket._id}
              ticketNumber={selectedTicket.ticketNumber}
              isOpen={showChat}
              onClose={() => setShowChat(false)}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}