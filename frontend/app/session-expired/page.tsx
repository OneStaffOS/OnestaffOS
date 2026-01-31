/**
 * SessionExpiredPage (Route: /session-expired)
 * Displayed when a user's authentication token expires
 */

"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios-config';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function SessionExpiredPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear any remaining auth data when landing on this page
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      sessionStorage.clear();
    }
  }, []);

  const handleLogout = async () => {
    // Don't call backend - session already expired, just clear local data
    // Calling /auth/logout would trigger 401 interceptor and cause infinite loop
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      sessionStorage.clear();
      // Force a full page refresh to login
      window.location.href = '/login';
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      padding: '1rem',
    }}>
      <div style={{
        background: 'white',
        padding: '3rem 2rem',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
        maxWidth: '500px',
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1.5rem',
        }}>⏰</div>
        <h1 style={{
          fontSize: '2rem',
          margin: '0 0 1rem',
          color: '#1e293b',
          fontWeight: '700',
        }}>Session Expired</h1>
        <p style={{ 
          color: '#64748b', 
          marginBottom: '0.5rem',
          fontSize: '1rem',
          lineHeight: '1.6',
        }}>
          Your session has expired due to inactivity.
        </p>
        <p style={{ 
          color: '#64748b', 
          marginBottom: '2rem',
          fontSize: '1rem',
          lineHeight: '1.6',
        }}>
          Please log in again to continue.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Link href="/login" style={{
            display: 'inline-block',
            padding: '0.875rem 2.5rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            fontSize: '1rem',
            transition: 'all 0.3s',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
          }}>
            🔐 Log In Again
          </Link>
        </div>
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e2e8f0',
        }}>
          <Link href="/" style={{
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}>
            ← Go to Home Page
          </Link>
        </div>
      </div>
    </div>
  );
}