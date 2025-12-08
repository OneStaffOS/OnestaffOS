'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import styles from './idCard.module.css';

interface AccessCardInfo {
  cardNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  status?: string;
}

interface EmployeeProfile {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  workEmail?: string;
  primaryDepartmentId?: any;
  primaryPositionId?: any;
  profilePictureUrl?: string;
}

export default function IDCardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cardInfo, setCardInfo] = useState<AccessCardInfo | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get employee profile
      const profileResponse = await axios.get('/employee-profile/my-profile');
      setEmployee(profileResponse.data);

      // Get onboarding checklist
      const checklistResponse = await axios.get(`/recruitment/onboarding/employee/${profileResponse.data._id}`);
      
      if (checklistResponse.data) {
        setOnboardingId(checklistResponse.data._id);
        
        // Get access card info
        const cardResponse = await axios.get(`/recruitment/onboarding/${checklistResponse.data._id}/access-card`);
        if (cardResponse.data) {
          setCardInfo(cardResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestCard = async () => {
    if (!onboardingId) return;

    try {
      const response = await axios.put(`/recruitment/onboarding/${onboardingId}/access-card`, {
        status: 'requested',
      });
      
      setCardInfo({ status: 'requested' });
      setRequestSubmitted(true);
      
      setTimeout(() => setRequestSubmitted(false), 3000);
    } catch (error) {
      console.error('Error requesting card:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner message="Loading ID card information..." />
      </div>
    );
  }

  const hasCard = cardInfo && cardInfo.cardNumber;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Employee ID Card</h1>
          <p className={styles.subtitle}>Your digital employee identification card</p>
        </div>
        <button className={styles.backButton} onClick={() => router.back()}>
          ← Back to Dashboard
        </button>
      </div>

      {hasCard ? (
        <div className={styles.cardWrapper}>
          <div className={styles.idCard}>
            {/* Front of Card */}
            <div className={styles.cardFront}>
              <div className={styles.cardHeader}>
                <div className={styles.companyLogo}>
                  <div className={styles.logoCircle}>OS</div>
                </div>
                <div className={styles.companyName}>OneStaff OS</div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.photoSection}>
                  {employee?.profilePictureUrl ? (
                    <img src={employee.profilePictureUrl} alt="Employee" className={styles.photo} />
                  ) : (
                    <div className={styles.photoPlaceholder}>
                      <span>{employee?.firstName?.[0]}{employee?.lastName?.[0]}</span>
                    </div>
                  )}
                </div>

                <div className={styles.infoSection}>
                  <h2 className={styles.employeeName}>
                    {employee?.firstName} {employee?.lastName}
                  </h2>
                  
                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>ID:</span>
                    <span className={styles.detailValue}>{employee?.employeeNumber}</span>
                  </div>

                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Department:</span>
                    <span className={styles.detailValue}>
                      {employee?.primaryDepartmentId?.name || 'Not Assigned'}
                    </span>
                  </div>

                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Position:</span>
                    <span className={styles.detailValue}>
                      {employee?.primaryPositionId?.title || 'Not Assigned'}
                    </span>
                  </div>

                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Email:</span>
                    <span className={styles.detailValue}>{employee?.workEmail || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.barcode}>
                  <div className={styles.barcodeLines}>
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className={styles.barcodeLine} />
                    ))}
                  </div>
                  <div className={styles.barcodeNumber}>{cardInfo.cardNumber}</div>
                </div>
              </div>
            </div>

            {/* Card Info Panel */}
            <div className={styles.cardInfoPanel}>
              <h3>Card Information</h3>
              
              <div className={styles.cardInfoGrid}>
                <div className={styles.cardInfoItem}>
                  <span className={styles.cardInfoLabel}>Card Number</span>
                  <span className={styles.cardInfoValue}>{cardInfo.cardNumber}</span>
                </div>

                <div className={styles.cardInfoItem}>
                  <span className={styles.cardInfoLabel}>Issued Date</span>
                  <span className={styles.cardInfoValue}>
                    {cardInfo.issuedDate ? formatDate(cardInfo.issuedDate) : 'N/A'}
                  </span>
                </div>

                <div className={styles.cardInfoItem}>
                  <span className={styles.cardInfoLabel}>Expiry Date</span>
                  <span className={styles.cardInfoValue}>
                    {cardInfo.expiryDate ? formatDate(cardInfo.expiryDate) : 'N/A'}
                  </span>
                </div>

                <div className={styles.cardInfoItem}>
                  <span className={styles.cardInfoLabel}>Status</span>
                  <span className={`${styles.statusBadge} ${styles[cardInfo.status || 'active']}`}>
                    {cardInfo.status || 'Active'}
                  </span>
                </div>
              </div>

              <div className={styles.notice}>
                <strong>Important:</strong> This is your official employee ID card. Please carry it with you at all times when on company premises.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.noCardContainer}>
          <div className={styles.noCardIcon}>🆔</div>
          <h2 className={styles.noCardTitle}>No ID Card Issued</h2>
          <p className={styles.noCardText}>
            {cardInfo?.status === 'requested' 
              ? 'Your ID card request has been submitted. HR will process it soon.'
              : 'You have not been issued an employee ID card yet.'}
          </p>
          
          {!cardInfo?.status && (
            <button className={styles.requestButton} onClick={requestCard}>
              Request ID Card
            </button>
          )}

          {requestSubmitted && (
            <div className={styles.successMessage}>
              ✓ Request submitted successfully! HR will review your request.
            </div>
          )}

          {cardInfo?.status === 'requested' && (
            <div className={styles.statusInfo}>
              <div className={styles.statusIcon}>⏳</div>
              <p>Your request is pending approval</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
