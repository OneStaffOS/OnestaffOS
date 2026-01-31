"use client";

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import { useAuth } from '@/app/context/AuthContext';
import axios from '@/lib/axios-config';
import { ensureArray } from '@/lib/safe-array';
import { buildSignedAction } from '@/lib/banking-signature';
import styles from './contracts.module.css';

type Contract = {
  _id: string;
  requestedService: string;
  description?: string;
  timeEstimateDays: number;
  paymentAmount: number;
  status: string;
  clientId?: { firstName?: string; lastName?: string };
  departmentId?: { name?: string };
};

export default function ManagerContractsPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<Contract[]>([]);
  const [completionRequests, setCompletionRequests] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, completionRes] = await Promise.all([
        axios.get('/banking-contracts/contracts/department', { params: { status: 'PENDING' } }),
        axios.get('/banking-contracts/contracts/department', { params: { status: 'COMPLETION_REQUESTED' } }),
      ]);
      setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      setCompletionRequests(Array.isArray(completionRes.data) ? completionRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const activateContract = async (id: string) => {
    try {
      const actorId = user?.sub;
      const roles = user?.roles || [];
      const actorRole = roles.includes(SystemRole.DEPARTMENT_HEAD)
        ? SystemRole.DEPARTMENT_HEAD
        : roles.includes(SystemRole.SYSTEM_ADMIN)
          ? SystemRole.SYSTEM_ADMIN
          : roles[0];
      if (!actorId || !actorRole) {
        setError('User session not available for signing.');
        return;
      }
      const contract = pending.find((item) => item._id === id);
      const signedAction = await buildSignedAction({
        actorId,
        actorRole,
        action: 'CONTRACT_ACTIVATE',
        contractId: id,
        amount: contract?.paymentAmount ?? 0,
      });
      await axios.post(`/banking-contracts/contracts/${id}/activate`, signedAction);
      await loadContracts();
    } catch (err: any) {
      setError(err.response?.data?.message || err?.message || 'Failed to activate contract');
    }
  };

  const completeContract = async (id: string) => {
    try {
      const actorId = user?.sub;
      const roles = user?.roles || [];
      const actorRole = roles.includes(SystemRole.DEPARTMENT_HEAD)
        ? SystemRole.DEPARTMENT_HEAD
        : roles.includes(SystemRole.SYSTEM_ADMIN)
          ? SystemRole.SYSTEM_ADMIN
          : roles[0];
      if (!actorId || !actorRole) {
        setError('User session not available for signing.');
        return;
      }
      const contract = completionRequests.find((item) => item._id === id);
      const signedAction = await buildSignedAction({
        actorId,
        actorRole,
        action: 'CONTRACT_COMPLETE',
        contractId: id,
        amount: contract?.paymentAmount ?? 0,
      });
      await axios.post(`/banking-contracts/contracts/${id}/complete`, signedAction);
      await loadContracts();
    } catch (err: any) {
      setError(err.response?.data?.message || err?.message || 'Failed to complete contract');
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_HEAD, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Department Contracts" role="Department Head">
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1>Department Contracts</h1>
              <p>Activate new requests and review completion submissions.</p>
            </div>
            <button onClick={loadContracts} className={styles.secondaryButton}>Refresh</button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <section className={styles.card}>
            <h2>Pending Requests</h2>
            {loading ? (
              <div className={styles.loading}>Loading pending contracts...</div>
            ) : pending.length === 0 ? (
              <div className={styles.empty}>No pending requests.</div>
            ) : (
              <div className={styles.list}>
                {pending.map((contract) => (
                  <div key={contract._id} className={styles.row}>
                    <div>
                      <h3>{contract.requestedService}</h3>
                      <p className={styles.meta}>
                        Client: {contract.clientId?.firstName} {contract.clientId?.lastName} • {contract.timeEstimateDays} days • {contract.paymentAmount} EGP
                      </p>
                      {contract.description && <p className={styles.desc}>{contract.description}</p>}
                    </div>
                    <button
                      onClick={() => activateContract(contract._id)}
                      className={styles.primaryButton}
                    >
                      Activate
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Completion Requests</h2>
            {loading ? (
              <div className={styles.loading}>Loading completion requests...</div>
            ) : completionRequests.length === 0 ? (
              <div className={styles.empty}>No completion requests.</div>
            ) : (
              <div className={styles.list}>
                {completionRequests.map((contract) => (
                  <div key={contract._id} className={styles.row}>
                    <div>
                      <h3>{contract.requestedService}</h3>
                      <p className={styles.meta}>
                        Client: {contract.clientId?.firstName} {contract.clientId?.lastName} • {contract.paymentAmount} EGP
                      </p>
                    </div>
                    <button
                      onClick={() => completeContract(contract._id)}
                      className={styles.primaryButton}
                    >
                      Mark Completed
                    </button>
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