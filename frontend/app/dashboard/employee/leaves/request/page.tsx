/**
 * Submit Leave Request Page
 * REQ-015, REQ-016: Submit new leave request with attachments
 * Accessible by: Employees
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './request.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface LeaveType {
  _id: string;
  code: string;
  name: string;
  paid: boolean;
  requiresAttachment: boolean;
  attachmentType?: string;
  maxDurationDays?: number;
  description?: string;
}

interface LeaveBalance {
  leaveTypeId: string | { _id: string };
  yearlyEntitlement: number;
  taken: number;
  pending: number;
  remaining: number;
}

interface FormData {
  leaveTypeId: string;
  dateFrom: string;
  dateTo: string;
  justification: string;
}

export default function SubmitLeaveRequestPage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState<number>(0);
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [isPostLeave, setIsPostLeave] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    leaveTypeId: '',
    dateFrom: '',
    dateTo: '',
    justification: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Get employee profile
      const profileRes = await axios.get('/employee-profile/my-profile');
      const profile = profileRes.data;
      setEmployeeId(profile._id);

      // Fetch leave types
      const typesRes = await axios.get('/leaves/types');
      setLeaveTypes(typesRes.data);

      // Fetch leave balances
      try {
        const balancesRes = await axios.get(`/leaves/balances/employee/${profile._id}`);
        setBalances(Array.isArray(balancesRes.data) ? balancesRes.data : [balancesRes.data]);
      } catch {
        setBalances([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate duration when dates change
  useEffect(() => {
    if (formData.dateFrom && formData.dateTo) {
      const from = new Date(formData.dateFrom);
      const to = new Date(formData.dateTo);
      
      if (to >= from) {
        // Simple calculation - count business days (excluding weekends)
        let days = 0;
        const current = new Date(from);
        while (current <= to) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            days++;
          }
          current.setDate(current.getDate() + 1);
        }
        setDurationDays(days);

        // REQ-031: Check if this is a post-leave request (leave end date > 24 hours in the past)
        const now = new Date();
        const toDate = new Date(formData.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of the leave day
        const hoursSinceLeaveEnd = (now.getTime() - toDate.getTime()) / (1000 * 60 * 60);
        setIsPostLeave(hoursSinceLeaveEnd > 24);

        // Check balance
        checkBalance(days);
        // Check overlapping
        checkOverlap(formData.dateFrom, formData.dateTo);
      } else {
        setDurationDays(0);
        setBalanceWarning(null);
        setIsPostLeave(false);
      }
    } else {
      setDurationDays(0);
      setBalanceWarning(null);
      setIsPostLeave(false);
    }
  }, [formData.dateFrom, formData.dateTo, formData.leaveTypeId]);

  const checkBalance = (days: number) => {
    if (!formData.leaveTypeId) {
      setBalanceWarning(null);
      return;
    }

    const balance = balances.find(b => {
      const typeId = typeof b.leaveTypeId === 'object' ? b.leaveTypeId._id : b.leaveTypeId;
      return typeId === formData.leaveTypeId;
    });

    if (balance && days > balance.remaining) {
      setBalanceWarning(`Warning: You are requesting ${days} days but only have ${balance.remaining} days remaining. The excess may be converted to unpaid leave.`);
    } else {
      setBalanceWarning(null);
    }

    // Check max duration
    const leaveType = leaveTypes.find(t => t._id === formData.leaveTypeId);
    if (leaveType?.maxDurationDays && days > leaveType.maxDurationDays) {
      setBalanceWarning(`Warning: Maximum duration for ${leaveType.name} is ${leaveType.maxDurationDays} days.`);
    }
  };

  const checkOverlap = async (dateFrom: string, dateTo: string) => {
    try {
      // Fetch existing approved/pending requests to check for overlap
      const res = await axios.get(`/leaves/requests?employeeId=${employeeId}`);
      const existingRequests = res.data.filter((r: any) => 
        r.status === 'approved' || r.status === 'pending'
      );

      const from = new Date(dateFrom);
      const to = new Date(dateTo);

      for (const request of existingRequests) {
        const reqFrom = new Date(request.dates.from);
        const reqTo = new Date(request.dates.to);

        // Check for overlap
        if (from <= reqTo && to >= reqFrom) {
          setOverlapWarning(`Warning: These dates overlap with an existing ${request.status} leave request (${reqFrom.toLocaleDateString()} - ${reqTo.toLocaleDateString()}).`);
          return;
        }
      }
      setOverlapWarning(null);
    } catch (err) {
      console.debug('Could not check for overlapping dates:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setAttachmentId(null);
    }
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!selectedFile) {
      return null;
    }

    try {
      setUploadingFile(true);
      
      // Create form data for file upload
      const formDataUpload = new FormData();
      formDataUpload.append('file', selectedFile);
      
      // Upload file to GridFS endpoint
      const res = await axios.post('/leaves/attachments/upload', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return res.data._id;
    } catch (err: any) {
      console.error('Failed to upload attachment:', err);
      throw new Error('Failed to upload attachment');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.leaveTypeId || !formData.dateFrom || !formData.dateTo) {
      setError('Please fill in all required fields');
      return;
    }

    if (durationDays <= 0) {
      setError('Invalid date range. End date must be after start date.');
      return;
    }

    // Check if attachment is required
    const selectedLeaveType = leaveTypes.find(t => t._id === formData.leaveTypeId);
    if (selectedLeaveType?.requiresAttachment && !selectedFile && !attachmentId) {
      setError(`${selectedLeaveType.name} requires a supporting document. Please upload an attachment.`);
      return;
    }

    try {
      setSubmitting(true);

      // Upload attachment if selected
      let finalAttachmentId = attachmentId;
      
      if (selectedFile && !attachmentId) {
        finalAttachmentId = await uploadAttachment();
        setAttachmentId(finalAttachmentId);
      }

      const payload = {
        employeeId,
        leaveTypeId: formData.leaveTypeId,
        dateFrom: formData.dateFrom,
        dateTo: formData.dateTo,
        durationDays,
        justification: formData.justification || undefined,
        attachmentId: finalAttachmentId || undefined,
      };
      
      await axios.post('/leaves/requests', payload);

      setSuccess('Leave request submitted successfully!');
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/dashboard/employee/leaves');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to submit leave request:', err);
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const getBalance = (leaveTypeId: string): LeaveBalance | undefined => {
    return balances.find(b => {
      const typeId = typeof b.leaveTypeId === 'object' ? b.leaveTypeId._id : b.leaveTypeId;
      return typeId === leaveTypeId;
    });
  };

  const selectedLeaveType = leaveTypes.find(t => t._id === formData.leaveTypeId);
  const currentBalance = formData.leaveTypeId ? getBalance(formData.leaveTypeId) : undefined;

  return (
    <ProtectedRoute requiredRoles={[Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.HR_EMPLOYEE, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Submit Leave Request" role="Employee">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>📝 Submit Leave Request</h1>
              <p className={styles.subtitle}>Request time off by filling out the form below</p>
            </div>
            <button
              className={styles.backButton}
              onClick={() => router.push('/dashboard/employee/leaves')}
            >
              ← Back to My Leaves
            </button>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {loading ? (
            <Spinner message="Loading leave data..." />
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                {/* Leave Type Selection */}
                <div className={styles.formSection}>
                  <h2 className={styles.sectionTitle}>Leave Type</h2>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Select Leave Type *</label>
                    <select
                      className={styles.select}
                      value={formData.leaveTypeId}
                      onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                      required
                    >
                      <option value="">-- Select a leave type --</option>
                      {leaveTypes.map((type) => {
                        const balance = getBalance(type._id);
                        return (
                          <option key={type._id} value={type._id}>
                            {type.code} - {type.name} {type.paid ? '(Paid)' : '(Unpaid)'} 
                            {balance ? ` | ${balance.remaining} days available` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedLeaveType && (
                    <div className={styles.leaveTypeInfo}>
                      <p className={styles.leaveTypeDescription}>
                        {selectedLeaveType.description || 'No description available'}
                      </p>
                      <div className={styles.leaveTypeMeta}>
                        <span className={selectedLeaveType.paid ? styles.paidBadge : styles.unpaidBadge}>
                          {selectedLeaveType.paid ? '💰 Paid Leave' : '📋 Unpaid Leave'}
                        </span>
                        {selectedLeaveType.requiresAttachment && (
                          <span className={styles.attachmentRequired}>
                            📎 Attachment Required ({selectedLeaveType.attachmentType || 'document'})
                          </span>
                        )}
                        {selectedLeaveType.maxDurationDays && (
                          <span className={styles.maxDuration}>
                            ⏱️ Max: {selectedLeaveType.maxDurationDays} days
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {currentBalance && (
                    <div className={styles.balanceInfo}>
                      <h4>Your Balance</h4>
                      <div className={styles.balanceStats}>
                        <div className={styles.balanceStat}>
                          <span className={styles.statValue}>{currentBalance.yearlyEntitlement}</span>
                          <span className={styles.statLabel}>Entitled</span>
                        </div>
                        <div className={styles.balanceStat}>
                          <span className={styles.statValue}>{currentBalance.taken}</span>
                          <span className={styles.statLabel}>Used</span>
                        </div>
                        <div className={styles.balanceStat}>
                          <span className={styles.statValue}>{currentBalance.pending}</span>
                          <span className={styles.statLabel}>Pending</span>
                        </div>
                        <div className={`${styles.balanceStat} ${styles.remaining}`}>
                          <span className={styles.statValue}>{currentBalance.remaining}</span>
                          <span className={styles.statLabel}>Remaining</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Selection */}
                <div className={styles.formSection}>
                  <h2 className={styles.sectionTitle}>Request Period</h2>
                  
                  <div className={styles.dateRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Start Date *</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={formData.dateFrom}
                        onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>End Date *</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={formData.dateTo}
                        onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                        min={formData.dateFrom}
                        required
                      />
                    </div>
                  </div>

                  {durationDays > 0 && (
                    <div className={styles.durationDisplay}>
                      <span className={styles.durationLabel}>Duration:</span>
                      <span className={styles.durationValue}>{durationDays} business day(s)</span>
                      {isPostLeave && (
                        <span className={styles.postLeaveBadge}>📋 Post-Leave Request</span>
                      )}
                    </div>
                  )}

                  {isPostLeave && (
                    <div className={styles.infoMessage}>
                      ℹ️ This is a post-leave request. You are submitting this request after the leave has already been taken. 
                      Please provide a justification explaining why the request was not submitted before or during the leave.
                    </div>
                  )}

                  {balanceWarning && (
                    <div className={styles.warningMessage}>{balanceWarning}</div>
                  )}

                  {overlapWarning && (
                    <div className={styles.warningMessage}>{overlapWarning}</div>
                  )}
                </div>

                {/* Justification & Attachment */}
                <div className={styles.formSection}>
                  <h2 className={styles.sectionTitle}>Additional Details</h2>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Reason / Justification {selectedLeaveType?.requiresAttachment ? '*' : '(Optional)'}
                    </label>
                    <textarea
                      className={styles.textarea}
                      value={formData.justification}
                      onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                      rows={4}
                      placeholder="Please provide a reason for your leave request..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Supporting Document {selectedLeaveType?.requiresAttachment ? '*' : '(Optional)'}
                    </label>
                    <div className={styles.fileUpload}>
                      <input
                        type="file"
                        id="attachment"
                        className={styles.fileInput}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="attachment" className={styles.fileLabel}>
                        {selectedFile ? (
                          <>
                            <span className={styles.fileName}>📄 {selectedFile.name}</span>
                            <span className={styles.fileSize}>
                              ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={styles.uploadIcon}>📎</span>
                            <span>Click to upload or drag and drop</span>
                            <span className={styles.fileHint}>PDF, DOC, DOCX, JPG, PNG (max 5MB)</span>
                          </>
                        )}
                      </label>
                    </div>
                    {selectedLeaveType?.requiresAttachment && (
                      <p className={styles.attachmentHint}>
                        A {selectedLeaveType.attachmentType || 'supporting document'} is required for {selectedLeaveType.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => router.push('/dashboard/employee/leaves')}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting || uploadingFile}
                >
                  {submitting ? 'Submitting...' : uploadingFile ? 'Uploading...' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
