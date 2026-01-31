"use client";

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './balance.module.css';

type Transaction = {
  _id: string;
  transactionId: string;
  amount: number;
  transactionType: string;
  transactionAt: string;
  signatureValid?: boolean;
};

export default function EmployeeBalancePage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/banking-contracts/employee/balance');
      setBalance(res.data?.balance || 0);
      setTransactions(Array.isArray(res.data?.transactions) ? res.data.transactions : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="My Balance" role="Employee">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1>My Balance</h1>
              <p>Payroll credit</p>
            </div>
            <button onClick={loadBalance} className={styles.secondaryButton}>Refresh</button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.balanceCard}>
            <span>Current Balance</span>
            <strong>{balance.toFixed(2)} EGP</strong>
          </div>

          <section className={styles.card}>
            <h2>Wage Payment History</h2>
            {loading ? (
              <div className={styles.loading}>Loading history...</div>
            ) : transactions.length === 0 ? (
              <div className={styles.empty}>No wage payments recorded.</div>
            ) : (
              <div className={styles.list}>
                {transactions.map((tx) => (
                  <div key={tx._id} className={styles.row}>
                    <div>
                      <div className={styles.txId}>{tx.transactionId}</div>
                      <div className={styles.txMeta}>
                        {new Date(tx.transactionAt).toLocaleDateString()} • {tx.transactionType}
                      </div>
                    </div>
                    <div className={styles.amount}>
                      +{tx.amount.toFixed(2)} EGP
                      <span className={styles.signature}>
                        {tx.signatureValid ? 'Signature OK' : 'Signature check failed'}
                      </span>
                    </div>
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