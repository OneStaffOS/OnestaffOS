/**
 * ProtectedRoute Component
 * Wrapper component for client-side route protection
 * Redirects to login if user is not authenticated
 */

'use client';

import { useEffect, useState } from 'react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
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
  }, [mounted, isAuthenticated, isLoading, user, requiredRoles, redirectTo, router]);

  // Don't render anything until mounted on client
  // This prevents hydration mismatches - let child components handle loading states
  if (!mounted) {
    return null;
  }

  // During loading, render children (they will handle their own loading states)
  if (isLoading) {
    return <>{children}</>;
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
