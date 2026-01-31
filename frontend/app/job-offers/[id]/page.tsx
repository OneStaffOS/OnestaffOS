/**
 * Job Offer Detail Page (Route: /job-offers/[id])
 * Displays detailed information about a specific job offer
 * Features: Full job description, qualifications, skills, apply button
 */

"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { axios } from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './job-detail.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
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

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get('/recruitment/job-requisitions/published');
      const jobs = response.data;
      const selectedJob = jobs.find((j: JobRequisition) => j._id === jobId);
      
      if (selectedJob) {
        setJob(selectedJob);
      } else {
        setError('Job offer not found');
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    router.push(`/job-offers/${jobId}/apply`);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <h2>⚠️ Error</h2>
          <p>{error || 'Job offer not found'}</p>
          <button onClick={() => router.push('/job-offers')} className={styles.backButton}>
            ← Back to Job Offers
          </button>
        </div>
      </div>
    );
  }

  const isExpired = job.expiryDate && new Date(job.expiryDate) < new Date();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.push('/job-offers')} className={styles.backButton}>
          ← Back to Job Offers
        </button>
      </div>

      <div className={styles.jobCard}>
        <div className={styles.jobHeader}>
          <div>
            <h1 className={styles.jobTitle}>{job.templateId.title}</h1>
            <div className={styles.jobMeta}>
              <span className={styles.department}>🏢 {job.templateId.department}</span>
              <span className={styles.location}>📍 {job.location}</span>
              <span className={styles.openings}>👥 {job.openings} opening{job.openings !== 1 ? 's' : ''}</span>
            </div>
          </div>
          {!isExpired && (
            <button onClick={handleApply} className={styles.applyButton}>
              Apply Now
            </button>
          )}
          {isExpired && (
            <div className={styles.expiredBadge}>
              ⏰ Expired
            </div>
          )}
        </div>

        {job.postingDate && (
          <div className={styles.dates}>
            <p>
              <strong>Posted:</strong> {new Date(job.postingDate).toLocaleDateString()}
            </p>
            {job.expiryDate && (
              <p>
                <strong>Expires:</strong> {new Date(job.expiryDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {job.templateId.description && (
          <div className={styles.section}>
            <h2>Job Description</h2>
            <p className={styles.description}>{job.templateId.description}</p>
          </div>
        )}

        {job.templateId.qualifications && job.templateId.qualifications.length > 0 && (
          <div className={styles.section}>
            <h2>Qualifications</h2>
            <ul className={styles.list}>
              {job.templateId.qualifications.map((qual, index) => (
                <li key={index}>{qual}</li>
              ))}
            </ul>
          </div>
        )}

        {job.templateId.skills && job.templateId.skills.length > 0 && (
          <div className={styles.section}>
            <h2>Required Skills</h2>
            <div className={styles.skills}>
              {job.templateId.skills.map((skill, index) => (
                <span key={index} className={styles.skillBadge}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {!isExpired && (
          <div className={styles.footer}>
            <button onClick={handleApply} className={styles.applyButtonLarge}>
              Apply for this Position →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}