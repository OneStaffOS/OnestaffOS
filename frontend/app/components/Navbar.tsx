'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';
import Link from 'next/link';
import { SystemRole } from '@/lib/roles';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

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
          
          {user ? (
            <>
              <Link href="/profile" className={styles.navLink}>
                Profile
              </Link>
              <Link href="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
              <Link href="/job-offers" className={styles.navLink}>
                Career Center
              </Link>
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
