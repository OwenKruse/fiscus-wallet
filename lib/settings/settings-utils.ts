import type {
  UserSettings,
  UpdateProfileSettingsRequest,
  UpdateNotificationSettingsRequest,
  UpdateDisplaySettingsRequest,
  UpdatePrivacySettingsRequest,
  UpdateAccountSettingsRequest,
} from '../../types';

/**
 * Utility functions for settings management
 */

// Type for settings update data
export type SettingsUpdateData = 
  | UpdateProfileSettingsRequest
  | UpdateNotificationSettingsRequest
  | UpdateDisplaySettingsRequest
  | UpdatePrivacySettingsRequest
  | UpdateAccountSettingsRequest;

/**
 * Apply optimistic update to settings object
 */
export function applyOptimisticUpdate(
  settings: UserSettings,
  category: keyof UserSettings,
  updates: SettingsUpdateData
): UserSettings {
  if (!settings || !(category in settings)) {
    return settings;
  }

  return {
    ...settings,
    [category]: {
      ...settings[category],
      ...updates,
    },
  };
}

/**
 * Create a deep copy of settings for rollback purposes
 */
export function createSettingsSnapshot(settings: UserSettings | null): UserSettings | null {
  if (!settings) return null;
  
  return JSON.parse(JSON.stringify(settings));
}

/**
 * Validate settings update data
 */
export function validateSettingsUpdate(
  category: string,
  data: SettingsUpdateData
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (category) {
    case 'profile':
      const profileData = data as UpdateProfileSettingsRequest;
      
      if (profileData.firstName !== undefined && profileData.firstName.trim().length === 0) {
        errors.push('First name cannot be empty');
      }
      
      if (profileData.lastName !== undefined && profileData.lastName.trim().length === 0) {
        errors.push('Last name cannot be empty');
      }
      
      if (profileData.phone !== undefined && profileData.phone.length > 0) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(profileData.phone)) {
          errors.push('Please enter a valid phone number');
        }
      }
      break;

    case 'notifications':
      // Notification settings are mostly boolean, minimal validation needed
      break;

    case 'display':
      const displayData = data as UpdateDisplaySettingsRequest;
      
      if (displayData.theme && !['light', 'dark', 'system'].includes(displayData.theme)) {
        errors.push('Invalid theme selection');
      }
      
      if (displayData.currencyFormat && displayData.currencyFormat.length !== 3) {
        errors.push('Currency format must be a 3-letter code');
      }
      break;

    case 'privacy':
      const privacyData = data as UpdatePrivacySettingsRequest;
      
      if (privacyData.sessionTimeoutMinutes !== undefined) {
        if (privacyData.sessionTimeoutMinutes < 5 || privacyData.sessionTimeoutMinutes > 1440) {
          errors.push('Session timeout must be between 5 minutes and 24 hours');
        }
      }
      break;

    case 'accounts':
      const accountsData = data as UpdateAccountSettingsRequest;
      
      if (accountsData.syncFrequency && !['realtime', 'hourly', 'daily'].includes(accountsData.syncFrequency)) {
        errors.push('Invalid sync frequency');
      }
      break;

    default:
      errors.push('Invalid settings category');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Debounce function for auto-save functionality
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Create a settings change event for analytics/logging
 */
export function createSettingsChangeEvent(
  userId: string,
  category: string,
  changes: Record<string, any>,
  oldValues?: Record<string, any>
) {
  return {
    type: `settings.${category}.updated`,
    userId,
    category,
    changes,
    oldValues,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if settings have unsaved changes
 */
export function hasUnsavedChanges(
  currentSettings: UserSettings | null,
  originalSettings: UserSettings | null
): boolean {
  if (!currentSettings || !originalSettings) return false;
  
  // Simple deep comparison - in production, you might want a more sophisticated approach
  return JSON.stringify(currentSettings) !== JSON.stringify(originalSettings);
}

/**
 * Get changed fields between two settings objects
 */
export function getChangedFields(
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>
): string[] {
  const changedFields: string[] = [];
  
  for (const key in newSettings) {
    if (newSettings[key] !== oldSettings[key]) {
      changedFields.push(key);
    }
  }
  
  return changedFields;
}

/**
 * Format error message for user display
 */
export function formatSettingsError(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('validation')) {
      return 'Please check your input and try again.';
    }
    
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (error.message.includes('unauthorized')) {
      return 'You are not authorized to make this change.';
    }
    
    if (error.message.includes('not found')) {
      return 'Settings not found. Please refresh the page and try again.';
    }
    
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Create retry function with exponential backoff
 */
export function createRetryFunction<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): () => Promise<T> {
  return async () => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  };
}

/**
 * Settings cache utilities
 */
export const settingsCache = {
  /**
   * Get settings from localStorage
   */
  get(userId: string): UserSettings | null {
    try {
      const cached = localStorage.getItem(`settings_${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  },

  /**
   * Save settings to localStorage
   */
  set(userId: string, settings: UserSettings): void {
    try {
      localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
    } catch {
      // Ignore localStorage errors
    }
  },

  /**
   * Remove settings from localStorage
   */
  remove(userId: string): void {
    try {
      localStorage.removeItem(`settings_${userId}`);
    } catch {
      // Ignore localStorage errors
    }
  },

  /**
   * Clear all cached settings
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('settings_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore localStorage errors
    }
  },
};