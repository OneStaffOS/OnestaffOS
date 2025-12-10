/**
 * Loading Component
 * Global loading state for Next.js App Router
 * Displayed during page transitions and data fetching
 * Works with React 19 Suspense boundaries
 */

import Spinner from './components/Spinner';

export default function Loading() {
  return <Spinner fullScreen size="lg" />;
}
