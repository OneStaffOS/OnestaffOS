/**
 * Template Component
 * Wraps all pages in the app directory with Suspense boundaries
 * This ensures proper async handling for React 19 and Next.js 16
 */

import { Suspense } from 'react';
import Spinner from './components/Spinner';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Spinner fullScreen size="lg" />}>
      {children}
    </Suspense>
  );
}
