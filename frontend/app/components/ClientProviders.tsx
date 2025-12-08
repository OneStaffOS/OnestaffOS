/**
 * Client Providers Wrapper
 * Wraps all client-side providers (AuthProvider, etc.)
 * Allows the root layout to remain a Server Component
 */

'use client';

import { AuthProvider } from '../context/AuthContext';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
