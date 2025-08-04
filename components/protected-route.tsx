"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from './auth-provider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/signin',
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        // User is not authenticated but route requires auth
        router.push(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        // User is authenticated but route is for unauthenticated users (like signin/signup)
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-black"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Show children if authentication requirements are met
  if ((requireAuth && isAuthenticated) || (!requireAuth && !isAuthenticated)) {
    return <>{children}</>;
  }

  // Show loading while redirecting
  return fallback || (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-black"></div>
        <span className="text-gray-600">Redirecting...</span>
      </div>
    </div>
  );
}

// Component for routes that should only be accessible to unauthenticated users
export function PublicRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth={false} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

// Component for routes that require authentication
export function PrivateRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
} 