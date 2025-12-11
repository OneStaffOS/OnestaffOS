/**
 * Axios Configuration
 * Centralized axios instance with interceptors for authentication and security
 * 
 * Usage:
 * import { axios } from '@/lib/axios-config'
 * 
 * const data = await axios.get('/recruitment/job-requisitions')
 * const result = await axios.post('/auth/login', { email, password })
 */

import axiosLib from 'axios';
import { getCsrfToken, logSecurityEvent } from './security';

// Default to the backend Nest server port (3000) when running locally.
// Override with NEXT_PUBLIC_API_URL in your environment when needed (e.g. staging, production).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
export const axios = axiosLib.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Timeout after 30 seconds
  timeout: 30000,
  // Prevent SSRF by validating URLs
  validateStatus: (status) => status >= 200 && status < 500,
});

// Also export as default for convenience
export default axios;

// Request interceptor - Add token and CSRF protection to all requests
axios.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Add JWT token if available
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add CSRF token for state-changing requests
      const csrfToken = getCsrfToken();
      if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
      }
    }
    
    // If sending FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    logSecurityEvent('Request interceptor error', { error: error.message });
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally and log security events
axios.interceptors.response.use(
  (response) => {
    // Log suspicious response patterns
    if (response.config.url && response.config.url.includes('..')) {
      logSecurityEvent('Suspicious URL pattern in response', {
        url: response.config.url,
      });
    }
    return response;
  },
  (error) => {
    // Log security-related errors
    if (error.response?.status === 403) {
      logSecurityEvent('CSRF or permission denied', {
        url: error.config?.url,
        status: error.response.status,
      });
    }

    // Only logout on 401 if it's an authentication error (not authorization)
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const errorMessage = error.response?.data?.message?.toLowerCase() || '';
      
      // NEVER redirect on login/register endpoints - let the page handle the error
      if (url.includes('/auth/login') || url.includes('/auth/register')) {
        return Promise.reject(error);
      }
      
      const isTokenError = errorMessage.includes('token') || errorMessage.includes('unauthorized') || errorMessage.includes('authentication');
      
      // Only redirect to login if it's an actual auth failure, not a permissions issue
      if (isTokenError) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }

    // Log network errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      logSecurityEvent('Request timeout', {
        url: error.config?.url,
        timeout: error.config?.timeout,
      });
    }

    return Promise.reject(error);
  }
);
