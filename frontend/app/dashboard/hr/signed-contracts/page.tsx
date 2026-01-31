"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './signedContracts.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface SignedContract {
  _id: string;
  contractId: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  grossSalary: number;
  signingBonus?: number;
  benefits?: string[];
  signedAt: string;
  acceptanceDate: string;
}

export default function SignedContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<SignedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/recruitment/signed-contracts');
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching signed contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewContractDetails = async (contractId: string) => {
    try {
      const response = await axios.get(`/recruitment/contracts/${contractId}`);
      setSelectedContract(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching contract details:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner message="Loading signed contracts..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Signed Contracts</h1>
          <p className={styles.subtitle}>View all signed employment contracts</p>
        </div>
        <button className={styles.backButton} onClick={() => router.back()}>
          ← Back
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No Signed Contracts Yet</h3>
          <p>Signed contracts will appear here once candidates accept offers.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Gross Salary</th>
                <th>Signing Bonus</th>
                <th>Signed Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract._id}>
                  <td className={styles.candidateName}>{contract.candidateName}</td>
                  <td>{contract.candidateEmail}</td>
                  <td>{contract.role}</td>
                  <td>{formatCurrency(contract.grossSalary)}</td>
                  <td>{contract.signingBonus ? formatCurrency(contract.signingBonus) : 'N/A'}</td>
                  <td>{formatDate(contract.signedAt)}</td>
                  <td>
                    <button
                      className={styles.viewButton}
                      onClick={() => viewContractDetails(contract.contractId)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedContract && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Contract Details</h2>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.section}>
                <h3>Candidate Information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Name:</span>
                    <span className={styles.value}>{selectedContract.candidateName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Email:</span>
                    <span className={styles.value}>{selectedContract.candidateEmail}</span>
                  </div>
                  {selectedContract.candidatePhone && (
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Phone:</span>
                      <span className={styles.value}>{selectedContract.candidatePhone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.section}>
                <h3>Position & Compensation</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Role:</span>
                    <span className={styles.value}>{selectedContract.role}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Gross Salary:</span>
                    <span className={styles.value}>{formatCurrency(selectedContract.grossSalary)}</span>
                  </div>
                  {selectedContract.signingBonus && (
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Signing Bonus:</span>
                      <span className={styles.value}>{formatCurrency(selectedContract.signingBonus)}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedContract.benefits && selectedContract.benefits.length > 0 && (
                <div className={styles.section}>
                  <h3>Benefits</h3>
                  <ul className={styles.benefitsList}>
                    {selectedContract.benefits.map((benefit: string, index: number) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.section}>
                <h3>Contract Timeline</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Signed Date:</span>
                    <span className={styles.value}>{formatDate(selectedContract.signedAt)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Acceptance Date:</span>
                    <span className={styles.value}>{formatDate(selectedContract.acceptanceDate)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.closeModalButton} onClick={() => setShowModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}