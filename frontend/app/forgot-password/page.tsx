/**
 * ForgotPasswordPage (Route: /forgot-password)
 * Password reset request form with OTP
 * Fields: email
 * Sends OTP to user's email and redirects to OTP verification page
 */

"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { axios } from '@/lib/axios-config';
import { sanitizeInput } from '@/lib/security';
import styles from './forgot-password.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sanitizedEmail = sanitizeInput(email.trim());
      
      const response = await axios.post('/password-reset/request', {
        email: sanitizedEmail,
      });

      if (response.data.success) {
        sessionStorage.setItem('otp_email', sanitizedEmail);
        router.push('/verify-otp');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send OTP';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className={styles.title}>Forgot Password?</h1>
        <p className={styles.subtitle}>
          No worries! Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Sending OTP...
              </>
            ) : (
              'Send Verification Code'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <Link href="/login" className={styles.backLink}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}