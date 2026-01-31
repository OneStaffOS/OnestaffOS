/**
 * AuthContext
 * Client-side authentication context provider
 * Manages user state and authentication status across the application
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { axios } from '@/lib/axios-config';

interface User {
  sub: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  /**
   * Fetch user data from backend using cookie-based authentication
   */
  const refreshUser = async () => {
    try {
      // Don't check for cookie existence - HTTP-only cookies can't be read by JS
      // Just try to fetch user data; backend will read cookie automatically
      const response = await axios.get('/auth/me');
      
      if (response.data.ok && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token expired or invalid - clear state but don't redirect
        console.log('Session expired or invalid');
        setUser(null);
        
        // If we're on session-expired page, don't retry to avoid infinite loop
        if (typeof window !== 'undefined' && window.location.pathname.includes('/session-expired')) {
          setIsLoading(false);
          return;
        }
      } else {
        console.error('Failed to fetch user:', error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    refreshUser();
  }, []);

  const login = (userData: User) => {
    // Backend already set HTTP-only cookie
    // Just update React state
    setUser(userData);
  };

  const logout = async () => {
    try {
      // Call backend logout to clear cookies
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
