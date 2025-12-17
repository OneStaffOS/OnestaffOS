/**
 * Dashboard Template Component
 * Wraps all dashboard pages with Suspense boundaries
 * This ensures proper async handling for React 19 and Next.js 16
 */

import { Suspense } from 'react';
import Spinner from '../components/Spinner';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Spinner fullScreen size="lg" />}>
      {children}
    </Suspense>
  );
}
