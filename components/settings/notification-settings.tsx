'use client';

import React, { useState } from 'react';
import { NotificationToggleGroup } from './notification-toggle-group';
import { EmailPreferencesForm } from './email-preferences-form';
import { 
  NotificationConfirmationDialog, 
  createNotificationConfirmation,
  type NotificationConfirmationData 
} from './notification-confirmation-dialog';
import { useNotificationSettings } from '@/hooks/use-settings';
import type { UpdateNotificationSettingsRequest } from '@/types';

export function NotificationSettings() {
  const { notifications, updateNotifications, isLoading, error } = useNotificationSettings();
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    data: NotificationConfirmationData | null;
    pendingUpdate: UpdateNotificationSettingsRequest | null;
  }>({
    open: false,
    data: null,
    pendingUpdate: null,
  });

  // Check if an update requires confirmation
  const requiresConfirmation = (updates: UpdateNotificationSettingsRequest): boolean => {
    if (!notifications) return false;

    // Check for critical changes that need confirmation
    const criticalChanges = [
      // Disabling all notifications
      updates.enabled === false && notifications.enabled === true,
      // Disabling email notifications
      updates.email === false && notifications.email === true,
      // Disabling multiple notification types at once
      Object.keys(updates).length > 2,
    ];

    return criticalChanges.some(Boolean);
  };

  // Create confirmation data based on the updates
  const createConfirmationData = (updates: UpdateNotificationSettingsRequest): NotificationConfirmationData => {
    if (!notifications) {
      return createNotificationConfirmation('bulk_change', []);
    }

    const changes = Object.entries(updates).map(([key, newValue]) => {
      const currentValue = notifications[key as keyof typeof notifications];
      const labels: Record<string, string> = {
        enabled: 'All Notifications',
        email: 'Email Notifications',
        goalProgress: 'Goal Progress Notifications',
        accountAlerts: 'Account Alert Notifications',
        systemUpdates: 'System Update Notifications',
        marketingEmails: 'Marketing Email Notifications',
      };

      return {
        setting: key,
        from: Boolean(currentValue),
        to: Boolean(newValue),
        label: labels[key] || key,
      };
    });

    // Determine the type of confirmation needed
    if (updates.enabled === false) {
      return createNotificationConfirmation('disable_all', changes);
    } else if (updates.email === false && notifications.email === true) {
      return createNotificationConfirmation('disable_email', changes);
    } else {
      return createNotificationConfirmation('bulk_change', changes);
    }
  };

  // Handle notification updates with confirmation
  const handleNotificationUpdate = async (updates: UpdateNotificationSettingsRequest) => {
    if (requiresConfirmation(updates)) {
      // Show confirmation dialog
      setConfirmationDialog({
        open: true,
        data: createConfirmationData(updates),
        pendingUpdate: updates,
      });
    } else {
      // Apply updates directly
      await updateNotifications(updates);
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmUpdate = async () => {
    if (confirmationDialog.pendingUpdate) {
      try {
        await updateNotifications(confirmationDialog.pendingUpdate);
      } finally {
        setConfirmationDialog({
          open: false,
          data: null,
          pendingUpdate: null,
        });
      }
    }
  };

  const handleCancelUpdate = () => {
    setConfirmationDialog({
      open: false,
      data: null,
      pendingUpdate: null,
    });
  };

  if (!notifications) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Notification Toggle Group */}
      <NotificationToggleGroup
        notifications={notifications}
        onUpdate={handleNotificationUpdate}
        loading={isLoading}
        error={error}
      />

      {/* Email Preferences Form */}
      <EmailPreferencesForm
        notifications={notifications}
        onUpdate={handleNotificationUpdate}
        loading={isLoading}
        error={error}
      />

      {/* Confirmation Dialog */}
      <NotificationConfirmationDialog
        open={confirmationDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelUpdate();
          }
        }}
        confirmationData={confirmationDialog.data}
        onConfirm={handleConfirmUpdate}
        onCancel={handleCancelUpdate}
        loading={isLoading}
      />
    </div>
  );
}