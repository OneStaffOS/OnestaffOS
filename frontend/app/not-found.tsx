'use client';

/**
 * NotFound Component (404 Page)
 * Global 404 error page for Next.js App Router
 * Displayed when a route is not found
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

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
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          fontSize: '6rem',
          fontWeight: 700,
          color: '#667eea',
          marginBottom: '1rem',
          lineHeight: 1,
        }}>
          404
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#1a202c',
          marginBottom: '1rem',
        }}>
          Page Not Found
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: '#4a5568',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => router.back()}
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
            ← Go Back
          </button>
          <Link
            href="/"
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
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: '0.875rem 1.75rem',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              color: 'white',
              transition: 'all 0.3s ease',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Dashboard
          </Link>
        </div>

        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e2e8f0',
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#718096',
          }}>
            Lost? Here are some helpful links:
          </p>
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            marginTop: '1rem',
            flexWrap: 'wrap',
          }}>
            <Link
              href="/profile"
              style={{
                color: '#667eea',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Profile
            </Link>
            <Link
              href="/job-offers"
              style={{
                color: '#667eea',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Career Center
            </Link>
            <Link
              href="/login"
              style={{
                color: '#667eea',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
