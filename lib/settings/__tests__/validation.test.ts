import { describe, it, expect } from 'vitest';
import {
  validateProfileSettings,
  validateNotificationSettings,
  validateDisplaySettings,
  validatePrivacySettings,
  validateAccountSettings,
  validatePasswordChange,
  validateEmailChange,
  validateUserPreferences,
  validatePartialUserPreferences,
} from '../validation';

describe('Settings Validation', () => {
  describe('Profile Settings Validation', () => {
    it('should validate valid profile settings', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        profilePictureUrl: 'https://example.com/avatar.jpg',
      };

      const result = validateProfileSettings(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid name with special characters', () => {
      const invalidData = {
        firstName: 'John123',
        lastName: 'Doe',
      };

      const result = validateProfileSettings(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'firstName',
          message: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
        });
      }
    });

    it('should reject invalid phone number', () => {
      const invalidData = {
        phone: 'invalid-phone',
      };

      const result = validateProfileSettings(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'phone',
          message: 'Please enter a valid phone number',
        });
      }
    });

    it('should reject invalid URL', () => {
      const invalidData = {
        profilePictureUrl: 'not-a-url',
      };

      const result = validateProfileSettings(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'profilePictureUrl',
          message: 'Please enter a valid URL',
        });
      }
    });
  });

  describe('Notification Settings Validation', () => {
    it('should validate valid notification settings', () => {
      const validData = {
        notificationsEnabled: true,
        emailNotifications: false,
        goalNotifications: true,
        accountAlerts: true,
        systemUpdates: false,
        marketingEmails: false,
      };

      const result = validateNotificationSettings(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should accept partial notification settings', () => {
      const partialData = {
        emailNotifications: true,
      };

      const result = validateNotificationSettings(partialData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(partialData);
      }
    });
  });

  describe('Display Settings Validation', () => {
    it('should validate valid display settings', () => {
      const validData = {
        theme: 'dark' as const,
        currencyFormat: 'USD' as const,
        dateFormat: 'MM/dd/yyyy' as const,
        timezone: 'America/New_York' as const,
        language: 'en' as const,
      };

      const result = validateDisplaySettings(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid theme', () => {
      const invalidData = {
        theme: 'invalid-theme',
      };

      const result = validateDisplaySettings(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'theme',
          message: 'Theme must be light, dark, or system',
        });
      }
    });

    it('should reject invalid currency', () => {
      const invalidData = {
        currencyFormat: 'INVALID',
      };

      const result = validateDisplaySettings(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'currencyFormat',
          message: 'Invalid currency format',
        });
      }
    });
  });

  describe('Privacy Settings Validation', () => {
    it('should validate valid privacy settings', () => {
      const validData = {
        twoFactorEnabled: true,
        dataSharingAnalytics: false,
        dataSharingMarketing: false,
        sessionTimeoutMinutes: 480,
      };

      const result = validatePrivacySettings(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid session timeout (too low)', () => {
      const invalidData = {
        sessionTimeoutMinutes: 2,
      };

      const result = validatePrivacySettings(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'sessionTimeoutMinutes',
          message: 'Session timeout must be at least 5 minutes',
        });
      }
    });

    it('should reject invalid session timeout (too high)', () => {
      const invalidData = {
        sessionTimeoutMinutes: 2000,
      };

      const result = validatePrivacySettings(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'sessionTimeoutMinutes',
          message: 'Session timeout cannot exceed 24 hours',
        });
      }
    });
  });

  describe('Account Settings Validation', () => {
    it('should validate valid account settings', () => {
      const validData = {
        autoSyncEnabled: true,
        syncFrequency: 'daily' as const,
      };

      const result = validateAccountSettings(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid sync frequency', () => {
      const invalidData = {
        syncFrequency: 'invalid-frequency',
      };

      const result = validateAccountSettings(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'syncFrequency',
          message: 'Sync frequency must be realtime, hourly, or daily',
        });
      }
    });
  });

  describe('Password Change Validation', () => {
    it('should validate valid password change', () => {
      const validData = {
        currentPassword: 'oldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      };

      const result = validatePasswordChange(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject password mismatch', () => {
      const invalidData = {
        currentPassword: 'oldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      };

      const result = validatePasswordChange(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'confirmPassword',
          message: 'Passwords do not match',
        });
      }
    });

    it('should reject same current and new password', () => {
      const invalidData = {
        currentPassword: 'SamePassword123',
        newPassword: 'SamePassword123',
        confirmPassword: 'SamePassword123',
      };

      const result = validatePasswordChange(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'newPassword',
          message: 'New password must be different from current password',
        });
      }
    });

    it('should reject weak password', () => {
      const invalidData = {
        currentPassword: 'oldPassword123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      };

      const result = validatePasswordChange(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.field === 'newPassword')).toBe(true);
      }
    });
  });

  describe('Email Change Validation', () => {
    it('should validate valid email change', () => {
      const validData = {
        newEmail: 'newemail@example.com',
        password: 'currentPassword123',
      };

      const result = validateEmailChange(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid email', () => {
      const invalidData = {
        newEmail: 'invalid-email',
        password: 'currentPassword123',
      };

      const result = validateEmailChange(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual({
          field: 'newEmail',
          message: 'Please enter a valid email address',
        });
      }
    });
  });

  describe('User Preferences Validation', () => {
    it('should validate complete user preferences', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        theme: 'light' as const,
        currencyFormat: 'USD' as const,
        dateFormat: 'MM/dd/yyyy' as const,
        timezone: 'America/New_York' as const,
        language: 'en' as const,
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
      };

      const result = validateUserPreferences(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate partial user preferences', () => {
      const partialData = {
        theme: 'dark' as const,
        emailNotifications: false,
      };

      const result = validatePartialUserPreferences(partialData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(partialData);
      }
    });
  });
});