"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import { SystemRole } from '@/lib/roles';
import { useAuth } from '@/app/context/AuthContext';
import axios from '@/lib/axios-config';
import { buildSignedAction } from '@/lib/banking-signature';
import {
  addFunds,
  clearPendingAction,
  finalizeHold,
  readPendingAction,
} from '@/lib/client-banking';
import styles from './processing.module.css';

export default function BankingProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [message, setMessage] = useState('Processing your bank request...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.sub) {
      setError('User session not available.');
      return;
    }
    const pending = readPendingAction(user.sub);
    if (!pending) {
      setError('No pending banking action found.');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (pending.type === 'ADD_FUNDS') {
          addFunds(user.sub, pending.amount);
          clearPendingAction(user.sub);
          router.push('/dashboard/client/banking?status=success&action=add-funds');
          return;
        }

        if (pending.type === 'APPROVE_CONTRACT') {
          const roles = user.roles || [];
          const actorRole = roles.includes(SystemRole.CLIENT)
            ? SystemRole.CLIENT
            : roles.includes(SystemRole.SYSTEM_ADMIN)
              ? SystemRole.SYSTEM_ADMIN
              : roles[0];
          if (!actorRole) {
            throw new Error('Actor role not available.');
          }
          const signedAction = await buildSignedAction({
            actorId: user.sub,
            actorRole,
            action: 'CONTRACT_APPROVE',
            contractId: pending.contractId,
            amount: pending.amount,
          });
          await axios.post(`/banking-contracts/contracts/${pending.contractId}/approve`, signedAction);
          finalizeHold(user.sub, pending.contractId);
          clearPendingAction(user.sub);
          router.push('/dashboard/client?status=success&action=approve');
          return;
        }

        clearPendingAction(user.sub);
        router.push('/dashboard/client/banking');
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Processing failed.');
        clearPendingAction(user.sub);
        setTimeout(() => {
          const action = searchParams?.get('action');
          const target = action === 'approve' ? '/dashboard/client' : '/dashboard/client/banking';
          router.push(`${target}?status=error`);
        }, 2000);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [router, user, searchParams]);

  return (
    <ProtectedRoute requiredRoles={[SystemRole.CLIENT, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Processing" role="Client">
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.spinner} />
            <h1>Bank Transaction</h1>
            <p>{error || message}</p>
            <span className={styles.timer}>This can take up to 10 seconds.</span>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}