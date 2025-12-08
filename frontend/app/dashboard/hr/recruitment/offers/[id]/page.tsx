'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './offer-detail.module.css';

interface Offer {
  _id: string;
  role: string;
  grossSalary: number;
  signingBonus?: number;
  benefits?: string[];
  conditions?: string;
  insurances?: string;
  content: string;
  deadline: string;
  applicantResponse: 'pending' | 'accepted' | 'declined';
  finalStatus: 'pending' | 'approved' | 'rejected';
  candidateId: {
    _id: string;
    firstName: string;
    lastName: string;
    personalEmail: string;
    mobilePhone?: string;
  };
  hrEmployeeId: {
    firstName: string;
    lastName: string;
    email: string;
  };
  approvers: Array<{
    employeeId: { firstName: string; lastName: string; email: string };
    role: string;
    status: string;
    actionDate: string;
    comment?: string;
  }>;
  createdAt: string;
}

export default function OfferDetailPage() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'rejected'>('approved');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const offerId = params.id as string;

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/recruitment/offers/${offerId}`);
      setOffer(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load offer');
      console.error('Error fetching offer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!offer) return;

    try {
      setSubmitting(true);
      await axios.post(`/recruitment/offers/${offerId}/approve`, {
        status: approvalStatus,
        comment: comment.trim() || undefined,
      });

      alert(`Offer ${approvalStatus} successfully!`);
      fetchOffer(); // Refresh
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${approvalStatus} offer`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner message="Loading offer details..." />
      </div>
    );
  }

  if (!offer || error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Offer not found'}</div>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back to Offers
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles_map: any = {
      'pending': styles.statusPending,
      'approved': styles.statusApproved,
      'rejected': styles.statusRejected,
    };
    return styles_map[status] || styles.statusPending;
  };

  const getResponseBadge = (response: string) => {
    const styles_map: any = {
      'pending': styles.responsePending,
      'accepted': styles.responseAccepted,
      'declined': styles.responseDeclined,
    };
    return styles_map[response] || styles.responsePending;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back to Offers
        </button>
        <div className={styles.headerBadges}>
          <span className={`${styles.badge} ${getStatusBadge(offer.finalStatus)}`}>
            Approval: {offer.finalStatus}
          </span>
          <span className={`${styles.badge} ${getResponseBadge(offer.applicantResponse)}`}>
            Response: {offer.applicantResponse}
          </span>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Offer Details Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Offer Details</h2>
          
          <div className={styles.section}>
            <h3>Position</h3>
            <p className={styles.role}>{offer.role}</p>
          </div>

          <div className={styles.section}>
            <h3>Candidate Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Name:</span>
                <span className={styles.infoValue}>
                  {offer.candidateId.firstName} {offer.candidateId.lastName}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email:</span>
                <span className={styles.infoValue}>{offer.candidateId.personalEmail}</span>
              </div>
              {offer.candidateId.mobilePhone && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Phone:</span>
                  <span className={styles.infoValue}>{offer.candidateId.mobilePhone}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h3>Compensation</h3>
            <div className={styles.compensationGrid}>
              <div className={styles.compensationItem}>
                <span className={styles.compensationLabel}>Gross Salary</span>
                <span className={styles.compensationValue}>
                  ${offer.grossSalary.toLocaleString()} / year
                </span>
              </div>
              {offer.signingBonus && (
                <div className={styles.compensationItem}>
                  <span className={styles.compensationLabel}>Signing Bonus</span>
                  <span className={styles.compensationValue}>
                    ${offer.signingBonus.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {offer.benefits && offer.benefits.length > 0 && (
            <div className={styles.section}>
              <h3>Benefits</h3>
              <ul className={styles.benefitsList}>
                {offer.benefits.map((benefit, idx) => (
                  <li key={idx}>{benefit}</li>
                ))}
              </ul>
            </div>
          )}

          {offer.insurances && (
            <div className={styles.section}>
              <h3>Insurance Coverage</h3>
              <p>{offer.insurances}</p>
            </div>
          )}

          {offer.conditions && (
            <div className={styles.section}>
              <h3>Terms & Conditions</h3>
              <p className={styles.conditions}>{offer.conditions}</p>
            </div>
          )}

          <div className={styles.section}>
            <h3>Offer Content</h3>
            <div className={styles.content}>{offer.content}</div>
          </div>

          <div className={styles.section}>
            <h3>Important Dates</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Created:</span>
                <span className={styles.infoValue}>
                  {new Date(offer.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Deadline:</span>
                <span className={styles.infoValue}>
                  {new Date(offer.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Created By</h3>
            <p>
              {offer.hrEmployeeId.firstName} {offer.hrEmployeeId.lastName} ({offer.hrEmployeeId.email})
            </p>
          </div>
        </div>

        {/* Approval Workflow Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Approval Workflow</h2>

          {offer.approvers && offer.approvers.length > 0 ? (
            <div className={styles.approversList}>
              {offer.approvers.map((approver, idx) => (
                <div key={idx} className={styles.approverItem}>
                  <div className={styles.approverHeader}>
                    <div>
                      <div className={styles.approverName}>
                        {approver.employeeId.firstName} {approver.employeeId.lastName}
                      </div>
                      <div className={styles.approverRole}>{approver.role}</div>
                    </div>
                    <span className={`${styles.badge} ${getStatusBadge(approver.status)}`}>
                      {approver.status}
                    </span>
                  </div>
                  {approver.comment && (
                    <div className={styles.approverComment}>
                      <strong>Comment:</strong> {approver.comment}
                    </div>
                  )}
                  <div className={styles.approverDate}>
                    {new Date(approver.actionDate).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noApprovers}>No approval actions yet</p>
          )}

          {/* Approval Actions */}
          {offer.finalStatus === 'pending' && (
            <div className={styles.approvalActions}>
              <h3>Provide Your Approval</h3>
              
              <div className={styles.approvalOptions}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="approvalStatus"
                    value="approved"
                    checked={approvalStatus === 'approved'}
                    onChange={() => setApprovalStatus('approved')}
                  />
                  <span>Approve</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="approvalStatus"
                    value="rejected"
                    checked={approvalStatus === 'rejected'}
                    onChange={() => setApprovalStatus('rejected')}
                  />
                  <span>Reject</span>
                </label>
              </div>

              <textarea
                placeholder="Add a comment (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={styles.commentTextarea}
                rows={4}
              />

              <button
                onClick={handleApprove}
                disabled={submitting}
                className={styles.submitButton}
              >
                {submitting ? 'Submitting...' : `${approvalStatus === 'approved' ? 'Approve' : 'Reject'} Offer`}
              </button>
            </div>
          )}

          {offer.finalStatus !== 'pending' && (
            <div className={styles.finalStatusMessage}>
              <p>
                ✓ This offer has been <strong>{offer.finalStatus}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
