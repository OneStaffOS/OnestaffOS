"use client";

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          margin: 0,
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
            }}>
              🚨
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#1a202c',
              marginBottom: '1rem',
            }}>
              Critical Error
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: '#4a5568',
              marginBottom: '1.5rem',
              lineHeight: 1.6,
            }}>
              A critical error occurred in the application. Please refresh the page or contact support if the problem persists.
            </p>
            {error.digest && (
              <p style={{
                fontSize: '0.875rem',
                color: '#718096',
                marginBottom: '2rem',
                padding: '0.75rem',
                background: '#f7fafc',
                borderRadius: '8px',
              }}>
                Error ID: <code style={{
                  fontFamily: '"Courier New", monospace',
                  color: '#e53e3e',
                  fontWeight: 600,
                }}>{error.digest}</code>
              </p>
            )}
            {error.message && (
              <p style={{
                fontSize: '0.875rem',
                color: '#718096',
                marginBottom: '2rem',
                padding: '0.75rem',
                background: '#fff5f5',
                borderRadius: '8px',
                border: '1px solid #feb2b2',
                wordBreak: 'break-word',
              }}>
                {error.message}
              </p>
            )}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={reset}
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
                Try again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '0.875rem 1.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#f7fafc',
                  color: '#4a5568',
                  transition: 'all 0.3s ease',
                }}
                type="button"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}