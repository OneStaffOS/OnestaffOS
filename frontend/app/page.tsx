/**
 * HomePage (Route: /)
 * Landing page for unauthenticated users
 * Features: Hero section, key features grid, CTA buttons for registration and login
 */

import Link from "next/link";
import styles from "./home.module.css";

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function HomePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>OneStaff OS</h1>
          <p className={styles.subtitle}>
            Complete HR Management Solution for Modern Organizations
          </p>
          <p className={styles.description}>
            Streamline your HR operations with our all-in-one platform covering recruitment, 
            employee management, payroll, performance tracking, and more.
          </p>
          <div className={styles.ctas}>
            <Link href="/register" className={styles.primary}>
              Get Started
            </Link>
            <Link href="/login" className={styles.secondary}>
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
