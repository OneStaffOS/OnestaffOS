/**
 * UnauthorizedPage (Route: /unauthorized)
 * Displayed when a user tries to access a route without proper permissions
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '500px',
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
        }}>🚫</div>
        <h1 style={{
          fontSize: '2rem',
          margin: '0 0 1rem',
          color: '#333',
        }}>Access Denied</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          You don&apos;t have permission to access this page.
        </p>
        {isHydrated && user && (
          <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Logged in as: {user.email}
          </p>
        )}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/job-offers" style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
          }}>
            Browse Jobs
          </Link>
          <Link href="/" style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: '#f5f5f5',
            color: '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
          }}>
            Go Home
          </Link>
          {isHydrated && user && (
            <button 
              onClick={logout}
              style={{
                padding: '0.75rem 2rem',
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
