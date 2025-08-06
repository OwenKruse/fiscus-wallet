import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsContext } from '../settings-context';
import { 
  applyOptimisticUpdate,
  createSettingsSnapshot,
  validateSettingsUpdate,
  settingsCache,
} from '../../lib/settings/settings-utils';
import type { UserSettings } from '../../types';

// Mock localStorage for testing
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

describe('SettingsContext', () => {
  const mockUserId = 'test-user-id';
  const mockSettings: UserSettings = {
    id: '1',
    userId: mockUserId,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      emailVerified: true,
    },
    notifications: {
      enabled: true,
      email: true,
      goalProgress: true,
      accountAlerts: true,
      systemUpdates: false,
      marketingEmails: false,
    },
    display: {
      theme: 'light',
      currency: 'USD',
      dateFormat: 'MM/dd/yyyy',
      timezone: 'America/New_York',
      language: 'en',
    },
    privacy: {
      twoFactorEnabled: false,
      dataSharingAnalytics: false,
      dataSharingMarketing: false,
      sessionTimeoutMinutes: 480,
    },
    accounts: {
      autoSyncEnabled: true,
      syncFrequency: 'daily',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should export SettingsContext', () => {
    expect(SettingsContext).toBeDefined();
  });

  describe('Settings utilities', () => {
    it('should apply optimistic updates correctly', () => {
      const updates = { firstName: 'Jane' };
      const updatedSettings = applyOptimisticUpdate(mockSettings, 'profile', updates);
      
      expect(updatedSettings.profile.firstName).toBe('Jane');
      expect(updatedSettings.profile.lastName).toBe('Doe'); // Should preserve other fields
    });

    it('should create settings snapshots', () => {
      const snapshot = createSettingsSnapshot(mockSettings);
      
      expect(snapshot).toEqual(mockSettings);
      expect(snapshot).not.toBe(mockSettings); // Should be a different object
    });

    it('should validate profile settings updates', () => {
      const validData = { firstName: 'Jane', lastName: 'Smith' };
      const invalidData = { firstName: '', phone: 'invalid-phone' };
      
      const validResult = validateSettingsUpdate('profile', validData);
      const invalidResult = validateSettingsUpdate('profile', invalidData);
      
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should validate display settings updates', () => {
      const validData = { theme: 'dark' as const, currencyFormat: 'EUR' };
      const invalidData = { theme: 'invalid' as any, currencyFormat: 'INVALID' };
      
      const validResult = validateSettingsUpdate('display', validData);
      const invalidResult = validateSettingsUpdate('display', invalidData);
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should handle settings cache operations', () => {
      const userId = 'test-user';
      
      // Test cache miss
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(settingsCache.get(userId)).toBeNull();
      
      // Test cache set and get
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockSettings));
      const cachedSettings = settingsCache.get(userId);
      expect(cachedSettings).toEqual(mockSettings);
      
      // Test cache set
      settingsCache.set(userId, mockSettings);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        `settings_${userId}`,
        JSON.stringify(mockSettings)
      );
      
      // Test cache remove
      settingsCache.remove(userId);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`settings_${userId}`);
    });

    it('should handle localStorage errors gracefully', () => {
      const userId = 'test-user';
      
      // Mock localStorage to throw errors
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      // Should not throw errors
      expect(() => settingsCache.get(userId)).not.toThrow();
      expect(() => settingsCache.set(userId, mockSettings)).not.toThrow();
      expect(() => settingsCache.remove(userId)).not.toThrow();
      expect(() => settingsCache.clear()).not.toThrow();
    });
  });

  describe('Settings validation', () => {
    it('should validate privacy settings', () => {
      const validData = { 
        twoFactorEnabled: true, 
        sessionTimeoutMinutes: 60 
      };
      const invalidData = { 
        sessionTimeoutMinutes: 2 // Too low
      };
      
      const validResult = validateSettingsUpdate('privacy', validData);
      const invalidResult = validateSettingsUpdate('privacy', invalidData);
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Session timeout must be between 5 minutes and 24 hours');
    });

    it('should validate account settings', () => {
      const validData = { syncFrequency: 'hourly' as const };
      const invalidData = { syncFrequency: 'invalid' as any };
      
      const validResult = validateSettingsUpdate('accounts', validData);
      const invalidResult = validateSettingsUpdate('accounts', invalidData);
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Invalid sync frequency');
    });

    it('should handle unknown categories', () => {
      const result = validateSettingsUpdate('unknown', {});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid settings category');
    });
  });
});