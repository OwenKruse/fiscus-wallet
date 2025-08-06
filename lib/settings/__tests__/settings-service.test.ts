import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { SettingsService, type SettingsServiceError } from '../settings-service';
import type { NileClient } from '../../../types/nile';
import type {
  UserPreferences,
  UserSetting,
  UpdateProfileSettingsRequest,
  UpdateNotificationSettingsRequest,
  UpdateDisplaySettingsRequest,
  UpdatePrivacySettingsRequest,
  UpdateAccountSettingsRequest,
  ChangePasswordRequest,
  ChangeEmailRequest,

} from '../../../types';

// Mock NileClient
const mockNileClient: NileClient = {
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  executeUpdate: vi.fn(),
};

// Test data
const mockUserId = 'test-user-123';
const mockUserEmail = 'test@example.com';

const mockUserPreferences: UserPreferences = {
  id: 'pref-123',
  userId: mockUserId,
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
  profilePictureUrl: 'https://example.com/avatar.jpg',
  theme: 'light',
  currencyFormat: 'USD',
  dateFormat: 'MM/dd/yyyy',
  timezone: 'America/New_York',
  language: 'en',
  notificationsEnabled: true,
  emailNotifications: true,
  goalNotifications: true,
  accountAlerts: true,
  systemUpdates: false,
  marketingEmails: false,
  dataSharingAnalytics: false,
  dataSharingMarketing: false,
  twoFactorEnabled: false,
  sessionTimeoutMinutes: 480,
  autoSyncEnabled: true,
  syncFrequency: 'daily',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockCustomSettings: UserSetting[] = [
  {
    id: 'setting-1',
    userId: mockUserId,
    category: 'profile',
    key: 'bio',
    value: 'Software developer',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'setting-2',
    userId: mockUserId,
    category: 'display',
    key: 'compactMode',
    value: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('SettingsService', () => {
  let settingsService: SettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    settingsService = new SettingsService(mockNileClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserSettings', () => {
    it('should return complete user settings when preferences exist', async () => {
      // Mock database responses
      (mockNileClient.queryOne as Mock).mockResolvedValueOnce(mockUserPreferences);
      (mockNileClient.query as Mock)
        .mockResolvedValueOnce([mockCustomSettings[0]]) // profile settings
        .mockResolvedValueOnce([]) // notification settings
        .mockResolvedValueOnce([mockCustomSettings[1]]) // display settings
        .mockResolvedValueOnce([]) // privacy settings
        .mockResolvedValueOnce([]); // account settings

      // Mock getUserEmail method
      vi.spyOn(settingsService as any, 'getUserEmail').mockResolvedValue(mockUserEmail);

      const result = await settingsService.getUserSettings(mockUserId);

      expect(result).toEqual({
        id: mockUserPreferences.id,
        userId: mockUserId,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          email: mockUserEmail,
          phone: '+1234567890',
          profilePictureUrl: 'https://example.com/avatar.jpg',
          emailVerified: true,
          bio: 'Software developer',
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
          compactMode: true,
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
        createdAt: mockUserPreferences.createdAt,
        updatedAt: mockUserPreferences.updatedAt,
      });

      expect(mockNileClient.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [mockUserId]
      );
      expect(mockNileClient.query).toHaveBeenCalledTimes(5);
    });

    it('should initialize default preferences when they do not exist', async () => {
      // Mock no existing preferences
      (mockNileClient.queryOne as Mock)
        .mockResolvedValueOnce(null) // getUserPreferences returns null
        .mockResolvedValueOnce(mockUserPreferences); // initializeUserPreferences returns new preferences

      (mockNileClient.query as Mock)
        .mockResolvedValueOnce([]) // profile settings
        .mockResolvedValueOnce([]) // notification settings
        .mockResolvedValueOnce([]) // display settings
        .mockResolvedValueOnce([]) // privacy settings
        .mockResolvedValueOnce([]); // account settings

      vi.spyOn(settingsService as any, 'getUserEmail').mockResolvedValue(mockUserEmail);

      const result = await settingsService.getUserSettings(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(mockNileClient.queryOne).toHaveBeenCalledTimes(2);
    });

    it('should throw error when database query fails', async () => {
      const dbError = new Error('Database connection failed');
      (mockNileClient.queryOne as Mock).mockRejectedValue(dbError);

      await expect(settingsService.getUserSettings(mockUserId)).rejects.toThrow('Failed to fetch user settings');
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences when they exist', async () => {
      (mockNileClient.queryOne as Mock).mockResolvedValue(mockUserPreferences);

      const result = await settingsService.getUserPreferences(mockUserId);

      expect(result).toEqual(mockUserPreferences);
      expect(mockNileClient.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [mockUserId]
      );
    });

    it('should initialize default preferences when they do not exist', async () => {
      (mockNileClient.queryOne as Mock)
        .mockResolvedValueOnce(null) // First call returns null
        .mockResolvedValueOnce(mockUserPreferences); // Second call returns created preferences

      const result = await settingsService.getUserPreferences(mockUserId);

      expect(result).toEqual(mockUserPreferences);
      expect(mockNileClient.queryOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('initializeUserPreferences', () => {
    it('should create default preferences for new user', async () => {
      (mockNileClient.queryOne as Mock).mockResolvedValue(mockUserPreferences);

      const result = await settingsService.initializeUserPreferences(mockUserId);

      expect(result).toEqual(mockUserPreferences);
      expect(mockNileClient.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_preferences'),
        expect.arrayContaining([mockUserId])
      );
    });

    it('should throw error when initialization fails', async () => {
      (mockNileClient.queryOne as Mock).mockResolvedValue(null);

      await expect(settingsService.initializeUserPreferences(mockUserId)).rejects.toThrow(
        'Failed to initialize user preferences'
      );
    });
  });

  describe('updateProfileSettings', () => {
    const validProfileUpdate: UpdateProfileSettingsRequest = {
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+9876543210',
      profilePictureUrl: 'https://example.com/new-avatar.jpg',
    };

    it('should update profile settings with valid data', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      // Mock getUserSettings to return updated settings
      vi.spyOn(settingsService, 'getUserSettings').mockResolvedValue({
        ...mockUserPreferences,
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: mockUserEmail,
          phone: '+9876543210',
          profilePictureUrl: 'https://example.com/new-avatar.jpg',
          emailVerified: true,
        },
      } as any);

      const result = await settingsService.updateProfileSettings(mockUserId, validProfileUpdate);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(mockNileClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_preferences SET'),
        expect.arrayContaining([mockUserId])
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidUpdate = {
        firstName: '', // Invalid: empty string
        phone: 'invalid-phone', // Invalid: not a valid phone format
      };

      await expect(settingsService.updateProfileSettings(mockUserId, invalidUpdate)).rejects.toThrow(
        'Profile settings validation failed'
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { firstName: 'Jane' };

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      vi.spyOn(settingsService, 'getUserSettings').mockResolvedValue({
        ...mockUserPreferences,
        profile: {
          ...mockUserPreferences,
          firstName: 'Jane',
          email: mockUserEmail,
          emailVerified: true,
        },
      } as any);

      const result = await settingsService.updateProfileSettings(mockUserId, partialUpdate);

      expect(result.firstName).toBe('Jane');
      expect(mockNileClient.query).toHaveBeenCalledWith(
        'UPDATE user_preferences SET first_name = $2, updated_at = NOW() WHERE user_id = $1',
        [mockUserId, 'Jane']
      );
    });
  });

  describe('updateNotificationSettings', () => {
    const validNotificationUpdate: UpdateNotificationSettingsRequest = {
      notificationsEnabled: false,
      emailNotifications: false,
      goalNotifications: true,
      accountAlerts: true,
      systemUpdates: true,
      marketingEmails: false,
    };

    it('should update notification settings with valid data', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      vi.spyOn(settingsService, 'getUserSettings').mockResolvedValue({
        ...mockUserPreferences,
        notifications: {
          enabled: false,
          email: false,
          goalProgress: true,
          accountAlerts: true,
          systemUpdates: true,
          marketingEmails: false,
        },
      } as any);

      const result = await settingsService.updateNotificationSettings(mockUserId, validNotificationUpdate);

      expect(result.enabled).toBe(false);
      expect(result.systemUpdates).toBe(true);
      expect(mockNileClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_preferences SET'),
        expect.arrayContaining([mockUserId])
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidUpdate = {
        notificationsEnabled: 'invalid' as any, // Should be boolean
      };

      await expect(settingsService.updateNotificationSettings(mockUserId, invalidUpdate)).rejects.toThrow(
        'Notification settings validation failed'
      );
    });
  });

  describe('updateDisplaySettings', () => {
    const validDisplayUpdate: UpdateDisplaySettingsRequest = {
      theme: 'dark',
      currencyFormat: 'EUR',
      dateFormat: 'dd/MM/yyyy',
      timezone: 'Europe/London',
      language: 'fr',
    };

    it('should update display settings with valid data', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      vi.spyOn(settingsService, 'getUserSettings').mockResolvedValue({
        ...mockUserPreferences,
        display: {
          theme: 'dark',
          currency: 'EUR',
          dateFormat: 'dd/MM/yyyy',
          timezone: 'Europe/London',
          language: 'fr',
        },
      } as any);

      const result = await settingsService.updateDisplaySettings(mockUserId, validDisplayUpdate);

      expect(result.theme).toBe('dark');
      expect(result.currency).toBe('EUR');
      expect(mockNileClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_preferences SET'),
        expect.arrayContaining([mockUserId])
      );
    });

    it('should throw validation error for invalid theme', async () => {
      const invalidUpdate = {
        theme: 'invalid-theme' as any,
      };

      await expect(settingsService.updateDisplaySettings(mockUserId, invalidUpdate)).rejects.toThrow(
        'Display settings validation failed'
      );
    });
  });

  describe('updatePrivacySettings', () => {
    const validPrivacyUpdate: UpdatePrivacySettingsRequest = {
      twoFactorEnabled: true,
      dataSharingAnalytics: true,
      dataSharingMarketing: false,
      sessionTimeoutMinutes: 720,
    };

    it('should update privacy settings with valid data', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      vi.spyOn(settingsService, 'getUserSettings').mockResolvedValue({
        ...mockUserPreferences,
        privacy: {
          twoFactorEnabled: true,
          dataSharingAnalytics: true,
          dataSharingMarketing: false,
          sessionTimeoutMinutes: 720,
        },
      } as any);

      const result = await settingsService.updatePrivacySettings(mockUserId, validPrivacyUpdate);

      expect(result.twoFactorEnabled).toBe(true);
      expect(result.sessionTimeoutMinutes).toBe(720);
      expect(mockNileClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_preferences SET'),
        expect.arrayContaining([mockUserId])
      );
    });

    it('should throw validation error for invalid session timeout', async () => {
      const invalidUpdate = {
        sessionTimeoutMinutes: 5000, // Too high
      };

      await expect(settingsService.updatePrivacySettings(mockUserId, invalidUpdate)).rejects.toThrow(
        'Privacy settings validation failed'
      );
    });
  });

  describe('updateAccountSettings', () => {
    const validAccountUpdate: UpdateAccountSettingsRequest = {
      autoSyncEnabled: false,
      syncFrequency: 'hourly',
    };

    it('should update account settings with valid data', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      vi.spyOn(settingsService, 'getUserSettings').mockResolvedValue({
        ...mockUserPreferences,
        accounts: {
          autoSyncEnabled: false,
          syncFrequency: 'hourly',
        },
      } as any);

      const result = await settingsService.updateAccountSettings(mockUserId, validAccountUpdate);

      expect(result.autoSyncEnabled).toBe(false);
      expect(result.syncFrequency).toBe('hourly');
      expect(mockNileClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_preferences SET'),
        expect.arrayContaining([mockUserId])
      );
    });

    it('should throw validation error for invalid sync frequency', async () => {
      const invalidUpdate = {
        syncFrequency: 'invalid-frequency' as any,
      };

      await expect(settingsService.updateAccountSettings(mockUserId, invalidUpdate)).rejects.toThrow(
        'Account settings validation failed'
      );
    });
  });

  describe('changePassword', () => {
    const validPasswordChange: ChangePasswordRequest = {
      currentPassword: 'oldPassword123',
      newPassword: 'NewPassword456!',
      confirmPassword: 'NewPassword456!',
    };

    it('should throw not implemented error', async () => {
      await expect(settingsService.changePassword(mockUserId, validPasswordChange)).rejects.toThrow(
        'Password change not yet implemented'
      );
    });

    it('should throw validation error for mismatched passwords', async () => {
      const invalidPasswordChange = {
        ...validPasswordChange,
        confirmPassword: 'DifferentPassword',
      };

      await expect(settingsService.changePassword(mockUserId, invalidPasswordChange)).rejects.toThrow(
        'Password change validation failed'
      );
    });

    it('should throw validation error for weak password', async () => {
      const weakPasswordChange = {
        currentPassword: 'oldPassword123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      };

      await expect(settingsService.changePassword(mockUserId, weakPasswordChange)).rejects.toThrow(
        'Password change validation failed'
      );
    });
  });

  describe('changeEmail', () => {
    const validEmailChange: ChangeEmailRequest = {
      newEmail: 'newemail@example.com',
      password: 'currentPassword123',
    };

    it('should throw not implemented error', async () => {
      await expect(settingsService.changeEmail(mockUserId, validEmailChange)).rejects.toThrow(
        'Email change not yet implemented'
      );
    });

    it('should throw validation error for invalid email', async () => {
      const invalidEmailChange = {
        newEmail: 'invalid-email',
        password: 'currentPassword123',
      };

      await expect(settingsService.changeEmail(mockUserId, invalidEmailChange)).rejects.toThrow(
        'Email change validation failed'
      );
    });
  });

  describe('resetUserSettings', () => {
    it('should reset all settings when no category specified', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      await settingsService.resetUserSettings(mockUserId);

      expect(mockNileClient.query).toHaveBeenCalledWith(
        'SELECT reset_user_preferences_to_defaults($1)',
        [mockUserId]
      );
      expect(mockNileClient.query).toHaveBeenCalledWith(
        'DELETE FROM user_settings WHERE user_id = $1',
        [mockUserId]
      );
    });

    it('should reset specific category when specified', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      await settingsService.resetUserSettings(mockUserId, 'profile');

      expect(mockNileClient.query).toHaveBeenCalledWith(
        'DELETE FROM user_settings WHERE user_id = $1 AND category = $2',
        [mockUserId, 'profile']
      );
      expect(mockNileClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_preferences SET'),
        [mockUserId]
      );
    });

    it('should handle database errors during reset', async () => {
      const dbError = new Error('Database error');
      (mockNileClient.transaction as Mock).mockRejectedValue(dbError);

      await expect(settingsService.resetUserSettings(mockUserId)).rejects.toThrow(
        'Failed to reset user settings'
      );
    });
  });

  describe('exportUserData', () => {
    it('should export complete user data', async () => {
      (mockNileClient.queryOne as Mock).mockResolvedValue(mockUserPreferences);
      (mockNileClient.query as Mock).mockResolvedValue(mockCustomSettings);
      vi.spyOn(settingsService as any, 'getUserEmail').mockResolvedValue(mockUserEmail);

      const result = await settingsService.exportUserData(mockUserId);

      expect(result).toEqual({
        profile: {
          firstName: mockUserPreferences.firstName,
          lastName: mockUserPreferences.lastName,
          email: mockUserEmail,
          phone: mockUserPreferences.phone,
          profilePictureUrl: mockUserPreferences.profilePictureUrl,
          emailVerified: true,
        },
        preferences: mockUserPreferences,
        settings: mockCustomSettings,
        exportedAt: expect.any(String),
      });

      expect(mockNileClient.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [mockUserId]
      );
      expect(mockNileClient.query).toHaveBeenCalledWith(
        'SELECT * FROM user_settings WHERE user_id = $1 ORDER BY category, key',
        [mockUserId]
      );
    });

    it('should handle export errors', async () => {
      const dbError = new Error('Database error');
      (mockNileClient.queryOne as Mock).mockRejectedValue(dbError);

      await expect(settingsService.exportUserData(mockUserId)).rejects.toThrow(
        'Failed to export user data'
      );
    });
  });

  describe('error handling', () => {
    it('should create proper error objects', async () => {
      const dbError = new Error('Database connection failed');
      (mockNileClient.queryOne as Mock).mockRejectedValue(dbError);

      try {
        await settingsService.getUserSettings(mockUserId);
      } catch (error) {
        const settingsError = error as SettingsServiceError;
        expect(settingsError.code).toBe('SETTINGS_FETCH_FAILED');
        expect(settingsError.statusCode).toBe(500);
        expect(settingsError.message).toBe('Failed to fetch user settings');
        // The error details will be the wrapped error from getUserPreferences
        expect(settingsError.details).toBeInstanceOf(Error);
      }
    });

    it('should create validation errors with proper structure', async () => {
      const invalidUpdate = { firstName: '' };

      try {
        await settingsService.updateProfileSettings(mockUserId, invalidUpdate);
      } catch (error) {
        const settingsError = error as SettingsServiceError;
        expect(settingsError.code).toBe('VALIDATION_ERROR');
        expect(settingsError.statusCode).toBe(400);
        expect(settingsError.details).toHaveProperty('validationErrors');
        expect(Array.isArray(settingsError.details.validationErrors)).toBe(true);
      }
    });
  });

  describe('transaction handling', () => {
    it('should use transactions for update operations', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockNileClient);
      });
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);
      (mockNileClient.query as Mock).mockResolvedValue([]);

      vi.spyOn(settingsService, 'getUserSettings').mockResolvedValue({} as any);

      await settingsService.updateProfileSettings(mockUserId, { firstName: 'Jane' });

      expect(mockNileClient.transaction).toHaveBeenCalledTimes(1);
      expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should rollback transaction on error', async () => {
      const dbError = new Error('Database error');
      const mockTransaction = vi.fn().mockRejectedValue(dbError);
      (mockNileClient.transaction as Mock).mockImplementation(mockTransaction);

      await expect(settingsService.updateProfileSettings(mockUserId, { firstName: 'Jane' })).rejects.toThrow(
        'Failed to update profile settings'
      );

      expect(mockNileClient.transaction).toHaveBeenCalledTimes(1);
    });
  });
});