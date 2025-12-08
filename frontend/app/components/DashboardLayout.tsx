/**
 * Shared Dashboard Layout Component
 * Used by all role-specific dashboards
 */

'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  role: string;
}

export default function DashboardLayout({ children, title, role }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1>{title}</h1>
            <p className={styles.userInfo}>
              {user?.email} • {role}
            </p>
          </div>
          <div className={styles.actions}>
            {user?.roles && user.roles.length > 1 && (
              <button
                onClick={() => router.push('/dashboard/select-role')}
                className={styles.switchBtn}
              >
                Switch Dashboard
              </button>
            )}
            <button onClick={logout} className={styles.logoutBtn}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
