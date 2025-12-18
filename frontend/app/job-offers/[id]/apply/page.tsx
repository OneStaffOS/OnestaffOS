'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './apply.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface JobRequisition {
  _id: string;
  requisitionId: string;
  openings: number;
  location: string;
  postingDate: string;
  expiryDate?: string;
  publishStatus: string;
  templateId: {
    _id: string;
    title: string;
    department: string;
    description: string;
    qualifications: string[];
    skills: string[];
  };
}

export default function ApplyPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get(`/recruitment/job-requisitions/published`);
      const jobs = response.data;
      const selectedJob = jobs.find((j: JobRequisition) => j._id === jobId);
      if (selectedJob) {
        setJob(selectedJob);
      } else {
        setError('Job not found');
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, or DOCX file');
      setCvFile(null);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      setCvFile(null);
      return;
    }

    setCvFile(file);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cvFile) {
      setError('Please upload your CV');
      return;
    }

    try {
      setSubmitting(true);

      // Get candidateId from user profile
      const profileResponse = await axios.get('/auth/me');
      const candidateId = profileResponse.data.user?.sub;

      if (!candidateId) {
        throw new Error('Could not get candidate ID');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('cv', cvFile, cvFile.name);
      formData.append('candidateId', candidateId);
      formData.append('requisitionId', jobId);
      formData.append('dataProcessingConsent', 'true');
      formData.append('backgroundCheckConsent', 'true');
      if (coverLetter.trim()) {
        formData.append('coverLetter', coverLetter.trim());
      }

      // Submit application - let axios interceptor handle Content-Type
      const response = await axios.post('/recruitment/applications', formData);

      setSuccess(true);
      setTimeout(() => router.push('/job-offers'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner message="Loading job details..." />
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Job not found'}</div>
        <button onClick={() => router.push('/job-offers')} className={styles.backButton}>
          Back to Job Offers
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2>Application Submitted Successfully!</h2>
          <p>Thank you for your interest. We will review your application and get back to you soon.</p>
          <p className={styles.redirectText}>Redirecting to job offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back to Job Offers
        </button>

        <div className={styles.jobCard}>
          <h1 className={styles.jobTitle}>{job.templateId.title}</h1>
          <div className={styles.jobMeta}>
            <span className={styles.metaItem}>📍 {job.location}</span>
            <span className={styles.metaItem}>🏢 {job.templateId.department}</span>
            <span className={styles.metaItem}>👥 {job.openings} openings</span>
          </div>

          <div className={styles.jobDescription}>
            <h3>Job Description</h3>
            <p>{job.templateId.description}</p>
          </div>

          <div className={styles.jobDetails}>
            <div className={styles.detailSection}>
              <h3>Qualifications</h3>
              <ul>
                {job.templateId.qualifications.map((qual, index) => (
                  <li key={index}>{qual}</li>
                ))}
              </ul>
            </div>

            <div className={styles.detailSection}>
              <h3>Required Skills</h3>
              <ul>
                {job.templateId.skills.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.applicationForm}>
          <h2>Submit Your Application</h2>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="cv" className={styles.label}>
              Upload CV <span className={styles.required}>*</span>
            </label>
            <p className={styles.hint}>Accepted formats: PDF, DOC, DOCX (Max 5MB)</p>
            <input
              type="file"
              id="cv"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className={styles.fileInput}
              required
            />
            {cvFile && (
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>📄 {cvFile.name}</span>
                <span className={styles.fileSize}>
                  ({(cvFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="coverLetter" className={styles.label}>
              Cover Letter <span className={styles.optional}>(Optional)</span>
            </label>
            <textarea
              id="coverLetter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell us why you're a great fit for this role..."
              className={styles.textarea}
              rows={8}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !cvFile}
            className={styles.submitButton}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
