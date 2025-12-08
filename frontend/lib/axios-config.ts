/**
 * Axios Configuration
 * Centralized axios instance with interceptors for authentication
 * 
 * Usage:
 * import { axios } from '@/lib/axios-config'
 * 
 * const data = await axios.get('/recruitment/job-requisitions')
 * const result = await axios.post('/auth/login', { email, password })
 */

import axiosLib from 'axios';

// Default to the backend Nest server port (3000) when running locally.
// Override with NEXT_PUBLIC_API_URL in your environment when needed (e.g. staging).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
export const axios = axiosLib.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Also export as default for convenience
export default axios;

// Request interceptor - Add token to all requests
axios.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // If sending FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
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
    return Promise.reject(error);
  }
);
