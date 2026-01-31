"use client";

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <>
      <style>{`
        @keyframes errorPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes errorFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '3rem',
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.35)',
          animation: 'errorFadeIn 0.5s ease-out'
        }}>
          <div style={{
            fontSize: '5rem',
            marginBottom: '1.5rem',
            animation: 'errorPulse 2s ease-in-out infinite',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
          }}>
            ⚠️
          </div>
          
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: '800',
            color: '#1a202c',
            marginBottom: '1rem',
            letterSpacing: '-0.025em'
          }}>
            Oops! Something went wrong
          </h1>
          
          <p style={{
            fontSize: '1.125rem',
            color: '#4a5568',
            marginBottom: '1.5rem',
            lineHeight: '1.75'
          }}>
            We encountered an unexpected error. Don&apos;t worry, we&apos;re on it!
          </p>
          
          {error.digest && (
            <div style={{
              fontSize: '0.875rem',
              color: '#718096',
              marginBottom: '2rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Error Details:</div>
              <code style={{
                fontFamily: '"SF Mono", "Monaco", "Consolas", monospace',
                color: '#e53e3e',
                fontWeight: '600',
                fontSize: '0.8125rem',
                backgroundColor: '#fff5f5',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px'
              }}>
                {error.digest}
              </code>
            </div>
          )}
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '2rem'
          }}>
            <button
              onClick={reset}
              type="button"
              style={{
                padding: '1rem 2rem',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                minWidth: '140px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              🔄 Try Again
            </button>
            
            <button
              onClick={() => (window.location.href = '/dashboard')}
              type="button"
              style={{
                padding: '1rem 2rem',
                border: '2px solid #cbd5e0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'white',
                color: '#4a5568',
                minWidth: '140px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f7fafc';
                e.currentTarget.style.borderColor = '#a0aec0';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#cbd5e0';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🏠 Go to Dashboard
            </button>
          </div>
          
          <p style={{
            marginTop: '2rem',
            fontSize: '0.875rem',
            color: '#a0aec0',
            fontStyle: 'italic'
          }}>
            If this problem persists, please contact support
          </p>
        </div>
      </div>
    </>
  );
}