/**
 * DashboardPage (Route: /dashboard)
 * Main dashboard - redirects to role-specific dashboard
 * If user has multiple roles, shows role selection
 */

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.roles) {
      const dashboardRoute = getDashboardRoute(user.roles);
      
      if (dashboardRoute) {
        router.push(dashboardRoute);
      } else {
        // Multiple roles - go to selection page
        router.push('/dashboard/select-role');
      }
    } else {
      router.push('/job-offers');
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'rgba(255, 255, 255, 0.6)'
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