"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import { useAuth } from '@/app/context/AuthContext';
import axios from '@/lib/axios-config';
import { ensureArray } from '@/lib/safe-array';
import { buildSignedAction, generateObjectId } from '@/lib/banking-signature';
import {
  ClientBankingState,
  getClientBankingState,
  getFinalBalance,
  holdFunds,
  releaseHold,
  storePendingAction,
} from '@/lib/client-banking';
import styles from './client.module.css';

type Department = {
  _id: string;
  name: string;
};

type Contract = {
  _id: string;
  requestedService: string;
  description?: string;
  timeEstimateDays: number;
  paymentAmount: number;
  status: string;
  departmentId?: { name?: string };
  createdAt?: string;
};

const statusLabels: Record<string, string> = {
  PENDING: 'PENDING',
  ACTIVE: 'IN_PROGRESS',
  COMPLETION_REQUESTED: 'AWAITING_REVIEW',
  COMPLETED: 'COMPLETED',
  APPROVED: 'APPROVED',
};

export default function ClientDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bankingState, setBankingState] = useState<ClientBankingState | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [form, setForm] = useState({
    requestedService: '',
    departmentId: '',
    timeEstimateDays: '',
    paymentAmount: '',
    description: '',
  });

  const availableBalance = bankingState?.balances.available || 0;
  const onHoldBalance = bankingState?.balances.onHold || 0;
  const finalBalance = getFinalBalance({ available: availableBalance, onHold: onHoldBalance });

  const canSubmit = useMemo(() => {
    return (
      form.requestedService.trim() &&
      form.departmentId &&
      Number(form.timeEstimateDays) > 0 &&
      Number(form.paymentAmount) > 0 &&
      selectedAccountId
    );
  }, [form, selectedAccountId]);

  const insufficientFunds =
    Number(form.paymentAmount) > 0 && Number(form.paymentAmount) > availableBalance;

  useEffect(() => {
    if (user?.sub) {
      setBankingState(getClientBankingState(user.sub));
    }
  }, [user?.sub]);

  useEffect(() => {
    const status = searchParams?.get('status');
    const action = searchParams?.get('action');
    if (status === 'success' && action) {
      const message =
        action === 'approve'
          ? 'Contract approved and funds settled.'
          : action === 'add-funds'
            ? 'Funds added successfully.'
            : null;
      if (message) {
        setNotice(message);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, contractRes] = await Promise.all([
        axios.get('/organization-structure/departments'),
        axios.get('/banking-contracts/contracts/my'),
      ]);
      setDepartments(ensureArray(deptRes.data));
      setContracts(ensureArray(contractRes.data));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    let pendingContractId: string | null = null;
    try {
      const timeEstimateDays = Number(form.timeEstimateDays);
      const paymentAmount = Number(form.paymentAmount);
      if (!timeEstimateDays || !paymentAmount) {
        setError('Please provide a time estimate and payment amount.');
        return;
      }
      if (!selectedAccountId) {
        setError('Please select a bank account.');
        return;
      }
      if (paymentAmount > availableBalance) {
        setError('Insufficient available balance for this contract.');
        return;
      }
      const actorId = user?.sub;
      const roles = user?.roles || [];
      const actorRole = roles.includes(SystemRole.CLIENT)
        ? SystemRole.CLIENT
        : roles.includes(SystemRole.SYSTEM_ADMIN)
          ? SystemRole.SYSTEM_ADMIN
          : roles[0];
      if (!actorId || !actorRole) {
        setError('User session not available for signing.');
        return;
      }
      const contractId = generateObjectId();
      pendingContractId = contractId;
      // Business rule: move funds from Available -> On Hold immediately on contract creation.
      const holdResult = holdFunds(actorId, contractId, paymentAmount, selectedAccountId);
      if (!holdResult.ok) {
        setError(holdResult.message || 'Unable to reserve funds.');
        return;
      }
      setBankingState(getClientBankingState(actorId));
      const signedAction = await buildSignedAction({
        actorId,
        actorRole,
        action: 'CONTRACT_CREATE',
        contractId,
        amount: paymentAmount,
      });
      await axios.post('/banking-contracts/contracts', {
        requestedService: form.requestedService,
        departmentId: form.departmentId,
        timeEstimateDays,
        paymentAmount,
        description: form.description || undefined,
        ...signedAction,
      });
      setForm({
        requestedService: '',
        departmentId: '',
        timeEstimateDays: '',
        paymentAmount: '',
        description: '',
      });
      setSelectedAccountId('');
      await loadData();
    } catch (err: any) {
      if (user?.sub && pendingContractId) {
        releaseHold(user.sub, pendingContractId);
        setBankingState(getClientBankingState(user.sub));
      }
      setError(err.response?.data?.message || err?.message || 'Failed to create contract');
    }
  };

  const handleApprove = async (contractId: string) => {
    setError(null);
    try {
      if (!user?.sub) {
        setError('User session not available for signing.');
        return;
      }
      const contract = contracts.find((item) => item._id === contractId);
      if (!contract) {
        setError('Contract not found.');
        return;
      }
      storePendingAction(user.sub, {
        type: 'APPROVE_CONTRACT',
        contractId,
        amount: contract.paymentAmount,
        createdAt: new Date().toISOString(),
      });
      router.push('/dashboard/client/banking/processing?action=approve');
    } catch (err: any) {
      setError(err.response?.data?.message || err?.message || 'Failed to approve contract');
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.CLIENT, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Client Dashboard" role="Client">
        <div className={styles.container}>
          <section className={styles.hero}>
            <div>
              <h1>Client Contracts</h1>
              <p>Request new services and track contract progress.</p>
            </div>
            <div className={styles.heroActions}>
              <button
                onClick={() => router.push('/dashboard/client/banking')}
                className={styles.bankButton}
              >
                Bank Account
              </button>
              <button onClick={loadData} className={styles.refreshButton}>
                Refresh
              </button>
            </div>
          </section>

          {notice && <div className={styles.notice}>{notice}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <section className={styles.balanceStrip}>
            <div>
              <span>Available Balance</span>
              <strong>{availableBalance.toLocaleString()} EGP</strong>
            </div>
            <div>
              <span>On Hold</span>
              <strong>{onHoldBalance.toLocaleString()} EGP</strong>
            </div>
            <div>
              <span>Final Balance</span>
              <strong>{finalBalance.toLocaleString()} EGP</strong>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Create Contract</h2>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                Requested Service
                <input
                  value={form.requestedService}
                  onChange={(e) => handleChange('requestedService', e.target.value)}
                  placeholder="e.g., Mobile app revamp"
                />
              </label>
              <label className={styles.field}>
                Department
                <select
                  value={form.departmentId}
                  onChange={(e) => handleChange('departmentId', e.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Time Estimate (days)
                <input
                  type="number" min={1}
                  step={1}
                  value={form.timeEstimateDays}
                  onChange={(e) => handleChange('timeEstimateDays', e.target.value)}
                  placeholder="e.g., 10"
                />
              </label>
              <label className={styles.field}>
                Payment Amount (EGP)
                <input
                  type="number" min={1}
                  step={1}
                  value={form.paymentAmount}
                  onChange={(e) => handleChange('paymentAmount', e.target.value)}
                  placeholder="e.g., 1500"
                />
              </label>
              <label className={styles.field}>
                Bank Account
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="">Select bank account</option>
                  {(bankingState?.accounts || []).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountNumber} • {account.accountName}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldFull}>
                Description (optional)
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Add details to help the department plan."
                />
              </label>
            </div>
            {insufficientFunds && (
              <div className={styles.error}>
                Insufficient available balance. Add funds or reduce the contract amount.
              </div>
            )}
            <button
              onClick={handleSubmit}
              className={styles.primaryButton}
              disabled={!canSubmit || insufficientFunds}
            >
              Submit Contract
            </button>
          </section>

          <section className={styles.card}>
            <h2>My Contracts</h2>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : contracts.length === 0 ? (
              <div className={styles.empty}>No contracts yet.</div>
            ) : (
              <div className={styles.contractList}>
                {contracts.map((contract) => (
                  <div key={contract._id} className={styles.contractItem}>
                    <div>
                      <h3>{contract.requestedService}</h3>
                      <p className={styles.contractMeta}>
                        {contract.departmentId?.name || 'Department'} • {contract.timeEstimateDays} days • {contract.paymentAmount.toLocaleString()} EGP
                      </p>
                      {contract.description && <p className={styles.contractDesc}>{contract.description}</p>}
                    </div>
                    <div className={styles.contractActions}>
                      <span className={styles.status}>
                        {statusLabels[contract.status] || contract.status}
                      </span>
                      {contract.status === 'COMPLETED' && (
                        <button
                          className={styles.approveButton}
                          onClick={() => handleApprove(contract._id)}
                        >
                          Approve
                        </button>
                      )}
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