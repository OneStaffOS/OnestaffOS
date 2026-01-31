/**
 * Employee ID Card Page (Route: /dashboard/employee/id-card)
 * Displays employee ID card or request interface
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './idCard.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface EmployeeProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: { name: string };
  position?: { title: string };
  employeeId?: string;
  profilePictureUrl?: string;
}

interface AccessCard {
  cardNumber: string;
  issuedDate: string;
  expiryDate: string;
  status: 'pending' | 'requested' | 'active' | 'suspended' | 'expired';
}

export default function EmployeeIDCardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [cardInfo, setCardInfo] = useState<AccessCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string>('');

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);

      // Fetch employee profile
      const profileRes = await axios.get('/employee-profile/my-profile');
      setProfile(profileRes.data);

      // Try to fetch onboarding checklist to get access card info
      try {
        const onboardingRes = await axios.get(`/recruitment/onboarding/employee/${profileRes.data._id}`);
        if (onboardingRes.data?._id) {
          // Fetch access card info
          try {
            const cardRes = await axios.get(`/recruitment/onboarding/${onboardingRes.data._id}/access-card`);
            if (cardRes.data?.cardNumber) {
              setCardInfo(cardRes.data);
            }
          } catch (err) {
            console.log('No access card info found');
          }
        }
      } catch (err) {
        console.log('No onboarding checklist found');
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestIDCard = async () => {
    if (!confirm('Submit a request for an employee ID card?')) return;

    try {
      setRequesting(true);
      // In a real system, this would create a request to HR
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRequestStatus('requested');
    } catch (error) {
      console.error('Failed to request ID card:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: '#10b981',
      requested: '#f59e0b',
      pending: '#6b7280',
      suspended: '#ef4444',
      expired: '#dc2626',
    };
    return (
      <span style={{
        padding: '0.375rem 0.75rem',
        background: colors[status] || '#6b7280',
        color: 'white',
        borderRadius: '6px',
        fontSize: '0.875rem',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    );
  };

  const getInitials = () => {
    if (!profile) return 'EM';
    return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
        <DashboardLayout title="My ID Card" role="Employee">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}>
      <DashboardLayout title="My ID Card" role="Employee">
        <button
          onClick={() => router.back()}
          style={{
            marginBottom: '1.5rem',
            padding: '0.5rem 1rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back to Dashboard
        </button>

        <div className={styles.container}>
          {cardInfo?.cardNumber ? (
            <>
              {/* ID Card Display */}
              <div className={styles.cardWrapper}>
                <div className={styles.idCard}>
                  {/* Company Header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.logo}>OneStaff OS</div>
                    <div className={styles.cardType}>EMPLOYEE ID</div>
                  </div>

                  {/* Employee Photo */}
                  <div className={styles.photoSection}>
                    {profile?.profilePictureUrl ? (
                      <img 
                        src={profile.profilePictureUrl} 
                        alt="Employee" className={styles.photo}
                      />
                    ) : (
                      <div className={styles.photoPlaceholder}>
                        {getInitials()}
                      </div>
                    )}
                  </div>

                  {/* Employee Details */}
                  <div className={styles.detailsSection}>
                    <div className={styles.employeeName}>
                      {profile?.firstName} {profile?.lastName}
                    </div>
                    <div className={styles.employeeId}>
                      ID: {profile?.employeeId || 'N/A'}
                    </div>
                    <div className={styles.department}>
                      {profile?.department?.name || 'Department'}
                    </div>
                    <div className={styles.position}>
                      {profile?.position?.title || 'Position'}
                    </div>
                    <div className={styles.email}>
                      {profile?.email}
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className={styles.barcodeSection}>
                    <div className={styles.barcode}>
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className={styles.barcodeLine} />
                      ))}
                    </div>
                    <div className={styles.cardNumber}>
                      {cardInfo.cardNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Information */}
              <div className={styles.cardInfo}>
                <h3>Card Information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Card Number:</span>
                    <span className={styles.infoValue}>{cardInfo.cardNumber}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Issued Date:</span>
                    <span className={styles.infoValue}>
                      {new Date(cardInfo.issuedDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Expiry Date:</span>
                    <span className={styles.infoValue}>
                      {new Date(cardInfo.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Status:</span>
                    <span className={styles.infoValue}>
                      {getStatusBadge(cardInfo.status)}
                    </span>
                  </div>
                </div>

                <div className={styles.notice}>
                  <strong>Important:</strong> This is your official employee ID card. 
                  Keep it safe and report immediately if lost or stolen.
                </div>
              </div>
            </>
          ) : (
            /* No Card Issued */
            <div className={styles.noCard}>
              <div className={styles.noCardIcon}></div>
              <h2>No ID Card Issued</h2>
              <p>You don't have an employee ID card yet.</p>
              
              {requestStatus === 'requested' ? (
                <div className={styles.requestSuccess}>
                  <div className={styles.successIcon}></div>
                  <h3>Request Submitted</h3>
                  <p>Your ID card request has been submitted to HR. You'll be notified once it's processed.</p>
                </div>
              ) : (
                <button
                  onClick={requestIDCard}
                  disabled={requesting}
                  className={styles.requestButton}
                >
                  {requesting ? 'Submitting...' : 'Request ID Card'}
                </button>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}