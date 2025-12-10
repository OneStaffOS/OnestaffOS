'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios-config';
import { useAuth } from '../context/AuthContext';
import styles from './candidateStatus.module.css';
import { SystemRole } from '@/lib/roles';

interface Application {
  _id: string;
  candidateId: string;
  requisitionId: {
    _id: string;
    jobTitle: string;
    requisitionId: string;
    description?: string;
    department?: string;
  };
  currentStage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface StatusHistory {
  _id: string;
  applicationId: string;
  oldStage: string;
  newStage: string;
  oldStatus: string;
  newStatus: string;
  changedBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface Interview {
  _id: string;
  applicationId: string;
  stage: string;
  scheduledDate: string;
  method: string;
  videoLink?: string;
  status: string;
  candidateFeedback?: string;
}

interface Offer {
  _id: string;
  applicationId: string;
  candidateId: string;
  role: string;
  grossSalary: number;
  signingBonus?: number;
  benefits: string[];
  conditions?: string;
  insurances?: string;
  content: string;
  deadline: string;
  finalStatus: string;
  applicantResponse?: string;
  candidateSignedAt?: string;
  createdAt: string;
}

export default function CandidateStatusPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showOfferLetter, setShowOfferLetter] = useState(false);
  const [offerLetterContent, setOfferLetterContent] = useState<any>(null);
  const [signature, setSignature] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Auto-fetch applications for authenticated candidates
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && user) {
        const hasJobCandidateRole = user.roles?.includes(SystemRole.JOB_CANDIDATE);
        
        if (hasJobCandidateRole) {
          // Automatically fetch applications for authenticated candidates
          fetchMyApplications();
        } else {
          setError('Access denied. This page is only accessible to job candidates.');
        }
      } else {
        // Redirect to login if not authenticated
        router.push('/login?redirect=/candidate-status');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchMyApplications = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get('/recruitment/applications/my-applications');
      setApplications(response.data);
      if (response.data.length === 0) {
        setError('You have not submitted any applications yet. Visit our job offers page to apply.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch your applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async (applicationId: string) => {
    try {
      // Note: This endpoint requires HR role, so candidates won't be able to access it
      // In a real implementation, you might want a separate public endpoint
      const response = await axios.get(`/recruitment/applications/${applicationId}/history`);
      setStatusHistory(response.data);
    } catch (err: any) {
      console.error('Failed to fetch status history:', err);
      setStatusHistory([]);
    }
  };

  const fetchInterviews = async (applicationId: string) => {
    try {
      const response = await axios.get(`/recruitment/applications/${applicationId}/interviews`);
      setInterviews(response.data);
    } catch (err: any) {
      console.error('Failed to fetch interviews:', err);
      setInterviews([]);
    }
  };

  const viewOfferLetter = async () => {
    if (!offer) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/recruitment/offers/${offer._id}/letter`);
      setOfferLetterContent(response.data);
      setShowOfferLetter(true);
      setError('');
    } catch (err: any) {
      console.error('Error fetching offer letter:', err);
      setError(err.response?.data?.message || 'Failed to load offer letter');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOffer = async () => {
    if (!offer || !signature.trim()) {
      setError('Please provide your signature');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`/recruitment/offers/${offer._id}/sign`, {
        signature: signature,
        signedDate: new Date().toISOString(),
      });
      
      setSuccess('Offer letter signed successfully! Congratulations on your new position!');
      setShowSignatureModal(false);
      setSignature('');
      setAgreementChecked(false);
      
      // Refresh offer data
      if (selectedApplication) {
        await fetchOffer(selectedApplication._id);
        await fetchMyApplications();
      }
    } catch (err: any) {
      console.error('Error signing offer:', err);
      setError(err.response?.data?.message || 'Failed to sign offer');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffer = async (applicationId: string) => {
    try {
      // Get the candidate ID from the current user
      if (!user?.sub) {
        console.error('No user ID found');
        setOffer(null);
        return;
      }
      
      console.log('Fetching offers for candidate:', user.sub);
      // Fetch all offers for this candidate using the user's ID as candidateId
      const response = await axios.get(`/recruitment/candidates/${user.sub}/offers`);
      console.log('All offers received:', response.data);
      
      // Find the offer that matches this application
      // The applicationId in the offer might be an object with _id or a string
      const matchingOffer = response.data.find((offer: any) => {
        const offerAppId = typeof offer.applicationId === 'object' 
          ? offer.applicationId._id 
          : offer.applicationId;
        console.log('Comparing offerAppId:', offerAppId, 'with applicationId:', applicationId);
        return offerAppId === applicationId;
      });
      console.log('Matching offer found:', matchingOffer);
      setOffer(matchingOffer || null);
    } catch (err: any) {
      console.error('Failed to fetch offer:', err);
      setOffer(null);
    }
  };

  const handleApplicationSelect = async (application: Application) => {
    setSelectedApplication(application);
    setSuccess('');
    setError('');
    fetchStatusHistory(application._id);
    fetchInterviews(application._id);
    if (application.status.toLowerCase() === 'offer') {
      await fetchOffer(application._id);
    } else {
      setOffer(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return '#3b82f6'; // blue
      case 'in_process':
        return '#f59e0b'; // amber
      case 'offer':
        return '#10b981'; // green
      case 'hired':
        return '#059669'; // emerald
      case 'rejected':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleConfirmSlot = async (interviewId: string) => {
    setError('');
    setSuccess('');
    
    try {
      await axios.post(`/recruitment/interviews/${interviewId}/confirm`);
      setSuccess('Interview slot confirmed successfully! The HR team has been notified.');
      if (selectedApplication) {
        fetchInterviews(selectedApplication._id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm interview slot');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Application Status</h1>
        <p>View the status of your job applications</p>
      </div>

      {authLoading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading...</p>
        </div>
      )}

      {!authLoading && loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Fetching your applications...</p>
        </div>
      )}

      {!authLoading && !loading && error && (
        <div className={styles.searchSection}>
          <div className={styles.error}>{error}</div>
        </div>
      )}

      {applications.length > 0 && (
        <div className={styles.content}>
          <div className={styles.applicationsSection}>
            <h2>Your Applications</h2>
            <div className={styles.applicationsList}>
              {applications.map((app) => (
                <div
                  key={app._id}
                  className={`${styles.applicationCard} ${
                    selectedApplication?._id === app._id ? styles.selected : ''
                  }`}
                  onClick={() => handleApplicationSelect(app)}
                >
                  <div className={styles.cardHeader}>
                    <h3>{app.requisitionId.jobTitle}</h3>
                    <span 
                      className={styles.statusBadge}
                      style={{ backgroundColor: getStatusColor(app.status) }}
                    >
                      {formatStatus(app.status)}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.requisitionId}>
                      Job ID: {app.requisitionId.requisitionId}
                    </p>
                    <p className={styles.stage}>
                      Current Stage: {formatStage(app.currentStage)}
                    </p>
                    <p className={styles.date}>
                      Applied: {formatDate(app.createdAt)}
                    </p>
                    <p className={styles.date}>
                      Last Updated: {formatDate(app.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedApplication && (
            <div className={styles.detailsSection}>
              <h2>Application Details</h2>
              
              {success && <div className={styles.success}>{success}</div>}
              {error && <div className={styles.error}>{error}</div>}
              
              <div className={styles.detailsCard}>
                <div className={styles.jobInfo}>
                  <h3>{selectedApplication.requisitionId.jobTitle}</h3>
                  <p className={styles.jobId}>
                    Job ID: {selectedApplication.requisitionId.requisitionId}
                  </p>
                  {selectedApplication.requisitionId.description && (
                    <p className={styles.description}>
                      {selectedApplication.requisitionId.description}
                    </p>
                  )}
                </div>

                <div className={styles.statusInfo}>
                  <div className={styles.statusItem}>
                    <label>Current Status:</label>
                    <span 
                      className={styles.statusValue}
                      style={{ color: getStatusColor(selectedApplication.status) }}
                    >
                      {formatStatus(selectedApplication.status)}
                    </span>
                  </div>
                  <div className={styles.statusItem}>
                    <label>Current Stage:</label>
                    <span className={styles.statusValue}>
                      {formatStage(selectedApplication.currentStage)}
                    </span>
                  </div>
                  <div className={styles.statusItem}>
                    <label>Application Date:</label>
                    <span className={styles.statusValue}>
                      {formatDate(selectedApplication.createdAt)}
                    </span>
                  </div>
                  <div className={styles.statusItem}>
                    <label>Last Update:</label>
                    <span className={styles.statusValue}>
                      {formatDate(selectedApplication.updatedAt)}
                    </span>
                  </div>
                </div>

                {statusHistory.length > 0 && (
                  <div className={styles.historySection}>
                    <h4>Status History</h4>
                    <div className={styles.timeline}>
                      {statusHistory.map((history, index) => (
                        <div key={history._id} className={styles.timelineItem}>
                          <div className={styles.timelineDot}></div>
                          <div className={styles.timelineContent}>
                            <p className={styles.timelineDate}>
                              {formatDate(history.createdAt)}
                            </p>
                            <p className={styles.timelineChange}>
                              Status changed from <strong>{formatStatus(history.oldStatus)}</strong> to{' '}
                              <strong>{formatStatus(history.newStatus)}</strong>
                            </p>
                            <p className={styles.timelineStage}>
                              Stage: {formatStage(history.oldStage)} → {formatStage(history.newStage)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {interviews.length > 0 && selectedApplication.status === 'in_process' && (
                  <div className={styles.interviewSection}>
                    <h4>📅 Interview Time Slots</h4>
                    <p className={styles.interviewInstructions}>
                      Please select your preferred interview time slot:
                    </p>
                    <div className={styles.interviewSlots}>
                      {interviews
                        .filter(interview => interview.status === 'scheduled')
                        .map((interview) => {
                          const isConfirmed = interview.candidateFeedback === 'CONFIRMED';
                          return (
                            <div
                              key={interview._id}
                              className={`${styles.interviewSlot} ${isConfirmed ? styles.confirmedSlot : ''}`}
                            >
                              <div className={styles.slotInfo}>
                                <div className={styles.slotDateTime}>
                                  📆 {formatDateTime(interview.scheduledDate)}
                                </div>
                                <div className={styles.slotMethod}>
                                  Method: {interview.method.charAt(0).toUpperCase() + interview.method.slice(1)}
                                </div>
                                {interview.videoLink && (
                                  <div className={styles.slotLink}>
                                    <a href={interview.videoLink} target="_blank" rel="noopener noreferrer">
                                      🔗 Join Video Call
                                    </a>
                                  </div>
                                )}
                              </div>
                              {!isConfirmed ? (
                                <button
                                  onClick={() => handleConfirmSlot(interview._id)}
                                  className={styles.confirmSlotButton}
                                  disabled={interviews.some(i => i.candidateFeedback === 'CONFIRMED')}
                                >
                                  Select This Time
                                </button>
                              ) : (
                                <div className={styles.confirmedBadge}>
                                  ✓ Confirmed
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    {interviews.some(i => i.candidateFeedback === 'CONFIRMED') && (
                      <div className={styles.confirmedNotice}>
                        ✓ You have confirmed your interview slot. Please be available at the selected time.
                      </div>
                    )}
                  </div>
                )}

                {offer && selectedApplication.status.toLowerCase() === 'offer' && (
                  <div className={styles.offerSection}>
                    <h4>💼 Job Offer Details</h4>
                    <div className={styles.offerCard}>
                      <div className={styles.offerHeader}>
                        <h5>{offer.role}</h5>
                        <span className={styles.offerDeadline}>
                          Respond by: {formatDate(offer.deadline)}
                        </span>
                      </div>

                      <div className={styles.offerContent}>
                        <p className={styles.offerMessage}>{offer.content}</p>
                      </div>

                      <div className={styles.compensationSection}>
                        <h6>💰 Compensation Package</h6>
                        <div className={styles.compensationGrid}>
                          <div className={styles.compensationItem}>
                            <label>Annual Gross Salary:</label>
                            <span className={styles.salaryAmount}>
                              EGP{offer.grossSalary.toLocaleString()}
                            </span>
                          </div>
                          {offer.signingBonus && offer.signingBonus > 0 && (
                            <div className={styles.compensationItem}>
                              <label>Signing Bonus:</label>
                              <span className={styles.bonusAmount}>
                                EGP{offer.signingBonus.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {offer.benefits && offer.benefits.length > 0 && (
                        <div className={styles.benefitsSection}>
                          <h6>🎁 Benefits Package</h6>
                          <ul className={styles.benefitsList}>
                            {offer.benefits.map((benefit, index) => (
                              <li key={index}>{benefit}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {offer.insurances && (
                        <div className={styles.insuranceSection}>
                          <h6>🏥 Insurance Coverage</h6>
                          <p>{offer.insurances}</p>
                        </div>
                      )}

                      {offer.conditions && (
                        <div className={styles.conditionsSection}>
                          <h6>📋 Terms & Conditions</h6>
                          <p>{offer.conditions}</p>
                        </div>
                      )}

                      {offer.applicantResponse && offer.applicantResponse.toUpperCase() !== 'PENDING' ? (
                        <div className={styles.responseStatus}>
                          <p>
                            <strong>Your Response:</strong>{' '}
                            <span className={offer.applicantResponse.toUpperCase() === 'ACCEPTED' ? styles.accepted : styles.rejected}>
                              {offer.applicantResponse.toUpperCase()}
                            </span>
                          </p>
                          {offer.applicantResponse.toUpperCase() === 'ACCEPTED' && offer.candidateSignedAt && (
                            <p className={styles.signedNote}>
                              ✓ Signed on {formatDate(offer.candidateSignedAt)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className={styles.offerActions}>
                          <button 
                            className={styles.viewLetterBtn}
                            onClick={viewOfferLetter}
                            disabled={loading}
                          >
                            📄 View Offer Letter
                          </button>
                          <button 
                            className={styles.signOfferBtn}
                            onClick={() => setShowSignatureModal(true)}
                            disabled={loading}
                          >
                            ✍️ Sign Offer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offer Letter Modal */}
      {showOfferLetter && offerLetterContent && (
        <div className={styles.modalOverlay} onClick={() => setShowOfferLetter(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>📄 Offer Letter</h3>
              <button className={styles.closeBtn} onClick={() => setShowOfferLetter(false)}>×</button>
            </div>
            <div className={styles.letterContent}>
              <pre>{offerLetterContent.content}</pre>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.closeModalBtn} onClick={() => setShowOfferLetter(false)}>
                Close
              </button>
              <button 
                className={styles.signFromLetterBtn} 
                onClick={() => {
                  setShowOfferLetter(false);
                  setShowSignatureModal(true);
                }}
              >
                ✍️ Sign Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSignatureModal(false)}>
          <div className={styles.signatureModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>✍️ Sign Offer Letter</h3>
              <button className={styles.closeBtn} onClick={() => setShowSignatureModal(false)}>×</button>
            </div>
            <div className={styles.signatureContent}>
              <p className={styles.signatureInstructions}>
                By signing below, you accept the offer for <strong>{offer?.role}</strong> with all terms and conditions as stated in the offer letter.
              </p>
              <div className={styles.signatureInputSection}>
                <label htmlFor="signature">Your Full Name (Signature):</label>
                <input
                  id="signature"
                  type="text"
                  className={styles.signatureInput}
                  placeholder="Type your full name"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  autoFocus
                />
                <p className={styles.signatureNote}>
                  Date: {new Date().toLocaleDateString()} | IP Address will be recorded for verification
                </p>
              </div>
              <div className={styles.signatureAgreement}>
                <input type="checkbox" id="agree" required />
                <label htmlFor="agree">
                  I confirm that I have read and understood all terms and conditions of this offer, and I accept this position.
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => {
                  setShowSignatureModal(false);
                  setSignature('');
                }}
              >
                Cancel
              </button>
              <button 
                className={styles.signBtn} 
                onClick={handleSignOffer}
                disabled={loading || !signature.trim()}
              >
                {loading ? 'Signing...' : '✓ Sign and Accept Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Letter Modal */}
      {showOfferLetter && offerLetterContent && (
        <div className={styles.modalOverlay} onClick={() => setShowOfferLetter(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>📄 Offer Letter</h3>
              <button className={styles.closeBtn} onClick={() => setShowOfferLetter(false)}>×</button>
            </div>
            <div className={styles.letterContent}>
              <pre>{offerLetterContent.content}</pre>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.closeModalBtn} onClick={() => setShowOfferLetter(false)}>
                Close
              </button>
              <button 
                className={styles.signFromLetterBtn} 
                onClick={() => {
                  setShowOfferLetter(false);
                  setShowSignatureModal(true);
                }}
              >
                ✍️ Sign Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSignatureModal(false)}>
          <div className={styles.signatureModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>✍️ Sign Offer Letter</h3>
              <button className={styles.closeBtn} onClick={() => setShowSignatureModal(false)}>×</button>
            </div>
            <div className={styles.signatureContent}>
              <p className={styles.signatureInstructions}>
                By signing below, you accept the offer for <strong>{offer?.role}</strong> with all terms and conditions as stated in the offer letter.
              </p>
              <div className={styles.signatureInputSection}>
                <label htmlFor="signature">Your Full Name (Signature):</label>
                <input
                  id="signature"
                  type="text"
                  className={styles.signatureInput}
                  placeholder="Type your full name"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  autoFocus
                />
                <p className={styles.signatureNote}>
                  Date: {new Date().toLocaleDateString()} | IP Address will be recorded for verification
                </p>
              </div>
              <div className={styles.signatureAgreement}>
                <input 
                  type="checkbox" 
                  id="agree" 
                  checked={agreementChecked}
                  onChange={(e) => setAgreementChecked(e.target.checked)}
                />
                <label htmlFor="agree">
                  I confirm that I have read and understood all terms and conditions of this offer, and I accept this position.
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => {
                  setShowSignatureModal(false);
                  setSignature('');
                  setAgreementChecked(false);
                }}
              >
                Cancel
              </button>
              <button 
                className={styles.signBtn} 
                onClick={handleSignOffer}
                disabled={loading || !signature.trim() || !agreementChecked}
              >
                {loading ? 'Signing...' : '✓ Sign and Accept Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedApplication && (
        <div className={styles.statusExplanation}>
          <h4>What does this status mean?</h4>
          {selectedApplication.status === 'submitted' && (
            <p>Your application has been received and is awaiting initial review by our recruitment team.</p>
          )}
          {selectedApplication.status === 'in_process' && (
            <p>Your application is being actively reviewed. You may be contacted soon for the next steps in the hiring process.</p>
          )}
          {selectedApplication.status === 'offer' && (
            <p>Congratulations! We have extended an offer for this position. Please check your email for details and next steps.</p>
          )}
          {selectedApplication.status === 'hired' && (
            <p>Welcome aboard! You have been hired. Our HR team will be in touch with onboarding information.</p>
          )}
          {selectedApplication.status === 'rejected' && (
            <p>Thank you for your interest. After careful consideration, we have decided to move forward with other candidates at this time.</p>
          )}
        </div>
      )}

      {!authLoading && !loading && !error && applications.length === 0 && (
        <div className={styles.emptyState}>
          <p>You haven't submitted any applications yet. Visit our job offers page to apply.</p>
        </div>
      )}
    </div>
  );
}
