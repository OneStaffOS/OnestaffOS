/**
 * HR Leave Management Page
 * REQ-025: HR Finalize Approved Requests
 * REQ-026: HR Override Manager Decision
 * REQ-027: Bulk Request Processing
 * REQ-028: Verify Medical Documents
 * REQ-029: Auto Update Balance (Post-Approval)
 * REQ-030: Finalization Notification (Internal)
 * 
 * Accessible by: HR Manager, HR Admin
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import Spinner from '@/app/components/Spinner';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole as Role } from '@/lib/roles';
import { useAuth } from '@/app/context/AuthContext';
import axios from '@/lib/axios-config';
import styles from './hr-management.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  primaryDepartmentId?: { _id: string; name: string };
}

interface LeaveType {
  _id: string;
  code: string;
  name: string;
}

interface Attachment {
  _id: string;
  originalName: string;
  filePath: string;
  fileType?: string;
}

interface LeaveRequest {
  _id: string;
  employeeId: Employee | string;
  leaveTypeId: LeaveType | string;
  dates: {
    from: string;
    to: string;
  };
  durationDays: number;
  justification?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvalFlow: {
    role: string;
    status: string;
    decidedBy?: string;
    decidedAt?: string;
  }[];
  attachmentId?: Attachment | string;
  irregularPatternFlag?: boolean;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'finalize' | 'override' | 'bulk' | 'medical';

const statusColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706' },
  approved: { bg: '#dcfce7', color: '#16a34a' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
  cancelled: { bg: '#f1f5f9', color: '#64748b' },
  'n/a': { bg: '#e2e8f0', color: '#94a3b8' },
};

// Modal styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '20px',
  maxWidth: '600px',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
};

const modalHeaderStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '1.5rem 2rem',
  borderRadius: '20px 20px 0 0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const modalContentStyle: React.CSSProperties = {
  padding: '2rem',
};

const summaryBoxStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  border: '1px solid #e5e7eb',
};

const infoBoxStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
  borderLeft: '4px solid #3b82f6',
  borderRadius: '10px',
  padding: '1.25rem',
  marginBottom: '1.5rem',
};

const warningBoxStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
  borderLeft: '4px solid #dc2626',
  borderRadius: '10px',
  padding: '1.25rem',
  marginBottom: '1.5rem',
};

export default function HRLeaveManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('finalize');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  // Form states
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [overrideDecision, setOverrideDecision] = useState<'approved' | 'rejected'>('approved');
  const [overrideReason, setOverrideReason] = useState('');
  const [allowNegativeBalance, setAllowNegativeBalance] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [bulkReason, setBulkReason] = useState('');
  const [medicalVerified, setMedicalVerified] = useState(true);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isHRManager = user?.roles?.includes(Role.HR_MANAGER);
  const isHRAdmin = user?.roles?.includes(Role.HR_ADMIN);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      let endpoint = '';

      switch (activeTab) {
        case 'finalize':
          endpoint = '/leaves/requests/pending-hr-finalization';
          break;
        case 'override':
          endpoint = '/leaves/requests/for-override';
          break;
        case 'bulk':
          endpoint = '/leaves/requests?status=pending';
          break;
        case 'medical':
          endpoint = '/leaves/requests/medical-verification';
          break;
      }

      const response = await axios.get(endpoint);
      setRequests(response.data);
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
      setError(err.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
    setSelectedRequests([]);
  }, [fetchRequests]);

  const getEmployeeName = (employee: Employee | string): string => {
    if (typeof employee === 'object' && employee !== null) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return 'Unknown';
  };

  const getEmployeeDepartment = (employee: Employee | string): string => {
    if (typeof employee === 'object' && employee !== null && employee.primaryDepartmentId) {
      return typeof employee.primaryDepartmentId === 'object' 
        ? employee.primaryDepartmentId.name 
        : '';
    }
    return '';
  };

  const getLeaveTypeName = (leaveType: LeaveType | string): string => {
    if (typeof leaveType === 'object' && leaveType !== null) {
      return leaveType.name;
    }
    return 'Unknown';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getApprovalStatus = (request: LeaveRequest) => {
    const managerStep = request.approvalFlow[0];
    const hrStep = request.approvalFlow[1];
    
    const managerStatus = managerStep?.status || 'pending';
    const hrStatus = hrStep?.status || 'pending';
    
    // If overall request is rejected, determine which side rejected
    const isRejected = request.status === 'rejected';
    const managerRejected = managerStatus === 'rejected';
    const hrRejected = hrStatus === 'rejected';
    
    // If manager rejected, HR should show as N/A (not reached)
    // If HR rejected, manager status remains as it was (approved)
    let displayManagerStatus = managerStatus;
    let displayHrStatus = hrStatus;
    
    if (isRejected) {
      if (managerRejected) {
        // Manager rejected - HR never got to review
        displayHrStatus = 'n/a';
      }
      // If HR rejected, manager would have approved (since it reached HR)
    }
    
    return { 
      managerStatus: displayManagerStatus, 
      hrStatus: displayHrStatus,
      rejectedBy: managerRejected ? 'manager' : (hrRejected ? 'hr' : null)
    };
  };

  const hasAttachment = (request: LeaveRequest): boolean => {
    return !!request.attachmentId;
  };

  // REQ-031: Check if a leave request is a post-leave (submitted >24 hours after leave ended)
  const isPostLeave = (request: LeaveRequest): boolean => {
    const leaveEndDate = new Date(request.dates.to);
    leaveEndDate.setHours(23, 59, 59, 999); // End of the leave day
    const submittedDate = new Date(request.createdAt);
    const hoursSinceLeaveEnd = (submittedDate.getTime() - leaveEndDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceLeaveEnd > 24;
  };

  const getAttachmentInfo = (request: LeaveRequest): { id: string; name: string } | null => {
    if (!request.attachmentId) return null;
    if (typeof request.attachmentId === 'object') {
      return { id: request.attachmentId._id, name: request.attachmentId.originalName };
    }
    return { id: request.attachmentId, name: 'Attachment' };
  };

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      const response = await axios.get(`/leaves/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download attachment:', err);
      setError('Failed to download attachment');
    }
  };

  // Finalize handler
  const handleFinalize = async () => {
    if (!selectedRequest || !user?.sub) return;

    try {
      setSubmitting(true);
      setError('');

      await axios.post(`/leaves/requests/${selectedRequest._id}/hr-finalize`, {
        hrUserId: user.sub,
        comments: comments.trim() || undefined,
      });

      setSuccess('Leave request finalized successfully! Balance updated and notifications sent.');
      setShowFinalizeModal(false);
      setSelectedRequest(null);
      setComments('');
      fetchRequests();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Failed to finalize request:', err);
      setError(err.response?.data?.message || 'Failed to finalize request');
    } finally {
      setSubmitting(false);
    }
  };

  // HR Reject handler
  const handleReject = async () => {
    if (!selectedRequest || !user?.sub) return;

    if (!rejectReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await axios.post(`/leaves/requests/${selectedRequest._id}/hr-override`, {
        hrUserId: user.sub,
        newDecision: 'rejected',
        reason: rejectReason.trim(),
        allowNegativeBalance: false,
      });

      setSuccess('Leave request rejected by HR. Notifications sent.');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchRequests();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      setError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  // Override handler
  const handleOverride = async () => {
    if (!selectedRequest || !user?.sub) return;

    if (!overrideReason.trim()) {
      setError('Override reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await axios.post(`/leaves/requests/${selectedRequest._id}/hr-override`, {
        hrUserId: user.sub,
        newDecision: overrideDecision,
        reason: overrideReason.trim(),
        allowNegativeBalance,
      });

      setSuccess(`Decision overridden to ${overrideDecision}. Balance updated and notifications sent.`);
      setShowOverrideModal(false);
      setSelectedRequest(null);
      setOverrideReason('');
      setOverrideDecision('approved');
      setAllowNegativeBalance(false);
      fetchRequests();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Failed to override decision:', err);
      setError(err.response?.data?.message || 'Failed to override decision');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk process handler
  const handleBulkProcess = async () => {
    if (selectedRequests.length === 0 || !user?.sub) return;

    if (bulkAction === 'reject' && !bulkReason.trim()) {
      setError('Rejection reason is required for bulk rejection');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await axios.post('/leaves/requests/bulk-process', {
        requestIds: selectedRequests,
        action: bulkAction,
        hrUserId: user.sub,
        reason: bulkReason.trim() || undefined,
      });

      const { processed, failed } = response.data;
      setSuccess(`Processed ${processed} requests successfully.${failed.length > 0 ? ` ${failed.length} failed.` : ''}`);
      setShowBulkModal(false);
      setSelectedRequests([]);
      setBulkReason('');
      fetchRequests();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Failed to process bulk requests:', err);
      setError(err.response?.data?.message || 'Failed to process bulk requests');
    } finally {
      setSubmitting(false);
    }
  };

  // Medical verification handler
  const handleMedicalVerification = async () => {
    if (!selectedRequest || !user?.sub) return;

    try {
      setSubmitting(true);
      setError('');

      await axios.post(`/leaves/requests/${selectedRequest._id}/verify-medical`, {
        hrUserId: user.sub,
        verified: medicalVerified,
        notes: medicalNotes.trim() || undefined,
      });

      setSuccess(medicalVerified 
        ? 'Medical document verified successfully.' 
        : 'Medical document rejected. Leave request has been rejected.'
      );
      setShowMedicalModal(false);
      setSelectedRequest(null);
      setMedicalNotes('');
      setMedicalVerified(true);
      fetchRequests();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Failed to verify medical document:', err);
      setError(err.response?.data?.message || 'Failed to verify medical document');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectRequest = (requestId: string) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const selectAllRequests = () => {
    if (selectedRequests.length === requests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(requests.map(r => r._id));
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return <Spinner message="Loading requests..." />;
    }

    if (requests.length === 0) {
      return (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '4rem 2rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}>
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}></span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', marginBottom: '0.75rem' }}>
            No Requests Found
          </h3>
          <p style={{ fontSize: '1.05rem', color: '#6b7280', margin: 0 }}>
            {activeTab === 'finalize' && 'No requests pending HR finalization.'}
            {activeTab === 'override' && 'No requests available for override.'}
            {activeTab === 'bulk' && 'No pending requests available for bulk processing.'}
            {activeTab === 'medical' && 'No requests requiring medical document verification.'}
          </p>
        </div>
      );
    }

    return (
      <div style={{ 
        background: 'white', 
        borderRadius: '16px', 
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            minWidth: '1000px'
          }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }}>
                {activeTab === 'bulk' && (
                  <th style={{ 
                    padding: '1.25rem 1rem', 
                    textAlign: 'left', 
                    fontWeight: '700', 
                    color: '#374151',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <input 
                      type="checkbox" checked={selectedRequests.length === requests.length && requests.length > 0}
                      onChange={selectAllRequests}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </th>
                )}
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Employee</th>
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Department</th>
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Leave Type</th>
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Dates</th>
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Days</th>
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Status</th>
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Manager</th>
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>HR</th>
                {activeTab === 'medical' && <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Document</th>}
                <th style={{ 
                  padding: '1.25rem 1rem', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  color: '#374151',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const { managerStatus, hrStatus, rejectedBy } = getApprovalStatus(request);
                return (
                  <tr key={request._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {activeTab === 'bulk' && (
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <input 
                          type="checkbox" checked={selectedRequests.includes(request._id)}
                          onChange={() => toggleSelectRequest(request._id)}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                      </td>
                    )}
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div>
                        <span style={{ fontWeight: '600', color: '#111827', fontSize: '0.95rem' }}>
                          {getEmployeeName(request.employeeId)}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', color: '#6b7280', fontSize: '0.95rem' }}>
                      {getEmployeeDepartment(request.employeeId)}
                    </td>
                    <td style={{ padding: '1.25rem 1rem', color: '#374151', fontSize: '0.95rem', fontWeight: '500' }}>
                      {getLeaveTypeName(request.leaveTypeId)}
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', color: '#374151' }}>{formatDate(request.dates.from)}</span>
                        <span style={{ color: '#9ca3af' }}>→</span>
                        <span style={{ fontSize: '0.9rem', color: '#374151' }}>{formatDate(request.dates.to)}</span>
                        {isPostLeave(request) && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            background: '#fef3c7', 
                            color: '#d97706', 
                            fontSize: '0.75rem', 
                            fontWeight: '600', 
                            borderRadius: '6px' 
                          }}>Post-Leave</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span style={{ 
                        fontWeight: '700', 
                        color: '#3b82f6', 
                        fontSize: '1.05rem' 
                      }}>{request.durationDays}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span 
                        style={{ 
                          padding: '0.5rem 0.875rem',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          display: 'inline-block',
                          background: statusColors[request.status].bg,
                          color: statusColors[request.status].color,
                        }}
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        {rejectedBy && ` (by ${rejectedBy === 'manager' ? 'Manager' : 'HR'})`}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span 
                        style={{ 
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          display: 'inline-block',
                          background: statusColors[managerStatus]?.bg || '#f1f5f9',
                          color: statusColors[managerStatus]?.color || '#64748b',
                        }}
                      >
                        {managerStatus === 'n/a' ? 'N/A' : managerStatus.charAt(0).toUpperCase() + managerStatus.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span 
                        style={{ 
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          display: 'inline-block',
                          background: statusColors[hrStatus]?.bg || '#f1f5f9',
                          color: statusColors[hrStatus]?.color || '#64748b',
                        }}
                      >
                        {hrStatus === 'n/a' ? 'N/A' : hrStatus.charAt(0).toUpperCase() + hrStatus.slice(1)}
                      </span>
                    </td>
                    {activeTab === 'medical' && (
                      <td style={{ padding: '1.25rem 1rem' }}>
                        {(() => {
                          const attachmentInfo = getAttachmentInfo(request);
                          if (attachmentInfo) {
                            return (
                              <button
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
                                  transition: 'all 0.3s ease',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                onClick={() => handleDownloadAttachment(attachmentInfo.id, attachmentInfo.name)}
                                title={`Download: ${attachmentInfo.name}`}
                              >
                                 Download
                              </button>
                            );
                          }
                          return <span style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: '600' }}> Missing</span>;
                        })()}
                      </td>
                    )}
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {activeTab === 'finalize' && (
                          <>
                            <button
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.3s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowFinalizeModal(true);
                              }}
                            >
                               Finalize
                            </button>
                            <button
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                                transition: 'all 0.3s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectModal(true);
                              }}
                            >
                               Reject
                            </button>
                          </>
                        )}
                        {activeTab === 'override' && (
                          <button
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                              transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowOverrideModal(true);
                            }}
                          >
                             Override
                          </button>
                        )}
                        {activeTab === 'medical' && (
                          <button
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              boxShadow: '0 2px 6px rgba(139, 92, 246, 0.3)',
                              transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowMedicalModal(true);
                            }}
                          >
                             Verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute requiredRoles={[Role.HR_MANAGER, Role.HR_ADMIN]}>
      <DashboardLayout title="HR Leave Management" role="HR">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div>
              <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 HR Leave Management
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem' }}>
                Finalize requests, override decisions, process in bulk, and verify medical documents
              </p>
            </div>
            <button 
              style={{
                padding: '0.875rem 1.75rem',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => router.push('/dashboard/hr')}
            >
              ← Back to HR Dashboard
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '2px solid #dc2626',
              borderRadius: '12px',
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              color: '#991b1b',
              fontSize: '1rem',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              border: '2px solid #16a34a',
              borderRadius: '12px',
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              color: '#166534',
              fontSize: '1rem',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
            }}>
              {success}
            </div>
          )}

          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <button
              style={{
                padding: '1rem 1.75rem',
                background: activeTab === 'finalize' 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'white',
                color: activeTab === 'finalize' ? 'white' : '#6b7280',
                border: activeTab === 'finalize' ? 'none' : '2px solid #e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                boxShadow: activeTab === 'finalize' 
                  ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                  : '0 2px 6px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'finalize') {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.color = '#10b981';
                }
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'finalize') {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                }
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => setActiveTab('finalize')}
            >
               Finalize Requests
            </button>
            <button
              style={{
                padding: '1rem 1.75rem',
                background: activeTab === 'override' 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'white',
                color: activeTab === 'override' ? 'white' : '#6b7280',
                border: activeTab === 'override' ? 'none' : '2px solid #e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                boxShadow: activeTab === 'override' 
                  ? '0 4px 12px rgba(245, 158, 11, 0.3)'
                  : '0 2px 6px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'override') {
                  e.currentTarget.style.borderColor = '#f59e0b';
                  e.currentTarget.style.color = '#f59e0b';
                }
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'override') {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                }
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => setActiveTab('override')}
            >
               Override Decisions
            </button>
            {isHRManager && (
              <button
                style={{
                  padding: '1rem 1.75rem',
                  background: activeTab === 'bulk' 
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                    : 'white',
                  color: activeTab === 'bulk' ? 'white' : '#6b7280',
                  border: activeTab === 'bulk' ? 'none' : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: activeTab === 'bulk' 
                    ? '0 4px 12px rgba(139, 92, 246, 0.3)'
                    : '0 2px 6px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'bulk') {
                    e.currentTarget.style.borderColor = '#8b5cf6';
                    e.currentTarget.style.color = '#8b5cf6';
                  }
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'bulk') {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '#6b7280';
                  }
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => setActiveTab('bulk')}
              >
                 Bulk Processing
              </button>
            )}
            <button
              style={{
                padding: '1rem 1.75rem',
                background: activeTab === 'medical' 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'white',
                color: activeTab === 'medical' ? 'white' : '#6b7280',
                border: activeTab === 'medical' ? 'none' : '2px solid #e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                boxShadow: activeTab === 'medical' 
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                  : '0 2px 6px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'medical') {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.color = '#3b82f6';
                }
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'medical') {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                }
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => setActiveTab('medical')}
            >
               Medical Verification
            </button>
          </div>

          {/* Tab Description */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            fontSize: '1rem',
            color: '#1e40af',
            lineHeight: '1.6'
          }}>
            {activeTab === 'finalize' && (
              <p style={{ margin: 0 }}> Review and finalize leave requests that have been approved by managers. This will update employee balances and send notifications.</p>
            )}
            {activeTab === 'override' && (
              <p style={{ margin: 0 }}> Override manager decisions in special circumstances. Requires a reason and can optionally allow negative balances.</p>
            )}
            {activeTab === 'bulk' && (
              <p style={{ margin: 0 }}> Process multiple pending leave requests at once for efficient management. Select requests and choose an action.</p>
            )}
            {activeTab === 'medical' && (
              <p style={{ margin: 0 }}> Verify medical documents for sick leave requests longer than 1 day. Medical certificates are required for validation.</p>
            )}
          </div>

          {/* Bulk Action Bar */}
          {activeTab === 'bulk' && selectedRequests.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
            }}>
              <span style={{ fontSize: '1.05rem', fontWeight: '600', color: '#92400e' }}>
                {selectedRequests.length} request(s) selected
              </span>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                onClick={() => {
                  setBulkAction('approve');
                  setShowBulkModal(true);
                }}
              >
                 Approve Selected
              </button>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                onClick={() => {
                  setBulkAction('reject');
                  setShowBulkModal(true);
                }}
              >
                 Reject Selected
              </button>
            </div>
          )}

          {/* Content */}
          {renderTabContent()}

          {/* Finalize Modal */}
          {showFinalizeModal && selectedRequest && (
            <div style={modalOverlayStyle} onClick={() => setShowFinalizeModal(false)}>
              <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={modalHeaderStyle}>
                  <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}> Finalize Leave Request</h2>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      color: 'white',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onClick={() => setShowFinalizeModal(false)}
                  >
                    
                  </button>
                </div>
                <div style={modalContentStyle}>
                  <div style={summaryBoxStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Employee:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{getEmployeeName(selectedRequest.employeeId)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Leave Type:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{getLeaveTypeName(selectedRequest.leaveTypeId)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Dates:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{formatDate(selectedRequest.dates.from)} → {formatDate(selectedRequest.dates.to)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Duration:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{selectedRequest.durationDays} day(s)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Reason:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{selectedRequest.justification || 'No reason provided'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Manager Status:</span>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        background: '#dcfce7', 
                        color: '#16a34a', 
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}> Approved</span>
                    </div>
                  </div>

                  <div style={infoBoxStyle}>
                    <strong style={{ color: '#1e40af', display: 'block', marginBottom: '0.75rem' }}> What happens when you finalize:</strong>
                    <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#1e40af' }}>
                      <li style={{ marginBottom: '0.5rem' }}>HR approval step will be marked as approved</li>
                      <li style={{ marginBottom: '0.5rem' }}>Employee's leave balance will be updated automatically</li>
                      <li>Notifications will be sent to employee, manager, and attendance coordinator</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="comments" style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Comments (Optional)
                    </label>
                    <textarea
                      id="comments" value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add any comments for the employee..." rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'border-color 0.3s ease',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {error && (
                    <div style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                      fontWeight: '500'
                    }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'white',
                        color: '#6b7280',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#9ca3af';
                        e.currentTarget.style.color = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.color = '#6b7280';
                      }}
                      onClick={() => setShowFinalizeModal(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      onClick={handleFinalize}
                      disabled={submitting}
                    >
                      {submitting ? 'Processing...' : 'Finalize Request'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HR Reject Modal */}
          {showRejectModal && selectedRequest && (
            <div style={modalOverlayStyle} onClick={() => setShowRejectModal(false)}>
              <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={modalHeaderStyle}>
                  <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}> Reject Leave Request</h2>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      color: 'white',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onClick={() => setShowRejectModal(false)}
                  >
                    
                  </button>
                </div>
                <div style={modalContentStyle}>
                  <div style={summaryBoxStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Employee:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{getEmployeeName(selectedRequest.employeeId)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Leave Type:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{getLeaveTypeName(selectedRequest.leaveTypeId)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Dates:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{formatDate(selectedRequest.dates.from)} → {formatDate(selectedRequest.dates.to)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Duration:</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{selectedRequest.durationDays} day(s)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Manager Status:</span>
                      <span style={{ padding: '0.25rem 0.75rem', background: '#dcfce7', color: '#16a34a', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '600' }}> Approved</span>
                    </div>
                  </div>

                  <div style={warningBoxStyle}>
                    <strong style={{ color: '#991b1b', display: 'block', marginBottom: '0.5rem' }}> Warning:</strong>
                    <p style={{ margin: 0, color: '#991b1b' }}>You are about to reject a leave request that was already approved by the manager. The employee will be notified of this decision.</p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="rejectReason" style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Rejection Reason (Required)</label>
                    <textarea
                      id="rejectReason" value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Provide a reason for rejecting this request..." rows={3}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'border-color 0.3s ease',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '500' }}>{error}</div>}

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'white',
                        color: '#6b7280',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.color = '#374151'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
                      onClick={() => setShowRejectModal(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: submitting || !rejectReason.trim() ? '#9ca3af' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: submitting || !rejectReason.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => !submitting && rejectReason.trim() && (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      onClick={handleReject}
                      disabled={submitting || !rejectReason.trim()}
                    >
                      {submitting ? 'Processing...' : 'Reject Request'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Override Modal */}
          {showOverrideModal && selectedRequest && (
            <div className={styles.modalOverlay} onClick={() => setShowOverrideModal(false)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2> Override Manager Decision</h2>
                  <button className={styles.closeButton} onClick={() => setShowOverrideModal(false)}>
                    
                  </button>
                </div>
                <div className={styles.modalContent}>
                  <div className={styles.requestSummary}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Employee:</span>
                      <span>{getEmployeeName(selectedRequest.employeeId)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Leave Type:</span>
                      <span>{getLeaveTypeName(selectedRequest.leaveTypeId)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Dates:</span>
                      <span>{formatDate(selectedRequest.dates.from)} → {formatDate(selectedRequest.dates.to)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Current Status:</span>
                      <span 
                        className={styles.statusBadge}
                        style={{ 
                          background: statusColors[selectedRequest.status].bg,
                          color: statusColors[selectedRequest.status].color,
                        }}
                      >
                        {selectedRequest.status}
                      </span>
                    </div>
                  </div>

                  <div className={styles.warningBox}>
                    <strong> Override Warning:</strong>
                    <p>This action will override the manager's decision and update both approval steps. An audit log entry will be created.</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label>New Decision *</label>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio" name="overrideDecision" value="approved" checked={overrideDecision === 'approved'}
                          onChange={() => setOverrideDecision('approved')}
                        />
                        <span className={styles.approveRadio}> Approve</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio" name="overrideDecision" value="rejected" checked={overrideDecision === 'rejected'}
                          onChange={() => setOverrideDecision('rejected')}
                        />
                        <span className={styles.rejectRadio}> Reject</span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="overrideReason">Override Reason *</label>
                    <textarea
                      id="overrideReason" value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Please provide a detailed reason for this override..." rows={3}
                      required
                    />
                  </div>

                  {overrideDecision === 'approved' && (
                    <div className={styles.checkboxGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox" checked={allowNegativeBalance}
                          onChange={(e) => setAllowNegativeBalance(e.target.checked)}
                        />
                        <span>Allow negative balance (override policy restriction)</span>
                      </label>
                    </div>
                  )}

                  {error && <div className={styles.formError}>{error}</div>}

                  <div className={styles.modalActions}>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setShowOverrideModal(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      className={overrideDecision === 'approved' ? styles.confirmButton : styles.rejectConfirmButton}
                      onClick={handleOverride}
                      disabled={submitting}
                    >
                      {submitting ? 'Processing...' : `Override to ${overrideDecision}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Processing Modal */}
          {showBulkModal && (
            <div className={styles.modalOverlay} onClick={() => setShowBulkModal(false)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2> Bulk {bulkAction === 'approve' ? 'Approve' : 'Reject'} Requests</h2>
                  <button className={styles.closeButton} onClick={() => setShowBulkModal(false)}>
                    
                  </button>
                </div>
                <div className={styles.modalContent}>
                  <div className={styles.infoBox}>
                    <strong> Selected Requests:</strong>
                    <p>{selectedRequests.length} request(s) will be {bulkAction === 'approve' ? 'approved' : 'rejected'}.</p>
                  </div>

                  {bulkAction === 'approve' && (
                    <div className={styles.formGroup}>
                      <label htmlFor="bulkReason">Comments (Optional)</label>
                      <textarea
                        id="bulkReason" value={bulkReason}
                        onChange={(e) => setBulkReason(e.target.value)}
                        placeholder="Add any comments..." rows={3}
                      />
                    </div>
                  )}

                  {bulkAction === 'reject' && (
                    <div className={styles.formGroup}>
                      <label htmlFor="bulkReason">Rejection Reason *</label>
                      <textarea
                        id="bulkReason" value={bulkReason}
                        onChange={(e) => setBulkReason(e.target.value)}
                        placeholder="Please provide a reason for rejection..." rows={3}
                        required
                      />
                    </div>
                  )}

                  {error && <div className={styles.formError}>{error}</div>}

                  <div className={styles.modalActions}>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setShowBulkModal(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      className={bulkAction === 'approve' ? styles.confirmButton : styles.rejectConfirmButton}
                      onClick={handleBulkProcess}
                      disabled={submitting}
                    >
                      {submitting ? 'Processing...' : `${bulkAction === 'approve' ? 'Approve' : 'Reject'} ${selectedRequests.length} Request(s)`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Medical Verification Modal */}
          {showMedicalModal && selectedRequest && (
            <div className={styles.modalOverlay} onClick={() => setShowMedicalModal(false)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2> Verify Medical Document</h2>
                  <button className={styles.closeButton} onClick={() => setShowMedicalModal(false)}>
                    
                  </button>
                </div>
                <div className={styles.modalContent}>
                  <div className={styles.requestSummary}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Employee:</span>
                      <span>{getEmployeeName(selectedRequest.employeeId)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Leave Type:</span>
                      <span>{getLeaveTypeName(selectedRequest.leaveTypeId)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Duration:</span>
                      <span>{selectedRequest.durationDays} day(s)</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Document:</span>
                      {(() => {
                        const attachmentInfo = getAttachmentInfo(selectedRequest);
                        if (attachmentInfo) {
                          return (
                            <button
                              className={styles.downloadButton}
                              onClick={() => handleDownloadAttachment(attachmentInfo.id, attachmentInfo.name)}
                              title={`Download: ${attachmentInfo.name}`}
                            >
                               Download Certificate
                            </button>
                          );
                        }
                        return <span className={styles.noDocument}> No Document Attached</span>;
                      })()}
                    </div>
                  </div>

                  <div className={styles.infoBox}>
                    <strong> Medical Document Requirements:</strong>
                    <ul>
                      <li>Medical certificate is required for sick leave longer than 1 day</li>
                      <li>Document must be from a licensed medical practitioner</li>
                      <li>Document must include dates of illness and recommended rest period</li>
                    </ul>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Verification Decision *</label>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio" name="medicalVerified" checked={medicalVerified}
                          onChange={() => setMedicalVerified(true)}
                        />
                        <span className={styles.approveRadio}> Document Verified</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio" name="medicalVerified" checked={!medicalVerified}
                          onChange={() => setMedicalVerified(false)}
                        />
                        <span className={styles.rejectRadio}> Document Rejected</span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="medicalNotes">Notes {!medicalVerified && '*'}</label>
                    <textarea
                      id="medicalNotes" value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      placeholder={medicalVerified 
                        ? "Add any verification notes..."
                        : "Please explain why the document is rejected..."
                      }
                      rows={3}
                      required={!medicalVerified}
                    />
                  </div>

                  {!medicalVerified && (
                    <div className={styles.warningBox}>
                      <strong> Warning:</strong>
                      <p>Rejecting the medical document will automatically reject the leave request.</p>
                    </div>
                  )}

                  {error && <div className={styles.formError}>{error}</div>}

                  <div className={styles.modalActions}>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setShowMedicalModal(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      className={medicalVerified ? styles.confirmButton : styles.rejectConfirmButton}
                      onClick={handleMedicalVerification}
                      disabled={submitting}
                    >
                      {submitting ? 'Processing...' : (medicalVerified ? 'Verify Document' : 'Reject Document')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}