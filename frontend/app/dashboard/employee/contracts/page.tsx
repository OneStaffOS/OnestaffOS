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
  departmentId?: { name?: string };
};

export default function EmployeeContractsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/banking-contracts/contracts/active');
      setContracts(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const submitCompletion = async (contractId: string) => {
    const note = window.prompt('Add a completion note (optional):') || undefined;
    try {
      const actorId = user?.sub;
      const roles = user?.roles || [];
      const actorRole = roles.includes(SystemRole.DEPARTMENT_EMPLOYEE)
        ? SystemRole.DEPARTMENT_EMPLOYEE
        : roles.includes(SystemRole.DEPARTMENT_HEAD)
          ? SystemRole.DEPARTMENT_HEAD
          : roles.includes(SystemRole.SYSTEM_ADMIN)
            ? SystemRole.SYSTEM_ADMIN
            : roles[0];
      if (!actorId || !actorRole) {
        setError('User session not available for signing.');
        return;
      }
      const contract = contracts.find((item) => item._id === contractId);
      const signedAction = await buildSignedAction({
        actorId,
        actorRole,
        action: 'CONTRACT_SUBMIT_COMPLETION',
        contractId,
        amount: contract?.paymentAmount ?? 0,
      });
      await axios.post(`/banking-contracts/contracts/${contractId}/submit-completion`, {
        note,
        ...signedAction,
      });
      await loadContracts();
    } catch (err: any) {
      setError(err.response?.data?.message || err?.message || 'Failed to submit completion');
    }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Active Contracts" role="Employee">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Active Department Contracts</h1>
            <button onClick={loadContracts} className={styles.secondaryButton}>Refresh</button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <div className={styles.loading}>Loading contracts...</div>
          ) : contracts.length === 0 ? (
            <div className={styles.empty}>No active contracts assigned yet.</div>
          ) : (
            <div className={styles.list}>
              {contracts.map((contract) => (
                <div key={contract._id} className={styles.card}>
                  <div>
                    <h3>{contract.requestedService}</h3>
                    <p className={styles.meta}>
                      {contract.departmentId?.name || 'Department'} • {contract.timeEstimateDays}days
                    </p>
                    {contract.description && <p className={styles.desc}>{contract.description}</p>}
                  </div>
                  <button
                    onClick={() => submitCompletion(contract._id)}
                    className={styles.primaryButton}
                  >
                    Submit Completion
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}