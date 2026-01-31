/**
 * VerifyOtpPage (Route: /verify-otp)
 * OTP verification form for password reset
 * Fields: 8-digit OTP code formatted as XXXX-XXXX
 * Verifies OTP and redirects to password reset page with token
 */

"use client";

import { useState, useEffect, FormEvent, useRef } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { axios } from '@/lib/axios-config';
import styles from './verify-otp.module.css';

export default function VerifyOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('otp_email');
    if (!storedEmail) {
      router.push('/forgot-password');
      return;
    }
    setEmail(storedEmail);
    // Focus first input
    inputRefs.current[0]?.focus();
  }, [router]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedData.length === 8) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[7]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 8) {
      setError('Please enter the complete 8-digit verification code');
      return;
    }

    if (!/^\d+$/.test(otpString)) {
      setError('Verification code must contain only numbers');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/password-reset/verify-otp', {
        email,
        otp: otpString,
      });

      if (response.data.success && response.data.token) {
        sessionStorage.removeItem('otp_email');
        router.push(`/reset-password?token=${response.data.token}`);
      }
    } catch (err: any) {
      let errorMessage = 'Invalid verification code';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid or expired verification code. Please try again.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Verification code not found. Please request a new one.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setOtp(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');

    try {
      await axios.post('/password-reset/request', { email });
      setError('');
      setOtp(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      alert('✓ New verification code sent! Check your email.');
    } catch (err: any) {
      let errorMessage = 'Failed to resend verification code';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className={styles.title}>Verify Your Email</h1>
        <p className={styles.subtitle}>
          We&apos;ve sent an 8-digit verification code to
        </p>
        <p className={styles.email}>{email}</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.otpContainer}>
            {otp.map((digit, index) => (
              <React.Fragment key={index}>
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={styles.otpInput}
                  disabled={loading}
                  autoComplete="off"
                />
                {index === 3 && <span className={styles.otpSeparator}>-</span>}
              </React.Fragment>
            ))}
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading || otp.join('').length !== 8}>
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        <div className={styles.resendSection}>
          <p className={styles.resendText}>Didn&apos;t receive the code?</p>
          <button 
            type="button" 
            onClick={handleResendOtp} 
            className={styles.resendButton}
            disabled={resending}
          >
            {resending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>

        <div className={styles.footer}>
          <Link href="/forgot-password" className={styles.backLink}>
            ← Use different email
          </Link>
        </div>
      </div>
    </div>
  );
}