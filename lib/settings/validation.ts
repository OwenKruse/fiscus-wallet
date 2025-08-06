import { z } from 'zod';
import type {
  ThemeOption,
  SyncFrequency,
  DateFormatOption,
  CurrencyOption,
  LanguageOption,
  TimezoneOption,
} from '../../types';

// Base validation schemas
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 characters')
  .optional()
  .or(z.literal(''));

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Theme validation
export const themeSchema = z.enum(['light', 'dark', 'system'] as const, {
  errorMap: () => ({ message: 'Theme must be light, dark, or system' }),
});

// Currency validation
export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'] as const, {
  errorMap: () => ({ message: 'Invalid currency format' }),
});

// Date format validation
export const dateFormatSchema = z.enum(['MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MMM dd, yyyy'] as const, {
  errorMap: () => ({ message: 'Invalid date format' }),
});

// Language validation
export const languageSchema = z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja'] as const, {
  errorMap: () => ({ message: 'Invalid language option' }),
});

// Timezone validation
export const timezoneSchema = z.enum([
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const, {
  errorMap: () => ({ message: 'Invalid timezone' }),
});

// Sync frequency validation
export const syncFrequencySchema = z.enum(['realtime', 'hourly', 'daily'] as const, {
  errorMap: () => ({ message: 'Sync frequency must be realtime, hourly, or daily' }),
});

// Profile settings validation
export const updateProfileSettingsSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
  profilePictureUrl: z
    .string()
    .url('Please enter a valid URL')
    .max(500, 'URL must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Notification settings validation
export const updateNotificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  goalNotifications: z.boolean().optional(),
  accountAlerts: z.boolean().optional(),
  systemUpdates: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

// Display settings validation
export const updateDisplaySettingsSchema = z.object({
  theme: themeSchema.optional(),
  currencyFormat: currencySchema.optional(),
  dateFormat: dateFormatSchema.optional(),
  timezone: timezoneSchema.optional(),
  language: languageSchema.optional(),
});

// Privacy settings validation
export const updatePrivacySettingsSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  dataSharingAnalytics: z.boolean().optional(),
  dataSharingMarketing: z.boolean().optional(),
  sessionTimeoutMinutes: z
    .number()
    .int('Session timeout must be a whole number')
    .min(5, 'Session timeout must be at least 5 minutes')
    .max(1440, 'Session timeout cannot exceed 24 hours')
    .optional(),
});

// Account settings validation
export const updateAccountSettingsSchema = z.object({
  autoSyncEnabled: z.boolean().optional(),
  syncFrequency: syncFrequencySchema.optional(),
});

// Password change validation
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// Email change validation
export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  password: z.string().min(1, 'Password is required to change email'),
});

// Settings reset validation
export const resetSettingsSchema = z.object({
  category: z.enum(['profile', 'notifications', 'display', 'privacy', 'accounts'] as const).optional(),
});

// User setting item validation (for generic key-value settings)
export const userSettingSchema = z.object({
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .regex(/^[a-z_]+$/, 'Category must contain only lowercase letters and underscores'),
  key: z
    .string()
    .min(1, 'Key is required')
    .max(100, 'Key must be less than 100 characters')
    .regex(/^[a-z_]+$/, 'Key must contain only lowercase letters and underscores'),
  value: z.any(), // Allow any JSON-serializable value
});

// Complete user preferences validation (for full object updates)
export const userPreferencesSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
  profilePictureUrl: z
    .string()
    .url('Please enter a valid URL')
    .max(500, 'URL must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  theme: themeSchema,
  currencyFormat: currencySchema,
  dateFormat: dateFormatSchema,
  timezone: timezoneSchema,
  language: languageSchema,
  notificationsEnabled: z.boolean(),
  emailNotifications: z.boolean(),
  goalNotifications: z.boolean(),
  accountAlerts: z.boolean(),
  systemUpdates: z.boolean(),
  marketingEmails: z.boolean(),
  dataSharingAnalytics: z.boolean(),
  dataSharingMarketing: z.boolean(),
  twoFactorEnabled: z.boolean(),
  sessionTimeoutMinutes: z
    .number()
    .int('Session timeout must be a whole number')
    .min(5, 'Session timeout must be at least 5 minutes')
    .max(1440, 'Session timeout cannot exceed 24 hours'),
  autoSyncEnabled: z.boolean(),
  syncFrequency: syncFrequencySchema,
});

// Partial user preferences validation (for partial updates)
export const partialUserPreferencesSchema = userPreferencesSchema.partial();

// Export all validation schemas as a collection
export const settingsValidationSchemas = {
  updateProfile: updateProfileSettingsSchema,
  updateNotifications: updateNotificationSettingsSchema,
  updateDisplay: updateDisplaySettingsSchema,
  updatePrivacy: updatePrivacySettingsSchema,
  updateAccounts: updateAccountSettingsSchema,
  changePassword: changePasswordSchema,
  changeEmail: changeEmailSchema,
  resetSettings: resetSettingsSchema,
  userSetting: userSettingSchema,
  userPreferences: userPreferencesSchema,
  partialUserPreferences: partialUserPreferencesSchema,
} as const;

// Type exports for the validation schemas
export type UpdateProfileSettingsInput = z.infer<typeof updateProfileSettingsSchema>;
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
export type UpdateDisplaySettingsInput = z.infer<typeof updateDisplaySettingsSchema>;
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsSchema>;
export type UpdateAccountSettingsInput = z.infer<typeof updateAccountSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ResetSettingsInput = z.infer<typeof resetSettingsSchema>;
export type UserSettingInput = z.infer<typeof userSettingSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type PartialUserPreferencesInput = z.infer<typeof partialUserPreferencesSchema>;

// Validation helper functions
export function validateSettingsData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: { field: string; message: string }[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { success: false, errors };
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Validation failed' }],
    };
  }
}

// Specific validation functions for each settings category
export const validateProfileSettings = (data: unknown) =>
  validateSettingsData(updateProfileSettingsSchema, data);

export const validateNotificationSettings = (data: unknown) =>
  validateSettingsData(updateNotificationSettingsSchema, data);

export const validateDisplaySettings = (data: unknown) =>
  validateSettingsData(updateDisplaySettingsSchema, data);

export const validatePrivacySettings = (data: unknown) =>
  validateSettingsData(updatePrivacySettingsSchema, data);

export const validateAccountSettings = (data: unknown) =>
  validateSettingsData(updateAccountSettingsSchema, data);

export const validatePasswordChange = (data: unknown) =>
  validateSettingsData(changePasswordSchema, data);

export const validateEmailChange = (data: unknown) =>
  validateSettingsData(changeEmailSchema, data);

export const validateUserPreferences = (data: unknown) =>
  validateSettingsData(userPreferencesSchema, data);

export const validatePartialUserPreferences = (data: unknown) =>
  validateSettingsData(partialUserPreferencesSchema, data);