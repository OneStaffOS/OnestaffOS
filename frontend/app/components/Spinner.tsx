/**
 * Spinner Component
 * Reusable loading spinner with consistent green styling
 */

'use client';

import React from 'react';

interface SpinnerProps {
  /** Whether to show full-screen overlay backdrop */
  fullScreen?: boolean;
  /** Size of the spinner: 'sm' (32px), 'md' (48px), 'lg' (64px) */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message to display below spinner */
  message?: string;
}

const sizeMap = {
  sm: { width: 32, border: 4 },
  md: { width: 48, border: 5 },
  lg: { width: 64, border: 6 },
};

export default function Spinner({ fullScreen = false, size = 'md', message }: SpinnerProps) {
  const { width, border } = sizeMap[size];

  const spinnerElement = (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: `${width}px`,
          height: `${width}px`,
          border: `${border}px solid #e0e0e0`,
          borderTopColor: '#00c853',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
          margin: message ? '0 auto 12px' : '0 auto',
        }}
      />
      {message && (
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{message}</p>
      )}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255, 255, 255, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}
      >
        {spinnerElement}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
      }}
    >
      {spinnerElement}
    </div>
  );
}

/**
 * Inline spinner for use within text or buttons
 */
export function InlineSpinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        border: '2px solid #e0e0e0',
        borderTopColor: '#00c853',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
        verticalAlign: 'middle',
        marginRight: '8px',
      }}
    >
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </span>
  );
}
