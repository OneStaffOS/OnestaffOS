/**
 * JobOffersPage (Route: /job-offers)
 * Displays list of published job requisitions
 * Accessible to: unauthenticated users and users without roles
 * Features: Job listings with title, department, location, openings
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { axios } from '@/lib/axios-config';
import { useAuth } from '../context/AuthContext';
import Spinner from '@/app/components/Spinner';
import styles from './job-offers.module.css';

interface JobRequisition {
  _id: string;
  requisitionId: string;
  templateId: {
    title: string;
    department: string;
    description?: string;
    qualifications: string[];
    skills: string[];
  };
  openings: number;
  location: string;
  publishStatus: string;
  postingDate?: string;
  expiryDate?: string;
}

export default function JobOffersPage() {
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [backgroundCheckConsent, setBackgroundCheckConsent] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch published job requisitions from public endpoint
      const response = await axios.get('/recruitment/job-requisitions/published');
      
      setJobs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load job offers');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowConsentModal(true);
  };

  const handleConsentConfirm = () => {
    if (!dataProcessingConsent || !backgroundCheckConsent) {
      alert('You must accept both consent requirements to proceed with the application.');
      return;
    }
    setShowConsentModal(false);
    if (selectedJobId) {
      router.push(`/job-offers/${selectedJobId}/apply`);
    }
  };

  const handleConsentCancel = () => {
    setShowConsentModal(false);
    setSelectedJobId(null);
    setDataProcessingConsent(false);
    setBackgroundCheckConsent(false);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner fullScreen message="Loading job offers..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Job Opportunities</h1>
        <p>Join our team and build your career with us</p>
        <div className={styles.headerActions}>
          <button 
            onClick={() => router.push('/candidate-status')}
            className={styles.trackStatusBtn}
          >
            Track Application Status
          </button>
          {isAuthenticated && (
            <button 
              onClick={() => router.push('/dashboard/employee/inbox')}
              className={styles.notificationBtn}
            >
              📬 Notifications
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className={styles.noJobs}>
          <h2>No Open Positions</h2>
          <p>There are currently no job openings. Please check back later.</p>
        </div>
      ) : (
        <div className={styles.jobGrid}>
          {jobs.map((job) => (
            <div key={job._id} className={styles.jobCard}>
              <div className={styles.jobHeader}>
                <h2>{job.templateId?.title || 'Untitled Position'}</h2>
                <span className={styles.department}>
                  {job.templateId?.department || 'Various'}
                </span>
              </div>

              <div className={styles.jobDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>📍 Location:</span>
                  <span>{job.location || 'Not specified'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>👥 Openings:</span>
                  <span>{job.openings}</span>
                </div>
                {job.postingDate && (
                  <div className={styles.detailItem}>
                    <span className={styles.label}>📅 Posted:</span>
                    <span>{new Date(job.postingDate).toLocaleDateString()}</span>
                  </div>
                )}
                {job.expiryDate && (
                  <div className={styles.detailItem}>
                    <span className={styles.label}>⏰ Expires:</span>
                    <span>{new Date(job.expiryDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {job.templateId?.description && (
                <p className={styles.description}>{job.templateId.description}</p>
              )}

              {job.templateId?.skills && job.templateId.skills.length > 0 && (
                <div className={styles.skills}>
                  <strong>Required Skills:</strong>
                  <div className={styles.skillTags}>
                    {job.templateId.skills.slice(0, 5).map((skill, idx) => (
                      <span key={idx} className={styles.skillTag}>{skill}</span>
                    ))}
                    {job.templateId.skills.length > 5 && (
                      <span className={styles.skillTag}>+{job.templateId.skills.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.actions}>
                <button 
                  onClick={() => router.push(`/job-offers/${job._id}`)}
                  className={styles.viewBtn}
                >
                  View Details
                </button>
                <button 
                  onClick={() => handleApply(job._id)}
                  className={styles.applyBtn}
                >
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className={styles.modalOverlay} onClick={handleConsentCancel}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Application Consent</h2>
            <p className={styles.modalDescription}>
              Before proceeding with your application, please review and accept the following consents:
            </p>

            <div className={styles.consentSection}>
              <label className={styles.consentLabel}>
                <input
                  type="checkbox"
                  checked={dataProcessingConsent}
                  onChange={(e) => setDataProcessingConsent(e.target.checked)}
                />
                <div className={styles.consentText}>
                  <strong>Data Processing Consent</strong>
                  <p>
                    I consent to the processing of my personal data for recruitment purposes. 
                    I understand that my information will be used to evaluate my application 
                    and may be shared with relevant hiring managers and team members.
                  </p>
                </div>
              </label>

              <label className={styles.consentLabel}>
                <input
                  type="checkbox"
                  checked={backgroundCheckConsent}
                  onChange={(e) => setBackgroundCheckConsent(e.target.checked)}
                />
                <div className={styles.consentText}>
                  <strong>Background Check Consent</strong>
                  <p>
                    I consent to background verification checks, including but not limited to 
                    employment history, educational qualifications, and criminal record checks 
                    as part of the hiring process.
                  </p>
                </div>
              </label>
            </div>

            <div className={styles.modalActions}>
              <button 
                onClick={handleConsentConfirm} 
                className={styles.confirmBtn}
                disabled={!dataProcessingConsent || !backgroundCheckConsent}
              >
                Accept and Continue
              </button>
              <button onClick={handleConsentCancel} className={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
