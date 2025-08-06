'use client';

import type {
  UserSettings,
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

export interface ClientSettingsServiceError extends Error {
  code: string;
  statusCode: number;
  field?: string;
  details?: any;
}

/**
 * Client-side settings service that uses API endpoints
 * This service is safe to use in client components
 */
export class ClientSettingsService {
  private baseUrl = '/api/settings';

  /**
   * Make an authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || 'API request failed') as ClientSettingsServiceError;
      error.code = errorData.code || 'API_ERROR';
      error.statusCode = response.status;
      error.details = errorData;
      throw error;
    }

    return response.json();
  }

  /**
   * Get complete user settings
   */
  async getUserSettings(): Promise<UserSettings> {
    try {
      // Fetch all settings categories in parallel
      const [profile, notifications, display, privacy, accounts] = await Promise.all([
        this.apiRequest<{ data: ProfileSettings }>('/profile'),
        this.apiRequest<{ data: NotificationSettings }>('/notifications'),
        this.apiRequest<{ data: DisplaySettings }>('/display'),
        this.apiRequest<{ data: PrivacySettings }>('/privacy'),
        this.apiRequest<{ data: AccountSettings }>('/accounts'),
      ]);

      // Combine into a single UserSettings object
      const settings: UserSettings = {
        id: 'client-settings', // This would come from the server in a real implementation
        userId: 'current-user', // This would come from auth context
        profile: profile.data,
        notifications: notifications.data,
        display: display.data,
        privacy: privacy.data,
        accounts: accounts.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return settings;
    } catch (error) {
      throw this.createError('SETTINGS_FETCH_FAILED', 'Failed to fetch user settings', 500, error);
    }
  }

  /**
   * Update profile settings
   */
  async updateProfileSettings(updates: UpdateProfileSettingsRequest): Promise<ProfileSettings> {
    try {
      const response = await this.apiRequest<{ data: ProfileSettings }>('/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return response.data;
    } catch (error) {
      throw this.createError('PROFILE_UPDATE_FAILED', 'Failed to update profile settings', 500, error);
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(updates: UpdateNotificationSettingsRequest): Promise<NotificationSettings> {
    try {
      const response = await this.apiRequest<{ data: NotificationSettings }>('/notifications', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return response.data;
    } catch (error) {
      throw this.createError('NOTIFICATIONS_UPDATE_FAILED', 'Failed to update notification settings', 500, error);
    }
  }

  /**
   * Update display settings
   */
  async updateDisplaySettings(updates: UpdateDisplaySettingsRequest): Promise<DisplaySettings> {
    try {
      const response = await this.apiRequest<{ data: DisplaySettings }>('/display', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return response.data;
    } catch (error) {
      throw this.createError('DISPLAY_UPDATE_FAILED', 'Failed to update display settings', 500, error);
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(updates: UpdatePrivacySettingsRequest): Promise<PrivacySettings> {
    try {
      const response = await this.apiRequest<{ data: PrivacySettings }>('/privacy', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return response.data;
    } catch (error) {
      throw this.createError('PRIVACY_UPDATE_FAILED', 'Failed to update privacy settings', 500, error);
    }
  }

  /**
   * Update account settings
   */
  async updateAccountSettings(updates: UpdateAccountSettingsRequest): Promise<AccountSettings> {
    try {
      const response = await this.apiRequest<{ data: AccountSettings }>('/accounts', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return response.data;
    } catch (error) {
      throw this.createError('ACCOUNTS_UPDATE_FAILED', 'Failed to update account settings', 500, error);
    }
  }

  /**
   * Change password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      await this.apiRequest<{ success: boolean }>('/privacy/password', {
        method: 'PUT',
        body: JSON.stringify(passwordData),
      });
    } catch (error) {
      throw this.createError('PASSWORD_CHANGE_FAILED', 'Failed to change password', 500, error);
    }
  }

  /**
   * Change email
   */
  async changeEmail(emailData: ChangeEmailRequest): Promise<void> {
    try {
      await this.apiRequest<{ success: boolean }>('/profile/email', {
        method: 'PUT',
        body: JSON.stringify(emailData),
      });
    } catch (error) {
      throw this.createError('EMAIL_CHANGE_FAILED', 'Failed to change email', 500, error);
    }
  }

  /**
   * Reset user settings to defaults
   */
  async resetUserSettings(category?: SettingsCategory): Promise<void> {
    try {
      await this.apiRequest<{ success: boolean }>('/reset', {
        method: 'POST',
        body: JSON.stringify({ category }),
      });
    } catch (error) {
      throw this.createError('SETTINGS_RESET_FAILED', 'Failed to reset user settings', 500, error);
    }
  }

  /**
   * Export user data
   */
  async exportUserData(): Promise<ExportUserDataResponse> {
    try {
      const response = await this.apiRequest<{ data: ExportUserDataResponse }>('/export', {
        method: 'POST',
      });

      return response.data;
    } catch (error) {
      throw this.createError('DATA_EXPORT_FAILED', 'Failed to export user data', 500, error);
    }
  }

  /**
   * Create a client settings service error
   */
  private createError(code: string, message: string, statusCode: number, originalError?: any): ClientSettingsServiceError {
    const error = new Error(message) as ClientSettingsServiceError;
    error.code = code;
    error.statusCode = statusCode;
    error.details = originalError;
    
    // Log the error for debugging
    console.error(`ClientSettingsService Error [${code}]:`, message, originalError);
    
    return error;
  }
}

// Export singleton instance
let clientSettingsServiceInstance: ClientSettingsService | null = null;

export function getClientSettingsService(): ClientSettingsService {
  if (!clientSettingsServiceInstance) {
    clientSettingsServiceInstance = new ClientSettingsService();
  }
  return clientSettingsServiceInstance;
}

// Export for testing
export { ClientSettingsService as _ClientSettingsService };