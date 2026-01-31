/**
 * VerifyAdminPinPage (Route: /verify-admin-pin)
 * System Admin PIN verification after password login
 */

"use client";

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { SystemRole as Role } from '@/lib/roles';
import { axios } from '@/lib/axios-config';
import styles from './verify-admin-pin.module.css';

export default function VerifyAdminPinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminPin.trim()) {
      setError('Admin PIN is required');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/auth/admin-pin/verify', { adminPin });
      const redirect = searchParams.get('redirect') || '/dashboard/admin';
      router.push(redirect);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify Admin PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={[Role.SYSTEM_ADMIN]}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Admin PIN Required</h1>
          <p className={styles.subtitle}>
            Please enter your Admin PIN to continue.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="adminPin" className={styles.label}>
              Admin PIN
            </label>
            <input
              id="adminPin"
              type="password"
              className={styles.input}
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Enter your PIN"
            />
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify PIN'}
            </button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}