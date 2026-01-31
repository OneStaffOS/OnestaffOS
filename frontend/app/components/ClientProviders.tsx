/**
 * Client Providers Wrapper
 * Wraps all client-side providers (AuthProvider, SocketProvider, etc.)
 * Allows the root layout to remain a Server Component
 */

'use client';

import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </AuthProvider>
  );
}
