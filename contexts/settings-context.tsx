'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { getClientSettingsService } from '../lib/settings/client-settings-service';
import {
  applyOptimisticUpdate,
  createSettingsSnapshot,
  validateSettingsUpdate,
  createSettingsChangeEvent,
  formatSettingsError,
  createRetryFunction,
  settingsCache,
} from '../lib/settings/settings-utils';
import type {
  UserSettings,
  UpdateProfileSettingsRequest,
  UpdateNotificationSettingsRequest,
  UpdateDisplaySettingsRequest,
  UpdatePrivacySettingsRequest,
  UpdateAccountSettingsRequest,
  ChangePasswordRequest,
  ChangeEmailRequest,
  ExportUserDataResponse,
  SettingsContextType,
} from '../types';

// Settings State Types
interface SettingsState {
  settings: UserSettings | null;
  originalSettings: UserSettings | null; // For rollback functionality
  isLoading: boolean;
  error: string | null;
  optimisticUpdates: Map<string, any>;
  lastUpdated: string | null;
  retryCount: number;
}

// Settings Actions
type SettingsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SETTINGS'; payload: UserSettings }
  | { type: 'OPTIMISTIC_UPDATE'; payload: { category: string; data: any; originalSettings: UserSettings } }
  | { type: 'ROLLBACK_UPDATE'; payload: string }
  | { type: 'CONFIRM_UPDATE'; payload: string }
  | { type: 'INCREMENT_RETRY' }
  | { type: 'RESET_RETRY' }
  | { type: 'RESET_STATE' };

// Initial State
const initialState: SettingsState = {
  settings: null,
  originalSettings: null,
  isLoading: false,
  error: null,
  optimisticUpdates: new Map(),
  lastUpdated: null,
  retryCount: 0,
};

// Settings Reducer
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        originalSettings: createSettingsSnapshot(action.payload),
        error: null,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
        retryCount: 0,
      };



    case 'OPTIMISTIC_UPDATE': {
      const { category, data, originalSettings } = action.payload;
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.set(category, data);

      // Apply optimistic update using utility function
      let updatedSettings = state.settings;
      if (updatedSettings && category in updatedSettings) {
        updatedSettings = applyOptimisticUpdate(updatedSettings, category as keyof UserSettings, data);
      }

      return {
        ...state,
        settings: updatedSettings,
        originalSettings: originalSettings || state.originalSettings,
        optimisticUpdates: newOptimisticUpdates,
        error: null,
      };
    }

    case 'ROLLBACK_UPDATE': {
      const category = action.payload;
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.delete(category);

      // Rollback to original settings
      return {
        ...state,
        settings: state.originalSettings,
        optimisticUpdates: newOptimisticUpdates,
        error: 'Update failed. Settings have been restored.',
      };
    }

    case 'CONFIRM_UPDATE': {
      const category = action.payload;
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.delete(category);

      return {
        ...state,
        optimisticUpdates: newOptimisticUpdates,
        error: null,
      };
    }

    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: state.retryCount + 1,
      };

    case 'RESET_RETRY':
      return {
        ...state,
        retryCount: 0,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Settings Context
const SettingsContext = createContext<SettingsContextType | null>(null);

// Settings Provider Props
interface SettingsProviderProps {
  children: React.ReactNode;
  userId?: string;
}

// Settings Provider Component
export function SettingsProvider({ children, userId }: SettingsProviderProps) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const settingsService = getClientSettingsService();

  // Load initial settings with caching and retry logic
  const loadSettings = useCallback(async () => {
    if (!userId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Try to load from cache first
      const cachedSettings = settingsCache.get(userId);
      if (cachedSettings) {
        dispatch({ type: 'SET_SETTINGS', payload: cachedSettings });
      }

      // Always fetch fresh data from server
      const retryFn = createRetryFunction(
        () => settingsService.getUserSettings(),
        3,
        1000
      );
      
      const settings = await retryFn();
      
      // Cache the fresh settings
      settingsCache.set(userId, settings);
      
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      dispatch({ type: 'RESET_RETRY' });
    } catch (error) {
      dispatch({ type: 'INCREMENT_RETRY' });
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [userId, settingsService]);

  // Load settings on mount and when userId changes
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update profile settings with optimistic updates
  const updateProfile = useCallback(async (data: UpdateProfileSettingsRequest) => {
    if (!userId) throw new Error('User ID is required');
    if (!state.settings) throw new Error('Settings not loaded');

    // Validate the update data
    const validation = validateSettingsUpdate('profile', data);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }

    // Create snapshot for rollback
    const originalSettings = createSettingsSnapshot(state.settings);
    
    // Apply optimistic update
    dispatch({ 
      type: 'OPTIMISTIC_UPDATE', 
      payload: { category: 'profile', data, originalSettings: originalSettings! } 
    });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.updateProfileSettings(data),
        2,
        1000
      );
      
      const updatedProfile = await retryFn();
      
      // Confirm the update was successful
      dispatch({ type: 'CONFIRM_UPDATE', payload: 'profile' });
      
      // Update the full settings with the server response
      const updatedSettings = {
        ...state.settings,
        profile: updatedProfile,
      };
      
      // Update cache
      settingsCache.set(userId, updatedSettings);
      
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      
      // Log the change event
      const changeEvent = createSettingsChangeEvent(
        userId,
        'profile',
        data,
        originalSettings?.profile
      );
      console.log('Settings change event:', changeEvent);
      
    } catch (error) {
      // Rollback optimistic update
      dispatch({ type: 'ROLLBACK_UPDATE', payload: 'profile' });
      
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService, state.settings]);

  // Update notification settings with optimistic updates
  const updateNotifications = useCallback(async (data: UpdateNotificationSettingsRequest) => {
    if (!userId) throw new Error('User ID is required');
    if (!state.settings) throw new Error('Settings not loaded');

    const validation = validateSettingsUpdate('notifications', data);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }

    const originalSettings = createSettingsSnapshot(state.settings);
    dispatch({ 
      type: 'OPTIMISTIC_UPDATE', 
      payload: { category: 'notifications', data, originalSettings: originalSettings! } 
    });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.updateNotificationSettings(data),
        2,
        1000
      );
      
      const updatedNotifications = await retryFn();
      dispatch({ type: 'CONFIRM_UPDATE', payload: 'notifications' });
      
      const updatedSettings = {
        ...state.settings,
        notifications: updatedNotifications,
      };
      
      settingsCache.set(userId, updatedSettings);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      
      const changeEvent = createSettingsChangeEvent(
        userId,
        'notifications',
        data,
        originalSettings?.notifications
      );
      console.log('Settings change event:', changeEvent);
      
    } catch (error) {
      dispatch({ type: 'ROLLBACK_UPDATE', payload: 'notifications' });
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService, state.settings]);

  // Update display settings with optimistic updates
  const updateDisplay = useCallback(async (data: UpdateDisplaySettingsRequest) => {
    if (!userId) throw new Error('User ID is required');
    if (!state.settings) throw new Error('Settings not loaded');

    const validation = validateSettingsUpdate('display', data);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }

    const originalSettings = createSettingsSnapshot(state.settings);
    dispatch({ 
      type: 'OPTIMISTIC_UPDATE', 
      payload: { category: 'display', data, originalSettings: originalSettings! } 
    });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.updateDisplaySettings(data),
        2,
        1000
      );
      
      const updatedDisplay = await retryFn();
      dispatch({ type: 'CONFIRM_UPDATE', payload: 'display' });
      
      const updatedSettings = {
        ...state.settings,
        display: updatedDisplay,
      };
      
      settingsCache.set(userId, updatedSettings);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      
      const changeEvent = createSettingsChangeEvent(
        userId,
        'display',
        data,
        originalSettings?.display
      );
      console.log('Settings change event:', changeEvent);
      
    } catch (error) {
      dispatch({ type: 'ROLLBACK_UPDATE', payload: 'display' });
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService, state.settings]);

  // Update privacy settings with optimistic updates
  const updatePrivacy = useCallback(async (data: UpdatePrivacySettingsRequest) => {
    if (!userId) throw new Error('User ID is required');
    if (!state.settings) throw new Error('Settings not loaded');

    const validation = validateSettingsUpdate('privacy', data);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }

    const originalSettings = createSettingsSnapshot(state.settings);
    dispatch({ 
      type: 'OPTIMISTIC_UPDATE', 
      payload: { category: 'privacy', data, originalSettings: originalSettings! } 
    });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.updatePrivacySettings(data),
        2,
        1000
      );
      
      const updatedPrivacy = await retryFn();
      dispatch({ type: 'CONFIRM_UPDATE', payload: 'privacy' });
      
      const updatedSettings = {
        ...state.settings,
        privacy: updatedPrivacy,
      };
      
      settingsCache.set(userId, updatedSettings);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      
      const changeEvent = createSettingsChangeEvent(
        userId,
        'privacy',
        data,
        originalSettings?.privacy
      );
      console.log('Settings change event:', changeEvent);
      
    } catch (error) {
      dispatch({ type: 'ROLLBACK_UPDATE', payload: 'privacy' });
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService, state.settings]);

  // Update account settings with optimistic updates
  const updateAccounts = useCallback(async (data: UpdateAccountSettingsRequest) => {
    if (!userId) throw new Error('User ID is required');
    if (!state.settings) throw new Error('Settings not loaded');

    const validation = validateSettingsUpdate('accounts', data);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }

    const originalSettings = createSettingsSnapshot(state.settings);
    dispatch({ 
      type: 'OPTIMISTIC_UPDATE', 
      payload: { category: 'accounts', data, originalSettings: originalSettings! } 
    });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.updateAccountSettings(data),
        2,
        1000
      );
      
      const updatedAccounts = await retryFn();
      dispatch({ type: 'CONFIRM_UPDATE', payload: 'accounts' });
      
      const updatedSettings = {
        ...state.settings,
        accounts: updatedAccounts,
      };
      
      settingsCache.set(userId, updatedSettings);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      
      const changeEvent = createSettingsChangeEvent(
        userId,
        'accounts',
        data,
        originalSettings?.accounts
      );
      console.log('Settings change event:', changeEvent);
      
    } catch (error) {
      dispatch({ type: 'ROLLBACK_UPDATE', payload: 'accounts' });
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService, state.settings]);

  // Change password
  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    if (!userId) throw new Error('User ID is required');

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.changePassword(data),
        2,
        1000
      );
      
      await retryFn();
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // Log the change event
      const changeEvent = createSettingsChangeEvent(
        userId,
        'password',
        { passwordChanged: true }
      );
      console.log('Settings change event:', changeEvent);
      
    } catch (error) {
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService]);

  // Change email
  const changeEmail = useCallback(async (data: ChangeEmailRequest) => {
    if (!userId) throw new Error('User ID is required');

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.changeEmail(data),
        2,
        1000
      );
      
      await retryFn();
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // Log the change event
      const changeEvent = createSettingsChangeEvent(
        userId,
        'email',
        { newEmail: data.newEmail }
      );
      console.log('Settings change event:', changeEvent);
      
      // Refresh settings to get updated email
      await loadSettings();
    } catch (error) {
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService, loadSettings]);

  // Reset settings
  const resetSettings = useCallback(async (category?: string) => {
    if (!userId) throw new Error('User ID is required');

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.resetUserSettings(category as any),
        2,
        1000
      );
      
      await retryFn();
      
      // Clear cache for this user
      settingsCache.remove(userId);
      
      // Log the change event
      const changeEvent = createSettingsChangeEvent(
        userId,
        category || 'all',
        { reset: true }
      );
      console.log('Settings change event:', changeEvent);
      
      // Reload settings after reset
      await loadSettings();
    } catch (error) {
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService, loadSettings]);

  // Export user data
  const exportData = useCallback(async (): Promise<ExportUserDataResponse> => {
    if (!userId) throw new Error('User ID is required');

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const retryFn = createRetryFunction(
        () => settingsService.exportUserData(),
        2,
        1000
      );
      
      const exportedData = await retryFn();
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // Log the export event
      const changeEvent = createSettingsChangeEvent(
        userId,
        'export',
        { exported: true }
      );
      console.log('Settings change event:', changeEvent);
      
      return exportedData as ExportUserDataResponse;
    } catch (error) {
      const errorMessage = formatSettingsError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [userId, settingsService]);

  // Refresh settings
  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  // Context value
  const contextValue: SettingsContextType = {
    settings: state.settings,
    preferences: null, // Not used in current implementation
    isLoading: state.isLoading,
    error: state.error,
    updateProfile,
    updateNotifications,
    updateDisplay,
    updatePrivacy,
    updateAccounts,
    changePassword,
    changeEmail,
    resetSettings,
    exportData,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

// Hook to use settings context
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
}

// Export context for testing
export { SettingsContext };