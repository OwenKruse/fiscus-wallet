import { useContext, useCallback } from 'react';
import { SettingsContext } from '../contexts/settings-context';
import type {
  SettingsContextType,
  UpdateProfileSettingsRequest,
  UpdateNotificationSettingsRequest,
  UpdateDisplaySettingsRequest,
  UpdatePrivacySettingsRequest,
  UpdateAccountSettingsRequest,
  ChangePasswordRequest,
  ChangeEmailRequest,
} from '../types';

/**
 * Hook to access settings context with additional utilities
 */
export function useSettings(): SettingsContextType & {
  // Utility functions for common operations
  isSettingEnabled: (category: string, setting: string) => boolean;
  hasUnsavedChanges: boolean;
  clearError: () => void;
  updateSettingsSafely: <T>(
    updateFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ) => Promise<void>;
} {
  const context = useContext(SettingsContext);
  
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  // Check if a specific setting is enabled
  const isSettingEnabled = useCallback((category: string, setting: string): boolean => {
    if (!context.settings) return false;
    
    const categorySettings = context.settings[category as keyof typeof context.settings];
    if (!categorySettings || typeof categorySettings !== 'object') return false;
    
    return Boolean((categorySettings as any)[setting]);
  }, [context.settings]);

  // Check if there are unsaved changes (optimistic updates pending)
  const hasUnsavedChanges = false; // This would be implemented based on the reducer state

  // Clear error state
  const clearError = useCallback(() => {
    // This would dispatch a clear error action
    // For now, we'll just refresh settings which clears errors
    context.refreshSettings();
  }, [context]);

  // Safe settings update wrapper with error handling
  const updateSettingsSafely = useCallback(async <T>(
    updateFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<void> => {
    try {
      const result = await updateFn();
      onSuccess?.(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      onError?.(err);
      
      // Re-throw to allow component-level error handling
      throw err;
    }
  }, []);

  return {
    ...context,
    isSettingEnabled,
    hasUnsavedChanges,
    clearError,
    updateSettingsSafely,
  };
}

/**
 * Hook for profile settings with validation
 */
export function useProfileSettings() {
  const { settings, updateProfile, isLoading, error } = useSettings();
  
  const updateProfileWithValidation = useCallback(async (data: UpdateProfileSettingsRequest) => {
    // Basic client-side validation
    if (data.firstName && data.firstName.trim().length === 0) {
      throw new Error('First name cannot be empty');
    }
    
    if (data.lastName && data.lastName.trim().length === 0) {
      throw new Error('Last name cannot be empty');
    }
    
    if (data.phone && data.phone.length > 0 && !/^\+?[\d\s\-\(\)]+$/.test(data.phone)) {
      throw new Error('Please enter a valid phone number');
    }
    
    return await updateProfile(data);
  }, [updateProfile]);

  return {
    profile: settings?.profile,
    updateProfile: updateProfileWithValidation,
    isLoading,
    error,
  };
}

/**
 * Hook for notification settings with smart defaults
 */
export function useNotificationSettings() {
  const { settings, updateNotifications, isLoading, error } = useSettings();
  
  const toggleNotification = useCallback(async (type: keyof UpdateNotificationSettingsRequest) => {
    if (!settings?.notifications) return;
    
    const currentValue = settings.notifications[type as keyof typeof settings.notifications];
    
    return await updateNotifications({
      [type]: !currentValue,
    });
  }, [settings, updateNotifications]);

  const enableAllNotifications = useCallback(async () => {
    return await updateNotifications({
      notificationsEnabled: true,
      emailNotifications: true,
      goalNotifications: true,
      accountAlerts: true,
      systemUpdates: true,
    });
  }, [updateNotifications]);

  const disableAllNotifications = useCallback(async () => {
    return await updateNotifications({
      notificationsEnabled: false,
      emailNotifications: false,
      goalNotifications: false,
      accountAlerts: false,
      systemUpdates: false,
      marketingEmails: false,
    });
  }, [updateNotifications]);

  return {
    notifications: settings?.notifications,
    updateNotifications,
    toggleNotification,
    enableAllNotifications,
    disableAllNotifications,
    isLoading,
    error,
  };
}

/**
 * Hook for display settings with theme management
 */
export function useDisplaySettings() {
  const { settings, updateDisplay, isLoading, error } = useSettings();
  
  const changeTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    return await updateDisplay({ theme });
  }, [updateDisplay]);

  const changeCurrency = useCallback(async (currency: string) => {
    return await updateDisplay({ currencyFormat: currency });
  }, [updateDisplay]);

  const changeDateFormat = useCallback(async (dateFormat: string) => {
    return await updateDisplay({ dateFormat });
  }, [updateDisplay]);

  const changeLanguage = useCallback(async (language: string) => {
    return await updateDisplay({ language });
  }, [updateDisplay]);

  return {
    display: settings?.display,
    updateDisplay,
    changeTheme,
    changeCurrency,
    changeDateFormat,
    changeLanguage,
    isLoading,
    error,
  };
}

/**
 * Hook for privacy settings with security validation
 */
export function usePrivacySettings() {
  const { settings, updatePrivacy, changePassword, isLoading, error } = useSettings();
  
  const toggleTwoFactor = useCallback(async () => {
    if (!settings?.privacy) return;
    
    return await updatePrivacy({
      twoFactorEnabled: !settings.privacy.twoFactorEnabled,
    });
  }, [settings, updatePrivacy]);

  const updateDataSharing = useCallback(async (analytics: boolean, marketing: boolean) => {
    return await updatePrivacy({
      dataSharingAnalytics: analytics,
      dataSharingMarketing: marketing,
    });
  }, [updatePrivacy]);

  const changePasswordWithValidation = useCallback(async (data: ChangePasswordRequest) => {
    // Client-side validation
    if (data.newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (data.currentPassword === data.newPassword) {
      throw new Error('New password must be different from current password');
    }
    
    return await changePassword(data);
  }, [changePassword]);

  return {
    privacy: settings?.privacy,
    updatePrivacy,
    toggleTwoFactor,
    updateDataSharing,
    changePassword: changePasswordWithValidation,
    isLoading,
    error,
  };
}

/**
 * Hook for account settings with sync management
 */
export function useAccountSettings() {
  const { settings, updateAccounts, isLoading, error } = useSettings();
  
  const toggleAutoSync = useCallback(async () => {
    if (!settings?.accounts) return;
    
    return await updateAccounts({
      autoSyncEnabled: !settings.accounts.autoSyncEnabled,
    });
  }, [settings, updateAccounts]);

  const changeSyncFrequency = useCallback(async (frequency: 'realtime' | 'hourly' | 'daily') => {
    return await updateAccounts({
      syncFrequency: frequency,
    });
  }, [updateAccounts]);

  return {
    accounts: settings?.accounts,
    updateAccounts,
    toggleAutoSync,
    changeSyncFrequency,
    isLoading,
    error,
  };
}