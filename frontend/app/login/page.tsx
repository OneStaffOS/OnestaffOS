/**
 * LoginPage (Route: /login)
 * User authentication form
 * Fields: email, password
 * Stores JWT token and user data in localStorage
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
      
      // Backend returns { statusCode, message, accessToken, user, csrfToken }
      const userData = response.data.user || response.data.payload;
      const token = response.data.accessToken;
      const csrfToken = response.data.csrfToken;

      // Validate required data before proceeding
      if (!token || !userData) {
        throw new Error('Invalid response from server: missing token or user data');
      }

      // Store CSRF token
      if (csrfToken) {
        setCsrfToken(csrfToken);
      }

      // Use AuthContext login method
      login(token, userData);

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
      // Extract and display detailed error message
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
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
    setComingSoonMessage(`Sign in with ${provider} is coming soon!`);
    setTimeout(() => setComingSoonMessage(''), 3000);
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
