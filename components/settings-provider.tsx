'use client';

import React from 'react';
import { SettingsProvider as BaseSettingsProvider } from '../contexts/settings-context';
import { useAuthContext } from './auth-provider';

interface SettingsProviderProps {
  children: React.ReactNode;
}

/**
 * Settings Provider wrapper that integrates with the auth system
 * Automatically provides the current user's ID to the settings context
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const { user, isAuthenticated } = useAuthContext();

  // Only provide settings context if user is authenticated
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  return (
    <BaseSettingsProvider userId={user.id}>
      {children}
    </BaseSettingsProvider>
  );
}

// Re-export the hook for convenience
export { useSettings } from '../hooks/use-settings';