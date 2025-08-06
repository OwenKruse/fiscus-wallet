import { getNileClient } from '../database/nile-client';
import type { NileClient } from '../../types/nile';
import type {
  UserSettings,
  UserPreferences,
  UserSetting,
  ProfileSettings,
  NotificationSettings,
  DisplaySettings,
  PrivacySettings,
  AccountSettings,
  UpdateProfileSettingsRequest,
  UpdateNotificationSettingsRequest,
  UpdateDisplaySettingsRequest,
  UpdatePrivacySettingsRequest,
  UpdateAccountSettingsRequest,
  ChangePasswordRequest,
  ChangeEmailRequest,
  ExportUserDataResponse,
  SettingsCategory,

} from '../../types';
import {
  validateProfileSettings,
  validateNotificationSettings,
  validateDisplaySettings,
  validatePrivacySettings,
  validateAccountSettings,
  validatePasswordChange,
  validateEmailChange,
} from './validation';

export interface SettingsServiceError extends Error {
  code: string;
  statusCode: number;
  field?: string;
  details?: any;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
}

export interface UserDataExport {
  profile: ProfileSettings;
  preferences: UserPreferences;
  settings: UserSetting[];
  exportedAt: string;
}

/**
 * Service class for managing user settings and preferences
 * Provides CRUD operations, validation, and business logic for user settings
 */
export class SettingsService {
  private client: NileClient;

  constructor(client?: NileClient) {
    this.client = client || getNileClient();
  }

  /**
   * Get complete user settings including preferences and custom settings
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      // Get user preferences (structured settings)
      const preferences = await this.getUserPreferences(userId);
      
      // Get custom settings by category
      const [profileSettings, notificationSettings, displaySettings, privacySettings, accountSettings] = await Promise.all([
        this.getSettingsByCategory(userId, 'profile'),
        this.getSettingsByCategory(userId, 'notifications'),
        this.getSettingsByCategory(userId, 'display'),
        this.getSettingsByCategory(userId, 'privacy'),
        this.getSettingsByCategory(userId, 'accounts'),
      ]);

      // Get user email from auth system (assuming it's available)
      const userEmail = await this.getUserEmail(userId);

      // Combine preferences with custom settings
      const settings: UserSettings = {
        id: preferences.id,
        userId: preferences.userId,
        profile: {
          firstName: preferences.firstName,
          lastName: preferences.lastName,
          email: userEmail,
          phone: preferences.phone,
          profilePictureUrl: preferences.profilePictureUrl,
          emailVerified: true, // TODO: Get from auth system
          ...this.parseCustomSettings(profileSettings),
        },
        notifications: {
          enabled: preferences.notificationsEnabled,
          email: preferences.emailNotifications,
          goalProgress: preferences.goalNotifications,
          accountAlerts: preferences.accountAlerts,
          systemUpdates: preferences.systemUpdates,
          marketingEmails: preferences.marketingEmails,
          ...this.parseCustomSettings(notificationSettings),
        },
        display: {
          theme: preferences.theme,
          currency: preferences.currencyFormat,
          dateFormat: preferences.dateFormat,
          timezone: preferences.timezone,
          language: preferences.language,
          ...this.parseCustomSettings(displaySettings),
        },
        privacy: {
          twoFactorEnabled: preferences.twoFactorEnabled,
          dataSharingAnalytics: preferences.dataSharingAnalytics,
          dataSharingMarketing: preferences.dataSharingMarketing,
          sessionTimeoutMinutes: preferences.sessionTimeoutMinutes,
          ...this.parseCustomSettings(privacySettings),
        },
        accounts: {
          autoSyncEnabled: preferences.autoSyncEnabled,
          syncFrequency: preferences.syncFrequency,
          ...this.parseCustomSettings(accountSettings),
        },
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt,
      };

      return settings;
    } catch (error) {
      throw this.createError('SETTINGS_FETCH_FAILED', 'Failed to fetch user settings', 500, error);
    }
  }

  /**
   * Get user preferences (structured settings)
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const preferences = await this.client.queryOne<UserPreferences>(
        `SELECT * FROM user_preferences WHERE user_id = $1`,
        [userId]
      );

      if (!preferences) {
        // Initialize default preferences if they don't exist
        return await this.initializeUserPreferences(userId);
      }

      return preferences;
    } catch (error) {
      throw this.createError('PREFERENCES_FETCH_FAILED', 'Failed to fetch user preferences', 500, error);
    }
  }

  /**
   * Initialize default user preferences
   */
  async initializeUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const defaultPrefs = {
        firstName: undefined,
        lastName: undefined,
        phone: undefined,
        profilePictureUrl: undefined,
        theme: 'light' as const,
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
        syncFrequency: 'daily' as const,
        userId,
      };

      const preferences = await this.client.queryOne<UserPreferences>(
        `INSERT INTO user_preferences (
          user_id, theme, currency_format, date_format, timezone, language,
          notifications_enabled, email_notifications, goal_notifications,
          account_alerts, system_updates, marketing_emails,
          data_sharing_analytics, data_sharing_marketing, two_factor_enabled,
          session_timeout_minutes, auto_sync_enabled, sync_frequency
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *`,
        [
          userId,
          defaultPrefs.theme,
          defaultPrefs.currencyFormat,
          defaultPrefs.dateFormat,
          defaultPrefs.timezone,
          defaultPrefs.language,
          defaultPrefs.notificationsEnabled,
          defaultPrefs.emailNotifications,
          defaultPrefs.goalNotifications,
          defaultPrefs.accountAlerts,
          defaultPrefs.systemUpdates,
          defaultPrefs.marketingEmails,
          defaultPrefs.dataSharingAnalytics,
          defaultPrefs.dataSharingMarketing,
          defaultPrefs.twoFactorEnabled,
          defaultPrefs.sessionTimeoutMinutes,
          defaultPrefs.autoSyncEnabled,
          defaultPrefs.syncFrequency,
        ]
      );

      if (!preferences) {
        throw new Error('Failed to create default preferences');
      }

      return preferences;
    } catch (error) {
      throw this.createError('PREFERENCES_INIT_FAILED', 'Failed to initialize user preferences', 500, error);
    }
  }

  /**
   * Update profile settings
   */
  async updateProfileSettings(userId: string, updates: UpdateProfileSettingsRequest): Promise<ProfileSettings> {
    const validation = validateProfileSettings(updates);
    if (!validation.success) {
      throw this.createValidationError('Profile settings validation failed', validation.errors);
    }

    try {
      return await this.client.transaction(async (client) => {
        // Update user_preferences table
        const updateFields: string[] = [];
        const updateValues: any[] = [userId];
        let paramIndex = 2;

        if (updates.firstName !== undefined) {
          updateFields.push(`first_name = $${paramIndex++}`);
          updateValues.push(updates.firstName);
        }
        if (updates.lastName !== undefined) {
          updateFields.push(`last_name = $${paramIndex++}`);
          updateValues.push(updates.lastName);
        }
        if (updates.phone !== undefined) {
          updateFields.push(`phone = $${paramIndex++}`);
          updateValues.push(updates.phone);
        }
        if (updates.profilePictureUrl !== undefined) {
          updateFields.push(`profile_picture_url = $${paramIndex++}`);
          updateValues.push(updates.profilePictureUrl);
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = NOW()`);
          await client.query(
            `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = $1`,
            updateValues
          );
        }

        // Get updated profile settings
        const settings = await this.getUserSettings(userId);
        return settings.profile;
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      throw this.createError('PROFILE_UPDATE_FAILED', 'Failed to update profile settings', 500, error);
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, updates: UpdateNotificationSettingsRequest): Promise<NotificationSettings> {
    const validation = validateNotificationSettings(updates);
    if (!validation.success) {
      throw this.createValidationError('Notification settings validation failed', validation.errors);
    }

    try {
      return await this.client.transaction(async (client) => {
        const updateFields: string[] = [];
        const updateValues: any[] = [userId];
        let paramIndex = 2;

        if (updates.notificationsEnabled !== undefined) {
          updateFields.push(`notifications_enabled = $${paramIndex++}`);
          updateValues.push(updates.notificationsEnabled);
        }
        if (updates.emailNotifications !== undefined) {
          updateFields.push(`email_notifications = $${paramIndex++}`);
          updateValues.push(updates.emailNotifications);
        }
        if (updates.goalNotifications !== undefined) {
          updateFields.push(`goal_notifications = $${paramIndex++}`);
          updateValues.push(updates.goalNotifications);
        }
        if (updates.accountAlerts !== undefined) {
          updateFields.push(`account_alerts = $${paramIndex++}`);
          updateValues.push(updates.accountAlerts);
        }
        if (updates.systemUpdates !== undefined) {
          updateFields.push(`system_updates = $${paramIndex++}`);
          updateValues.push(updates.systemUpdates);
        }
        if (updates.marketingEmails !== undefined) {
          updateFields.push(`marketing_emails = $${paramIndex++}`);
          updateValues.push(updates.marketingEmails);
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = NOW()`);
          await client.query(
            `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = $1`,
            updateValues
          );
        }

        const settings = await this.getUserSettings(userId);
        return settings.notifications;
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      throw this.createError('NOTIFICATIONS_UPDATE_FAILED', 'Failed to update notification settings', 500, error);
    }
  }

  /**
   * Update display settings
   */
  async updateDisplaySettings(userId: string, updates: UpdateDisplaySettingsRequest): Promise<DisplaySettings> {
    const validation = validateDisplaySettings(updates);
    if (!validation.success) {
      throw this.createValidationError('Display settings validation failed', validation.errors);
    }

    try {
      return await this.client.transaction(async (client) => {
        const updateFields: string[] = [];
        const updateValues: any[] = [userId];
        let paramIndex = 2;

        if (updates.theme !== undefined) {
          updateFields.push(`theme = $${paramIndex++}`);
          updateValues.push(updates.theme);
        }
        if (updates.currencyFormat !== undefined) {
          updateFields.push(`currency_format = $${paramIndex++}`);
          updateValues.push(updates.currencyFormat);
        }
        if (updates.dateFormat !== undefined) {
          updateFields.push(`date_format = $${paramIndex++}`);
          updateValues.push(updates.dateFormat);
        }
        if (updates.timezone !== undefined) {
          updateFields.push(`timezone = $${paramIndex++}`);
          updateValues.push(updates.timezone);
        }
        if (updates.language !== undefined) {
          updateFields.push(`language = $${paramIndex++}`);
          updateValues.push(updates.language);
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = NOW()`);
          await client.query(
            `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = $1`,
            updateValues
          );
        }

        const settings = await this.getUserSettings(userId);
        return settings.display;
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      throw this.createError('DISPLAY_UPDATE_FAILED', 'Failed to update display settings', 500, error);
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId: string, updates: UpdatePrivacySettingsRequest): Promise<PrivacySettings> {
    const validation = validatePrivacySettings(updates);
    if (!validation.success) {
      throw this.createValidationError('Privacy settings validation failed', validation.errors);
    }

    try {
      return await this.client.transaction(async (client) => {
        const updateFields: string[] = [];
        const updateValues: any[] = [userId];
        let paramIndex = 2;

        if (updates.twoFactorEnabled !== undefined) {
          updateFields.push(`two_factor_enabled = $${paramIndex++}`);
          updateValues.push(updates.twoFactorEnabled);
        }
        if (updates.dataSharingAnalytics !== undefined) {
          updateFields.push(`data_sharing_analytics = $${paramIndex++}`);
          updateValues.push(updates.dataSharingAnalytics);
        }
        if (updates.dataSharingMarketing !== undefined) {
          updateFields.push(`data_sharing_marketing = $${paramIndex++}`);
          updateValues.push(updates.dataSharingMarketing);
        }
        if (updates.sessionTimeoutMinutes !== undefined) {
          updateFields.push(`session_timeout_minutes = $${paramIndex++}`);
          updateValues.push(updates.sessionTimeoutMinutes);
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = NOW()`);
          await client.query(
            `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = $1`,
            updateValues
          );
        }

        const settings = await this.getUserSettings(userId);
        return settings.privacy;
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      throw this.createError('PRIVACY_UPDATE_FAILED', 'Failed to update privacy settings', 500, error);
    }
  }

  /**
   * Update account settings
   */
  async updateAccountSettings(userId: string, updates: UpdateAccountSettingsRequest): Promise<AccountSettings> {
    const validation = validateAccountSettings(updates);
    if (!validation.success) {
      throw this.createValidationError('Account settings validation failed', validation.errors);
    }

    try {
      return await this.client.transaction(async (client) => {
        const updateFields: string[] = [];
        const updateValues: any[] = [userId];
        let paramIndex = 2;

        if (updates.autoSyncEnabled !== undefined) {
          updateFields.push(`auto_sync_enabled = $${paramIndex++}`);
          updateValues.push(updates.autoSyncEnabled);
        }
        if (updates.syncFrequency !== undefined) {
          updateFields.push(`sync_frequency = $${paramIndex++}`);
          updateValues.push(updates.syncFrequency);
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = NOW()`);
          await client.query(
            `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = $1`,
            updateValues
          );
        }

        const settings = await this.getUserSettings(userId);
        return settings.accounts;
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      throw this.createError('ACCOUNTS_UPDATE_FAILED', 'Failed to update account settings', 500, error);
    }
  }

  /**
   * Change user password (placeholder - actual implementation would integrate with auth service)
   */
  async changePassword(userId: string, passwordData: ChangePasswordRequest): Promise<void> {
    const validation = validatePasswordChange(passwordData);
    if (!validation.success) {
      throw this.createValidationError('Password change validation failed', validation.errors);
    }

    try {
      // TODO: Integrate with actual auth service
      // This is a placeholder implementation
      console.log(`Password change requested for user ${userId}`);
      
      // In a real implementation, this would:
      // 1. Verify current password with auth service
      // 2. Hash new password
      // 3. Update password in auth system
      // 4. Invalidate existing sessions
      // 5. Send confirmation email
      
      const error = new Error('Password change not yet implemented') as SettingsServiceError;
      error.code = 'NOT_IMPLEMENTED';
      error.statusCode = 501;
      throw error;
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      if (error instanceof Error && (error as SettingsServiceError).code === 'NOT_IMPLEMENTED') {
        throw error;
      }
      throw this.createError('PASSWORD_CHANGE_FAILED', 'Failed to change password', 500, error);
    }
  }

  /**
   * Change user email (placeholder - actual implementation would integrate with auth service)
   */
  async changeEmail(userId: string, emailData: ChangeEmailRequest): Promise<void> {
    const validation = validateEmailChange(emailData);
    if (!validation.success) {
      throw this.createValidationError('Email change validation failed', validation.errors);
    }

    try {
      // TODO: Integrate with actual auth service
      // This is a placeholder implementation
      console.log(`Email change requested for user ${userId} to ${emailData.newEmail}`);
      
      // In a real implementation, this would:
      // 1. Verify password with auth service
      // 2. Check if new email is already in use
      // 3. Send verification email to new address
      // 4. Update email in auth system after verification
      // 5. Send notification to old email
      
      const error = new Error('Email change not yet implemented') as SettingsServiceError;
      error.code = 'NOT_IMPLEMENTED';
      error.statusCode = 501;
      throw error;
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      if (error instanceof Error && (error as SettingsServiceError).code === 'NOT_IMPLEMENTED') {
        throw error;
      }
      throw this.createError('EMAIL_CHANGE_FAILED', 'Failed to change email', 500, error);
    }
  }

  /**
   * Reset user settings to defaults
   */
  async resetUserSettings(userId: string, category?: SettingsCategory): Promise<void> {
    try {
      await this.client.transaction(async (client) => {
        if (category) {
          // Reset specific category
          await this.resetSettingsCategory(client, userId, category);
        } else {
          // Reset all settings
          await client.query(`SELECT reset_user_preferences_to_defaults($1)`, [userId]);
          
          // Delete all custom settings
          await client.query(`DELETE FROM user_settings WHERE user_id = $1`, [userId]);
        }
      });
    } catch (error) {
      throw this.createError('SETTINGS_RESET_FAILED', 'Failed to reset user settings', 500, error);
    }
  }

  /**
   * Export user data
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    try {
      const [preferences, customSettings] = await Promise.all([
        this.getUserPreferences(userId),
        this.getAllUserSettings(userId),
      ]);

      const userEmail = await this.getUserEmail(userId);

      const exportData: UserDataExport = {
        profile: {
          firstName: preferences.firstName,
          lastName: preferences.lastName,
          email: userEmail,
          phone: preferences.phone,
          profilePictureUrl: preferences.profilePictureUrl,
          emailVerified: true, // TODO: Get from auth system
        },
        preferences,
        settings: customSettings,
        exportedAt: new Date().toISOString(),
      };

      return exportData;
    } catch (error) {
      throw this.createError('DATA_EXPORT_FAILED', 'Failed to export user data', 500, error);
    }
  }

  /**
   * Get custom settings by category
   */
  private async getSettingsByCategory(userId: string, category: SettingsCategory): Promise<UserSetting[]> {
    return await this.client.query<UserSetting>(
      `SELECT * FROM user_settings WHERE user_id = $1 AND category = $2 ORDER BY key`,
      [userId, category]
    );
  }

  /**
   * Get all custom settings for a user
   */
  private async getAllUserSettings(userId: string): Promise<UserSetting[]> {
    return await this.client.query<UserSetting>(
      `SELECT * FROM user_settings WHERE user_id = $1 ORDER BY category, key`,
      [userId]
    );
  }

  /**
   * Parse custom settings into a key-value object
   */
  private parseCustomSettings(settings: UserSetting[]): Record<string, any> {
    const parsed: Record<string, any> = {};
    for (const setting of settings) {
      parsed[setting.key] = setting.value;
    }
    return parsed;
  }

  /**
   * Get user email (placeholder - would integrate with auth service)
   */
  private async getUserEmail(userId: string): Promise<string> {
    // TODO: Integrate with actual auth service to get user email
    // This is a placeholder implementation
    return `user-${userId}@example.com`;
  }

  /**
   * Reset settings for a specific category
   */
  private async resetSettingsCategory(client: NileClient, userId: string, category: SettingsCategory): Promise<void> {
    // Delete custom settings for the category
    await client.query(
      `DELETE FROM user_settings WHERE user_id = $1 AND category = $2`,
      [userId, category]
    );

    // Reset preferences fields for the category
    switch (category) {
      case 'profile':
        await client.query(
          `UPDATE user_preferences SET 
           first_name = NULL, last_name = NULL, phone = NULL, profile_picture_url = NULL,
           updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );
        break;
      case 'notifications':
        await client.query(
          `UPDATE user_preferences SET 
           notifications_enabled = true, email_notifications = true, goal_notifications = true,
           account_alerts = true, system_updates = false, marketing_emails = false,
           updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );
        break;
      case 'display':
        await client.query(
          `UPDATE user_preferences SET 
           theme = 'light', currency_format = 'USD', date_format = 'MM/dd/yyyy',
           timezone = 'America/New_York', language = 'en',
           updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );
        break;
      case 'privacy':
        await client.query(
          `UPDATE user_preferences SET 
           data_sharing_analytics = false, data_sharing_marketing = false,
           two_factor_enabled = false, session_timeout_minutes = 480,
           updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );
        break;
      case 'accounts':
        await client.query(
          `UPDATE user_preferences SET 
           auto_sync_enabled = true, sync_frequency = 'daily',
           updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );
        break;
    }
  }

  /**
   * Create a settings service error
   */
  private createError(code: string, message: string, statusCode: number, originalError?: any): SettingsServiceError {
    const error = new Error(message) as SettingsServiceError;
    error.code = code;
    error.statusCode = statusCode;
    error.details = originalError;
    
    // Log the error for debugging
    console.error(`SettingsService Error [${code}]:`, message, originalError);
    
    return error;
  }

  /**
   * Create a validation error
   */
  private createValidationError(message: string, errors: { field: string; message: string }[]): SettingsServiceError {
    const error = new Error(message) as SettingsServiceError;
    error.code = 'VALIDATION_ERROR';
    error.statusCode = 400;
    error.details = { validationErrors: errors };
    
    return error;
  }
}

// Export singleton instance
let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(client?: NileClient): SettingsService {
  if (!settingsServiceInstance) {
    settingsServiceInstance = new SettingsService(client);
  }
  return settingsServiceInstance;
}

// Export for testing
export { SettingsService as _SettingsService };