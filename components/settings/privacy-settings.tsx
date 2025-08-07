'use client';

import React from 'react';
import { PasswordChangeForm } from './password-change-form';
import { TwoFactorSetup } from './two-factor-setup';
import { DataSharingPreferences } from './data-sharing-preferences';
import { AccountDeletionDialog } from './account-deletion-dialog';

interface PrivacySettingsProps {
  className?: string;
}

export function PrivacySettings({ className }: PrivacySettingsProps) {
  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Password Change */}
      <PasswordChangeForm />
      
      {/* Two-Factor Authentication */}
      <TwoFactorSetup />
      
      {/* Data Sharing Preferences */}
      <DataSharingPreferences />
      
      {/* Account Deletion */}
      <AccountDeletionDialog />
    </div>
  );
}