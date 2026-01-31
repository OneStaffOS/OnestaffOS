/**
 * SuspenseWrapper Component
 * Global wrapper for handling async components with proper Suspense boundaries
 * Fixes React 19 Suspense boundary issues in Next.js 16
 */

"use client";

import { Suspense, ReactNode } from 'react';
import Spinner from './Spinner';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  fullScreen?: boolean;
}

export default function SuspenseWrapper({ 
  children, 
  fallback,
  fullScreen = false 
}: SuspenseWrapperProps) {
  const defaultFallback = fullScreen ? (
    <Spinner fullScreen size="lg" />
  ) : (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <Spinner size="md" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}