'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import { useAuth } from '@/app/context/AuthContext';
import {
  addBankAccount,
  addFunds,
  ClientBankAccount,
  ClientBankingState,
  getClientBankingState,
  getFinalBalance,
  storePendingAction,
  validateBankAccount,
} from '@/lib/client-banking';
import styles from './banking.module.css';

export default function ClientBankingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [state, setState] = useState<ClientBankingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [fundsAccountId, setFundsAccountId] = useState('');
  const [fundsAmount, setFundsAmount] = useState('');

  useEffect(() => {
    if (user?.sub) {
      setState(getClientBankingState(user.sub));
    }
  }, [user?.sub]);

  useEffect(() => {
    const status = searchParams?.get('status');
    const action = searchParams?.get('action');
    if (status === 'success' && action) {
      const message =
        action === 'add-funds'
          ? 'Funds added successfully.'
          : action === 'approve'
            ? 'Contract approved and settled.'
            : null;
      if (message) {
        setNotice(message);
      }
    }
  }, [searchParams]);

  const balances = state?.balances || { available: 0, onHold: 0 };
  const finalBalance = getFinalBalance(balances);
  const accounts = state?.accounts || [];

  const canAddAccount = accounts.length < 6;
  const canAddFunds =
    fundsAccountId &&
    Number(fundsAmount) > 0 &&
    accounts.some((account) => account.id === fundsAccountId);

  const accountValidation = useMemo(() => {
    if (!accountNumber.trim()) {
      return null;
    }
    return validateBankAccount(accountNumber);
  }, [accountNumber]);

  const handleAddAccount = () => {
    if (!user?.sub) return;
    setError(null);
    if (!accountName.trim()) {
      setError('Account name is required.');
      return;
    }
    if (!accountNumber.trim()) {
      setError('Account number is required.');
      return;
    }
    const result = addBankAccount(user.sub, accountName, accountNumber);
    if (!result.ok) {
      setError(result.message || 'Unable to add bank account.');
      return;
    }
    setState(getClientBankingState(user.sub));
    setAccountName('');
    setAccountNumber('');
  };

  const handleAddFunds = () => {
    if (!user?.sub) return;
    setError(null);
    const amount = Number(fundsAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!fundsAccountId) {
      setError('Select a bank account to add funds.');
      return;
    }
    storePendingAction(user.sub, {
      type: 'ADD_FUNDS',
      amount,
      accountId: fundsAccountId,
      createdAt: new Date().toISOString(),
    });
    router.push('/dashboard/client/banking/processing?action=add-funds');
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.CLIENT, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Client Banking" role="Client">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1>Bank Account</h1>
              <p>Manage your accounts and balances for simulated contract payments.</p>
            </div>
            <button className={styles.secondaryButton} onClick={() => router.push('/dashboard/client')}>
              Back to Dashboard
            </button>
          </div>

          {notice && <div className={styles.notice}>{notice}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <section className={styles.balanceGrid}>
            <div className={styles.balanceCard}>
              <span>Available Balance</span>
              <strong>{balances.available.toLocaleString()} EGP</strong>
            </div>
            <div className={styles.balanceCard}>
              <span>On Hold Balance</span>
              <strong>{balances.onHold.toLocaleString()} EGP</strong>
            </div>
            <div className={styles.balanceCard}>
              <span>Final Balance</span>
              <strong>{finalBalance.toLocaleString()} EGP</strong>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Linked Bank Accounts</h2>
              <span className={styles.limit}>{accounts.length}/6</span>
            </div>
            {accounts.length === 0 ? (
              <p className={styles.muted}>No bank accounts yet. Add one below.</p>
            ) : (
              <div className={styles.accountList}>
                {accounts.map((account: ClientBankAccount) => (
                  <div key={account.id} className={styles.accountItem}>
                    <div>
                      <h3>{account.accountName}</h3>
                      <p>{account.accountNumber}</p>
                    </div>
                    <span className={styles.badge}>{account.bankCode}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Add Bank Account</h2>
            <div className={styles.formRow}>
              <label>
                Account Name
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., Client Operations"
                />
              </label>
              <label>
                Account Number
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="NBE-4527266374"
                />
              </label>
            </div>
            {accountValidation && !accountValidation.ok && (
              <div className={styles.error}>{accountValidation.message}</div>
            )}
            <button
              className={styles.primaryButton}
              onClick={handleAddAccount}
              disabled={!canAddAccount}
            >
              Add Bank Account
            </button>
            {!canAddAccount && (
              <p className={styles.muted}>Maximum of 6 bank accounts reached.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2>Add Funds</h2>
            <div className={styles.formRow}>
              <label>
                Bank Account
                <select
                  value={fundsAccountId}
                  onChange={(e) => setFundsAccountId(e.target.value)}
                >
                  <option value="">Select bank account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountNumber} • {account.accountName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={fundsAmount}
                  onChange={(e) => setFundsAmount(e.target.value)}
                  placeholder="e.g., 2000"
                />
              </label>
            </div>
            <button
              className={styles.primaryButton}
              onClick={handleAddFunds}
              disabled={!canAddFunds}
            >
              Add Funds
            </button>
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
