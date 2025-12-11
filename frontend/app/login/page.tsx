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
      
      console.log('[Login] Full response:', response.data);
      
      // Backend returns { statusCode, message, accessToken, user, csrfToken }
      const userData = response.data.user || response.data.payload;
      const token = response.data.accessToken;
      const csrfToken = response.data.csrfToken;

      console.log('[Login] Token:', token ? 'exists' : 'MISSING');
      console.log('[Login] User data:', userData);
      console.log('[Login] CSRF token:', csrfToken ? 'exists' : 'MISSING');

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
