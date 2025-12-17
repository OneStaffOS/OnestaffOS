/**
 * Loading Component
 * Global loading state for Next.js App Router
 * Displayed during page transitions and data fetching
 * Works with React 19 Suspense boundaries
 */

import Spinner from './components/Spinner';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function Loading() {
  return <Spinner fullScreen size="lg" />;
}
