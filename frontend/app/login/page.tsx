/**
 * LoginPage (Route: /login)
 * User authentication form
 * Fields: email, password
 * Stores JWT token in HTTP-only cookie (no localStorage)
 * Redirects based on user roles:
 * - No roles -> /job-offers
 * - Single role -> specific dashboard
 * - Multiple roles -> role selection modal
 */

'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { axios } from '@/lib/axios-config';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute, getAvailableDashboards } from '@/lib/roles';
import RoleSelectionModal from '../components/RoleSelectionModal';
import { setCsrfToken, sanitizeInput } from '@/lib/security';
import styles from './login.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [availableDashboards, setAvailableDashboards] = useState<Array<{ role: string; label: string; route: string }>>([]);
  const [comingSoonMessage, setComingSoonMessage] = useState('');

  // Check for registration success message
  useState(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Registration successful! Please login to continue.');
    }
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sanitize inputs before sending
      const sanitizedData = {
        email: sanitizeInput(formData.email.trim()),
        password: formData.password, // Don't sanitize password as it may contain special chars
      };

      const response = await axios.post('/auth/login', sanitizedData);
      
      // Backend returns { statusCode, message, mfaRequired, user, csrfToken }
      // Token is in HTTP-only cookie (not in response body)
      const userData = response.data.user || response.data.payload;
      const csrfToken = response.data.csrfToken;
      const mfaRequired = response.data.mfaRequired;

      // Validate required data before proceeding
      if (!userData) {
        throw new Error('Invalid response from server: missing user data');
      }

      // Store CSRF token
      if (csrfToken) {
        setCsrfToken(csrfToken);
      }

      // Check if MFA is required
      if (mfaRequired) {
        // For MFA, backend still returns token in response (needed for passkey verification)
        const token = response.data.accessToken;
        if (!token) {
          throw new Error('MFA required but no token provided');
        }
        
        // Redirect to MFA verification page with necessary data
        const userDataBase64 = btoa(JSON.stringify(userData));
        const redirect = searchParams.get('redirect') || '';
        const mfaUrl = `/login/mfa?email=${encodeURIComponent(sanitizedData.email)}&token=${encodeURIComponent(token)}&user=${encodeURIComponent(userDataBase64)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`;
        router.push(mfaUrl);
        return;
      }

      if (response.data.adminPinRequired) {
        // Set user state from password login before PIN verification page
        login(userData);
        const redirect = searchParams.get('redirect') || '/dashboard/admin';
        router.push(`/verify-admin-pin?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      // No MFA required - proceed with normal login flow
      // Backend already set HTTP-only cookie with token
      // Just update React state with user data
      login(userData);

      const userRoles = userData?.roles || [];

      // Check for redirect parameter
      const redirect = searchParams.get('redirect');
      
      if (redirect) {
        router.push(redirect);
        return;
      }

      // Get dashboard route based on roles
      const dashboardRoute = getDashboardRoute(userRoles);

      if (dashboardRoute) {
        // Single role or no roles - direct redirect
        router.push(dashboardRoute);
      } else {
        // Multiple roles - show selection modal
        const dashboards = getAvailableDashboards(userRoles);
        setAvailableDashboards(dashboards);
        setShowRoleSelection(true);
      }
    } catch (err: any) {
      // Extract and display specific error messages
      const backendMessage = err.response?.data?.message || err.message || '';
      const statusCode = err.response?.status;
      
      let errorMessage = 'Login failed';
      
      if (statusCode === 404 || backendMessage.includes('User not found') || backendMessage.includes('not found')) {
        errorMessage = 'No account found with this email address. Please check your email or register for a new account.';
      } else if (statusCode === 401) {
        if (backendMessage.includes('Invalid credentials')) {
          errorMessage = 'Incorrect password. Please try again or use "Forgot Password" to reset it.';
        } else if (backendMessage.includes('inactive') || backendMessage.includes('not active')) {
          errorMessage = backendMessage; // Use full account status message
        } else if (backendMessage.includes('suspended')) {
          errorMessage = 'Your account has been suspended. Please contact your administrator.';
        } else if (backendMessage.includes('terminated')) {
          errorMessage = 'Your account has been terminated. Please contact HR for assistance.';
        } else {
          errorMessage = backendMessage || 'Incorrect email or password. Please try again.';
        }
      } else if (backendMessage) {
        errorMessage = backendMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (route: string) => {
    setShowRoleSelection(false);
    router.push(route);
  };

  const handleOAuthClick = (provider: string) => {
    if (provider !== 'Google') {
      setComingSoonMessage(`Sign in with ${provider} is coming soon!`);
      setTimeout(() => setComingSoonMessage(''), 3000);
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri =
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
      `${window.location.origin}/api/v1/auth/google/callback`;

    if (!clientId) {
      setError('Google OAuth is not configured. Missing client ID.');
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: searchParams.get('redirect') || '',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

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
          {comingSoonMessage && <div className={styles.info}>{comingSoonMessage}</div>}
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to OneStaff OS</p>

          {successMessage && <div className={styles.success}>{successMessage}</div>}
          {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className={styles.forgotPasswordLink}>
            <Link href="/forgot-password">Forgot Password?</Link>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <div className={styles.oauthButtons}>
          <button 
            type="button" 
            className={styles.googleButton}
            onClick={() => handleOAuthClick('Google')}
          >
            <svg className={styles.buttonIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <button 
            type="button" 
            className={styles.appleButton}
            onClick={() => handleOAuthClick('Apple')}
          >
            <svg className={styles.buttonIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Sign in with Apple
          </button>
        </div>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/register" className={styles.link}>
            Register here
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}
