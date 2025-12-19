'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';
import Link from 'next/link';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering auth-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          OneStaff OS
        </Link>
        
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          
          {!mounted || isLoading ? (
            // Render placeholder during SSR and initial load to prevent hydration mismatch
            <div style={{ width: '200px', height: '40px' }} />
          ) : user ? (
            <>
              <Link href="/profile" className={styles.navLink}>
                Profile
              </Link>
              <Link href="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
              {/* Career Center - Only visible to Job Candidates */}
              {ensureArray(user.roles).includes(SystemRole.JOB_CANDIDATE) && (
                <Link href="/job-offers" className={styles.navLink}>
                  Career Center
                </Link>
              )}
              {/* Shift Types is accessible from the Admin/Manager dashboards (quick actions), not the navbar */}
              <button onClick={handleLogout} className={styles.logoutButton}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.loginButton}>
                Login
              </Link>
              <Link href="/register" className={styles.registerButton}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
