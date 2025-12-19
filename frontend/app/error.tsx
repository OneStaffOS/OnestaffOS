'use client';

import { useEffect } from 'react';
import styles from './page.module.css';

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
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <div className={styles.errorIcon}>⚠️</div>
        <h1 className={styles.errorTitle}>Something went wrong!</h1>
        <p className={styles.errorMessage}>
          We encountered an unexpected error. Please try again.
        </p>
        {error.digest && (
          <p className={styles.errorDigest}>
            Error ID: <code>{error.digest}</code>
          </p>
        )}
        <div className={styles.errorActions}>
          <button
            onClick={reset}
            className={styles.retryButton}
            type="button"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = '/dashboard')}
            className={styles.homeButton}
            type="button"
          >
            Go to Dashboard
          </button>
        </div>
      </div>

      <style jsx>{`
        .errorContainer {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .errorContent {
          background: white;
          border-radius: 16px;
          padding: 3rem;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .errorIcon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .errorTitle {
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 1rem;
        }

        .errorMessage {
          font-size: 1.125rem;
          color: #4a5568;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .errorDigest {
          font-size: 0.875rem;
          color: #718096;
          margin-bottom: 2rem;
          padding: 0.75rem;
          background: #f7fafc;
          border-radius: 8px;
        }

        .errorDigest code {
          font-family: 'Courier New', monospace;
          color: #e53e3e;
          font-weight: 600;
        }

        .errorActions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .retryButton,
        .homeButton {
          padding: 0.875rem 1.75rem;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .retryButton {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .retryButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }

        .homeButton {
          background: #f7fafc;
          color: #4a5568;
          border: 2px solid #e2e8f0;
        }

        .homeButton:hover {
          background: #edf2f7;
          border-color: #cbd5e0;
        }

        @media (max-width: 640px) {
          .errorContent {
            padding: 2rem;
          }

          .errorTitle {
            font-size: 1.5rem;
          }

          .errorActions {
            flex-direction: column;
          }

          .retryButton,
          .homeButton {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
