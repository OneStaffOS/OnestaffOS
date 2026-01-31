"use client";

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import { ensureArray } from '@/lib/safe-array';
import styles from './banking.module.css';

type Overview = {
  balance: number;
  income: number;
  expenses: number;
  lastUpdatedAt?: string;
};

type Transaction = {
  _id: string;
  transactionId: string;
  transactionType: string;
  amount: number;
  companyDelta: number;
  employeeDelta: number;
  transactionAt: string;
  signatureValid?: boolean;
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function FinanceBankingPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBankingData();
  }, []);

  const loadBankingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, txRes] = await Promise.all([
        axios.get('/banking-contracts/banking/overview'),
        axios.get('/banking-contracts/banking/transactions'),
      ]);
      setOverview(overviewRes.data);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load banking data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Company Banking" role="Finance Staff">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1>Company Banking</h1>
              <p>Internal balance and transaction integrity overview.</p>
            </div>
            <button onClick={loadBankingData} className={styles.secondaryButton}>Refresh</button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.overviewGrid}>
            <div className={styles.overviewCard}>
              <span>Company Balance</span>
              <strong>{formatAmount(overview?.balance || 0)} EGP</strong>
            </div>
            <div className={styles.overviewCard}>
              <span>Contract Income</span>
              <strong>{formatAmount(overview?.income || 0)} EGP</strong>
            </div>
            <div className={styles.overviewCard}>
              <span>Payroll Expenses</span>
              <strong>{formatAmount(overview?.expenses || 0)} EGP</strong>
            </div>
          </div>

          <section className={styles.card}>
            <h2>Transaction Ledger</h2>
            {loading ? (
              <div className={styles.loading}>Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className={styles.empty}>No transactions recorded.</div>
            ) : (
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <span>ID</span>
                  <span>Type</span>
                  <span>Amount</span>
                  <span>Signature</span>
                </div>
                {transactions.map((tx) => (
                  <div key={tx._id} className={styles.tableRow}>
                    <span>{tx.transactionId}</span>
                    <span>{tx.transactionType}</span>
                    <span>{formatAmount(tx.amount)}</span>
                    <span className={tx.signatureValid ? styles.valid : styles.invalid}>
                      {tx.signatureValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}