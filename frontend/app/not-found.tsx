/**
 * NotFound Component (404 Page)
 * Global 404 error page for Next.js App Router
 * Displayed when a route is not found
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
        <h1 style={{
          fontSize: '6rem',
          margin: '0 0 1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '700',
        }}>404</h1>
        <h2 style={{ margin: '0 0 1rem', color: '#333' }}>Page Not Found</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          padding: '0.75rem 2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          transition: 'transform 0.2s',
        }}>
          Go Home
        </Link>
      </div>
    </div>
  );
}
