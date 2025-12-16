/**
 * MFA Verification Page (Route: /login/mfa)
 * Prompts user to authenticate with their passkey after password login
 * 
 * This page is shown when:
 * 1. User successfully enters password
 * 2. User has registered passkeys (MFA enabled)
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { axios } from '@/lib/axios-config';
import { useAuth } from '@/app/context/AuthContext';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { setCsrfToken } from '@/lib/security';
import { getDashboardRoute, getAvailableDashboards } from '@/lib/roles';
import RoleSelectionModal from '@/app/components/RoleSelectionModal';
import styles from './mfa.module.css';

function MFAVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [availableDashboards, setAvailableDashboards] = useState<Array<{ role: string; label: string; route: string }>>([]);

  // Get data from URL params (set by login page)
  const email = searchParams.get('email') || '';
  const accessToken = searchParams.get('token') || '';
  const userDataBase64 = searchParams.get('user') || '';
  const redirectPath = searchParams.get('redirect') || '';

  // Parse user data
  const userData = userDataBase64 ? JSON.parse(atob(userDataBase64)) : null;

  // Check WebAuthn support
  useEffect(() => {
    setWebAuthnSupported(browserSupportsWebAuthn());
  }, []);

  // Auto-start verification when page loads
  useEffect(() => {
    if (email && webAuthnSupported && !verifying) {
      // Small delay to let the user see the page
      const timer = setTimeout(() => {
        handleVerifyPasskey();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [email, webAuthnSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  const completeLogin = useCallback(async () => {
    try {
      // Complete the MFA login - this sets the httpOnly cookie
      const completeRes = await axios.post('/auth/login/complete-mfa', {
        accessToken,
      });

      // Store CSRF token
      if (completeRes.data.csrfToken) {
        setCsrfToken(completeRes.data.csrfToken);
      }

      // Use AuthContext login method
      login(accessToken, userData);

      // Handle navigation based on roles
      const userRoles = userData?.roles || [];

      if (redirectPath) {
        router.push(redirectPath);
        return;
      }

      const dashboardRoute = getDashboardRoute(userRoles);

      if (dashboardRoute) {
        router.push(dashboardRoute);
      } else {
        // Multiple roles - show selection modal
        const dashboards = getAvailableDashboards(userRoles);
        setAvailableDashboards(dashboards);
        setShowRoleSelection(true);
      }
    } catch (err: any) {
      console.error('Failed to complete MFA login:', err);
      setError('Failed to complete login. Please try again.');
    }
  }, [accessToken, userData, login, router, redirectPath]);

  const handleVerifyPasskey = async () => {
    if (!email) {
      setError('Missing email. Please log in again.');
      return;
    }

    if (!accessToken) {
      setError('Missing authentication data. Please log in again.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      // Step 1: Get authentication options from server
      const optionsRes = await axios.post('/passkeys/authenticate/options', {
        email,
      });

      if (!optionsRes.data.mfaRequired) {
        // MFA not required (shouldn't happen but handle gracefully)
        await completeLogin();
        return;
      }

      const { options } = optionsRes.data;

      // Step 2: Start WebAuthn authentication ceremony
      const credential = await startAuthentication({
        optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
      });

      // Step 3: Verify authentication with server
      const verifyRes = await axios.post('/passkeys/authenticate/verify', {
        email,
        ...credential,
      });

      if (verifyRes.data.verified) {
        await completeLogin();
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Passkey authentication error:', err);

      // Handle user cancellation or passkey not found on this device
      if (err.name === 'NotAllowedError') {
        setError('Passkey not found on this device. If you registered your passkey on another device (like your phone via QR code), please use that device. Otherwise, contact an administrator to reset your MFA.');
      } else if (err.name === 'SecurityError') {
        setError('Security error. Please ensure you\'re on a secure connection.');
      } else {
        setError(err.response?.data?.message || err.message || 'Authentication failed');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleRoleSelect = (route: string) => {
    setShowRoleSelection(false);
    router.push(route);
  };

  const handleCancel = () => {
    // Clear any stored data and go back to login
    router.push('/login');
  };

  // If no email provided, redirect to login
  if (!email) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>⚠️</div>
          <h1>Session Error</h1>
          <p>Your session has expired or is invalid.</p>
          <button onClick={() => router.push('/login')} className={styles.primaryButton}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!webAuthnSupported) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>⚠️</div>
          <h1>Browser Not Supported</h1>
          <p>Your browser does not support passkeys. Please use a modern browser like Chrome, Safari, Firefox, or Edge.</p>
          <button onClick={() => router.push('/login')} className={styles.secondaryButton}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showRoleSelection && (
        <RoleSelectionModal
          roles={availableDashboards}
          onSelect={handleRoleSelect}
        />
      )}

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.icon}>🔐</div>
          <h1 className={styles.title}>Verify Your Identity</h1>
          <p className={styles.subtitle}>
            Use your registered passkey to complete sign-in
          </p>

          <div className={styles.userInfo}>
            <span className={styles.userIcon}>👤</span>
            <span className={styles.userEmail}>{email}</span>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.instructions}>
            <p>
              {verifying
                ? 'Follow the prompts on your device...'
                : 'Click the button below and use Face ID, Touch ID, Windows Hello, or your security key.'}
            </p>
          </div>

          <button
            onClick={handleVerifyPasskey}
            className={styles.primaryButton}
            disabled={verifying}
          >
            {verifying ? (
              <>
                <span className={styles.spinner}></span>
                Verifying...
              </>
            ) : (
              'Verify with Passkey'
            )}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button onClick={handleCancel} className={styles.linkButton}>
            Cancel and return to login
          </button>

          <div className={styles.help}>
            <details>
              <summary>Having trouble?</summary>
              <ul>
                <li>Make sure your device has biometrics enabled</li>
                <li>Try using a different registered device</li>
                <li>Contact IT support if the issue persists</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </>
  );
}

export default function MFAVerificationPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    }>
      <MFAVerificationContent />
    </Suspense>
  );
}
