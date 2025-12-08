/**
 * ProtectedRoute Component
 * Wrapper component for client-side route protection
 * Redirects to login if user is not authenticated
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }

    if (!isLoading && isAuthenticated && requiredRoles) {
      const hasRequiredRole = requiredRoles.some(role => 
        user?.roles.includes(role)
      );

      if (!hasRequiredRole) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRoles, redirectTo, router]);

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.6)',
        zIndex: 9999,
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          border: '6px solid #e0e0e0',
          borderTop: '6px solid #00c853',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRoles) {
    const hasRequiredRole = requiredRoles.some(role => 
      user?.roles.includes(role)
    );

    if (!hasRequiredRole) {
      return null;
    }
  }

  return <>{children}</>;
}
