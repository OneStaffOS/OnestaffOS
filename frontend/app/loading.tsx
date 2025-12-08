/**
 * Loading Component
 * Global loading state for Next.js App Router
 * Displayed during page transitions and data fetching
 */

'use client';

import Spinner from './components/Spinner';

export default function Loading() {
  return <Spinner fullScreen size="lg" />;
}
