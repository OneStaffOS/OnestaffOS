"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Spinner from '@/app/components/Spinner';
import axiosInstance from '@/lib/axios-config';
import styles from './edit.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface LeaveType {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isPaid: boolean;
  requiresAttachment: boolean;
  maxDurationDays?: number;
}

interface LeaveBalance {
  leaveTypeId: string | { _id: string; code: string; name: string };
  yearlyEntitlement: number;
  taken: number;
  pending: number;
  remaining: number;
}

interface LeaveRequest {
  _id: string;
  employeeId: string | { _id: string };
  leaveTypeId: string | { _id: string; code: string; name: string; isPaid?: boolean; requiresAttachment?: boolean; maxDurationDays?: number };
  dates: { from: string; to: string };
  durationDays: number;
  justification?: string;
  attachmentId?: string | { _id: string; originalName: string };
  status: string;
}

export default function EditLeaveRequestPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [justification, setJustification] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<{ _id: string; originalName: string } | null>(null);

  const [calculatedDays, setCalculatedDays] = useState(0);
  const [balanceWarning, setBalanceWarning] = useState('');

  // Calculate business days between two dates
  const calculateBusinessDays = useCallback((start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get logged in user's profile
        const profileRes = await axiosInstance.get('/employee-profile/my-profile');
        const empId = profileRes.data._id;
        setEmployeeId(empId);

        // Fetch the leave request
        const requestRes = await axiosInstance.get(`/leaves/requests/${requestId}`);
        const request = requestRes.data;

        // Check if this request belongs to the logged-in user
        const requestEmployeeId = typeof request.employeeId === 'object' ? request.employeeId._id : request.employeeId;
        if (requestEmployeeId !== empId) {
          setError('You do not have permission to edit this request.');
          setLoading(false);
          return;
        }

        // Check if request is still pending
        if (request.status !== 'pending') {
          setError('Only pending requests can be edited.');
          setLoading(false);
          return;
        }

        setLeaveRequest(request);
        setDateFrom(request.dates?.from?.split('T')[0] || '');
        setDateTo(request.dates?.to?.split('T')[0] || '');
        setJustification(request.justification || '');
        setCalculatedDays(request.durationDays);

        if (request.attachmentId && typeof request.attachmentId === 'object') {
          setExistingAttachment(request.attachmentId);
        }

        // Fetch leave types and balances
        const [typesRes, balancesRes] = await Promise.all([
          axiosInstance.get('/leaves/types'),
          axiosInstance.get(`/leaves/balances/employee/${empId}`)
        ]);

        setLeaveTypes(typesRes.data);
        setBalances(balancesRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load leave request. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requestId]);

  // Calculate days when dates change
  useEffect(() => {
    if (dateFrom && dateTo) {
      const days = calculateBusinessDays(dateFrom, dateTo);
      setCalculatedDays(days);

      // Check balance
      if (leaveRequest) {
        const leaveTypeId = typeof leaveRequest.leaveTypeId === 'object' 
          ? leaveRequest.leaveTypeId._id 
          : leaveRequest.leaveTypeId;

        const balance = balances.find(b => {
          const balanceTypeId = typeof b.leaveTypeId === 'object' ? b.leaveTypeId._id : b.leaveTypeId;
          return balanceTypeId === leaveTypeId;
        });

        if (balance) {
          // When editing, we need to add back the original days to remaining
          const originalDays = leaveRequest.durationDays;
          const availableAfterEdit = balance.remaining + originalDays;
          
          if (days > availableAfterEdit) {
            setBalanceWarning(`Warning: This request exceeds your available balance by ${(days - availableAfterEdit).toFixed(1)} days.`);
          } else {
            setBalanceWarning('');
          }
        }
      }
    }
  }, [dateFrom, dateTo, calculateBusinessDays, balances, leaveRequest]);

  const getLeaveTypeDetails = () => {
    if (!leaveRequest) return null;
    
    if (typeof leaveRequest.leaveTypeId === 'object') {
      return leaveRequest.leaveTypeId;
    }
    
    return leaveTypes.find(t => t._id === leaveRequest.leaveTypeId);
  };

  const getBalance = () => {
    if (!leaveRequest) return null;
    
    const leaveTypeId = typeof leaveRequest.leaveTypeId === 'object' 
      ? leaveRequest.leaveTypeId._id 
      : leaveRequest.leaveTypeId;

    const balance = balances.find(b => {
      const balanceTypeId = typeof b.leaveTypeId === 'object' ? b.leaveTypeId._id : b.leaveTypeId;
      return balanceTypeId === leaveTypeId;
    });

    return balance;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setAttachmentFile(file);
      setExistingAttachment(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Validate dates
      if (new Date(dateFrom) > new Date(dateTo)) {
        setError('End date must be after start date');
        setSubmitting(false);
        return;
      }

      if (calculatedDays <= 0) {
        setError('Leave duration must be at least 1 day');
        setSubmitting(false);
        return;
      }

      const leaveType = getLeaveTypeDetails();

      // Handle file upload if new file selected
      let attachmentId = existingAttachment?._id || undefined;
      if (attachmentFile) {
        // Upload file to GridFS endpoint
        const formDataUpload = new FormData();
        formDataUpload.append('file', attachmentFile);
        
        const uploadRes = await axiosInstance.post('/leaves/attachments/upload', formDataUpload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        attachmentId = uploadRes.data._id;
      }

      // Check if attachment is required but not provided
      if (leaveType?.requiresAttachment && !attachmentId) {
        setError('This leave type requires an attachment');
        setSubmitting(false);
        return;
      }

      // Submit update
      const updateData: Record<string, unknown> = {
        dateFrom,
        dateTo,
        durationDays: calculatedDays,
        justification: justification || undefined
      };

      if (attachmentId) {
        updateData.attachmentId = attachmentId;
      }

      await axiosInstance.put(`/leaves/requests/${requestId}`, updateData);

      setSuccess('Leave request updated successfully!');
      setTimeout(() => {
        router.push('/dashboard/employee/leaves');
      }, 1500);
    } catch (err) {
      console.error('Error updating request:', err);
      setError('Failed to update leave request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner fullScreen message="Loading leave request..." />;
  }

  if (!leaveRequest) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>{error || 'Leave request not found'}</div>
        <button className={styles.backButton} onClick={() => router.push('/dashboard/employee/leaves')}>
          ← Back to My Leaves
        </button>
      </div>
    );
  }

  const leaveType = getLeaveTypeDetails();
  const balance = getBalance();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Edit Leave Request</h1>
          <p className={styles.subtitle}>
            Modify your pending {leaveType?.name || 'leave'} request
          </p>
        </div>
        <button className={styles.backButton} onClick={() => router.push('/dashboard/employee/leaves')}>
          ← Back
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* Leave Type Info (Read-only) */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Leave Type</h3>
            <div className={styles.leaveTypeDisplay}>
              <span className={styles.leaveTypeName}>{leaveType?.name || 'Unknown'}</span>
              <div className={styles.leaveTypeMeta}>
                {leaveType?.isPaid !== undefined && (
                  <span className={leaveType.isPaid ? styles.paidBadge : styles.unpaidBadge}>
                    {leaveType.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                )}
                {leaveType?.requiresAttachment && (
                  <span className={styles.attachmentRequired}>Attachment Required</span>
                )}
                {leaveType?.maxDurationDays && (
                  <span className={styles.maxDuration}>Max {leaveType.maxDurationDays} days</span>
                )}
              </div>
            </div>

            {balance && (
              <div className={styles.balanceInfo}>
                <h4>Your Balance</h4>
                <div className={styles.balanceStats}>
                  <div className={styles.balanceStat}>
                    <span className={styles.statValue}>{balance.yearlyEntitlement}</span>
                    <span className={styles.statLabel}>Total</span>
                  </div>
                  <div className={styles.balanceStat}>
                    <span className={styles.statValue}>{balance.taken}</span>
                    <span className={styles.statLabel}>Taken</span>
                  </div>
                  <div className={styles.balanceStat}>
                    <span className={styles.statValue}>{balance.pending - leaveRequest.durationDays}</span>
                    <span className={styles.statLabel}>Other Pending</span>
                  </div>
                  <div className={`${styles.balanceStat} ${styles.remaining}`}>
                    <span className={styles.statValue}>{balance.remaining + leaveRequest.durationDays}</span>
                    <span className={styles.statLabel}>Available</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Leave Dates</h3>
            <div className={styles.dateRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Start Date *</label>
                <input
                  type="date" className={styles.input}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>End Date *</label>
                <input
                  type="date" className={styles.input}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
            {calculatedDays > 0 && (
              <div className={styles.durationDisplay}>
                <span className={styles.durationLabel}>Duration:</span>
                <span className={styles.durationValue}>{calculatedDays} business day{calculatedDays !== 1 ? 's' : ''}</span>
              </div>
            )}
            {balanceWarning && (
              <div className={styles.warningMessage}>{balanceWarning}</div>
            )}
          </div>

          {/* Justification */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Justification</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Reason for Leave {leaveType?.requiresAttachment ? '*' : '(Optional)'}
              </label>
              <textarea
                className={styles.textarea}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Please provide details about your leave request..." rows={4}
                required={leaveType?.requiresAttachment}
              />
            </div>
          </div>

          {/* Attachment */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>
              Supporting Document {leaveType?.requiresAttachment ? '*' : '(Optional)'}
            </h3>
            <div className={styles.formGroup}>
              <div className={styles.fileUpload}>
                <input
                  type="file" id="attachment" className={styles.fileInput}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <label htmlFor="attachment" className={styles.fileLabel}>
                  <span className={styles.uploadIcon}></span>
                  {attachmentFile ? (
                    <>
                      <span className={styles.fileName}>{attachmentFile.name}</span>
                      <span className={styles.fileSize}>({(attachmentFile.size / 1024).toFixed(1)} KB)</span>
                    </>
                  ) : existingAttachment ? (
                    <>
                      <span className={styles.fileName}>Current: {existingAttachment.originalName}</span>
                      <span className={styles.fileHint}>Click to replace</span>
                    </>
                  ) : (
                    <>
                      <span>Click to upload or drag and drop</span>
                      <span className={styles.fileHint}>PDF, DOC, DOCX, JPG, PNG (max 5MB)</span>
                    </>
                  )}
                </label>
              </div>
              {leaveType?.requiresAttachment && !existingAttachment && !attachmentFile && (
                <p className={styles.attachmentHint}>
                  This leave type requires supporting documentation
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button 
            type="button" className={styles.cancelButton}
            onClick={() => router.push('/dashboard/employee/leaves')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="submit" className={styles.submitButton}
            disabled={submitting || calculatedDays <= 0}
          >
            {submitting ? 'Updating...' : 'Update Request'}
          </button>
        </div>
      </form>
    </div>
  );
}