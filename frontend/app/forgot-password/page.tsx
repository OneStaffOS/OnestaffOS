/**
 * ForgotPasswordPage (Route: /forgot-password)
 * Password reset request form
 * Fields: email
 * Sends password reset link to user's email
 */

'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { axios } from '@/lib/axios-config';
import { sanitizeInput } from '@/lib/security';
import styles from './forgot-password.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null); // For dev/testing only

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const sanitizedEmail = sanitizeInput(email.trim());
      
      const response = await axios.post('/password-reset/request', {
        email: sanitizedEmail,
      });

      if (response.data.success) {
        setSuccess(true);
        // In development, the token is returned for testing
        if (response.data.token) {
          setResetToken(response.data.token);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send reset link';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>Check Your Email</h1>
          <p className={styles.successMessage}>
            If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
          <p className={styles.helpText}>
            Please check your inbox and spam folder. The link will expire in 1 hour.
          </p>

          {/* Development only - show reset link */}
          {resetToken && (
            <div className={styles.devNote}>
              <p><strong>Development Mode:</strong></p>
              <Link 
                href={`/reset-password?token=${resetToken}`}
                className={styles.devLink}
              >
                Click here to reset password
              </Link>
            </div>
          )}

          <div className={styles.actionLinks}>
            <Link href="/login" className={styles.backLink}>
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                Sending...
              </>
            ) : (
              'Send Reset Link'
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
