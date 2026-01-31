/**
 * Shared Dashboard Layout Component
 * Used by all role-specific dashboards
 */

"use client";

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './DashboardLayout.module.css';
import Spinner from './Spinner';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
import AIChatWidget from './AIChatWidget';
interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  role: string;
}

export default function DashboardLayout({ children, title, role }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is admin (should not see support button)
  const isAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);

  // Prevent hydration mismatch by not rendering until mounted and auth is ready
  if (!mounted || isLoading) {
    return <Spinner fullScreen size="lg" />;
  }

  return (
    <div className={styles.container} data-dashboard-role={role}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1>{title}</h1>
            <p className={styles.userInfo}>
              {user?.email} • {role}
            </p>
          </div>
          <div className={styles.actions}>
            {!isAdmin && (
              <button
                onClick={() => router.push('/support')}
                className={styles.supportBtn}
                title="Get Technical Support" data-dashboard-layout-button
              >
                 Support
              </button>
            )}
            {user?.roles && user.roles.length > 1 && (
              <button
                onClick={() => router.push('/dashboard/select-role')}
                className={styles.switchBtn}
                data-dashboard-layout-button
              >
                Switch Dashboard
              </button>
            )}
            <button onClick={logout} className={styles.logoutBtn} data-dashboard-layout-button>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {children}
      </main>

      {/* AI Help Desk Chat Widget */}
      <AIChatWidget position="bottom-right" />
    </div>
  );
}