'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Default() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page after a brief moment
    const timeout = setTimeout(() => {
      router.push('/');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          animation: 'spin 2s linear infinite',
        }}>
          🔄
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#1a202c',
          marginBottom: '1rem',
        }}>
          Loading...
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: '#4a5568',
          marginBottom: '1.5rem',
          lineHeight: 1.6,
        }}>
          Redirecting you to the home page...
        </p>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '0.875rem 1.75rem',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            transition: 'all 0.3s ease',
          }}
          type="button"
        >
          Go Now
        </button>

        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
