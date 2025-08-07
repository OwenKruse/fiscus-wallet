'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, CheckCircle, AlertCircle, Info, Mail } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/use-settings';
import type { NotificationSettings, UpdateNotificationSettingsRequest } from '@/types';

interface NotificationToggleGroupProps {
  notifications: NotificationSettings;
  onUpdate: (updates: UpdateNotificationSettingsRequest) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export function NotificationToggleGroup({
  notifications,
  onUpdate,
  loading = false,
  error
}: NotificationToggleGroupProps) {
  const [localSettings, setLocalSettings] = useState(notifications);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    const updates = { [key]: value };
    
    // Update local state immediately for optimistic UI
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      await onUpdate(updates);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // Revert local state on error
      setLocalSettings(prev => ({ ...prev, [key]: !value }));
      setSaveError(err instanceof Error ? err.message : 'Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMasterToggle = async (enabled: boolean) => {
    const updates: UpdateNotificationSettingsRequest = {
      enabled,
      // If disabling master, disable all notifications
      ...(enabled ? {} : {
        email: false,
        goalProgress: false,
        accountAlerts: false,
        systemUpdates: false,
        marketingEmails: false,
      })
    };

    // Update local state immediately
    setLocalSettings(prev => ({
      ...prev,
      enabled,
      ...(enabled ? {} : {
        email: false,
        goalProgress: false,
        accountAlerts: false,
        systemUpdates: false,
        marketingEmails: false,
      })
    }));

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      await onUpdate(updates);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // Revert local state on error
      setLocalSettings(notifications);
      setSaveError(err instanceof Error ? err.message : 'Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const notificationTypes = [
    {
      key: 'goalProgress' as const,
      label: 'Goal Progress',
      description: 'Get notified when you make progress towards your financial goals',
      icon: CheckCircle,
      disabled: !localSettings.enabled,
    },
    {
      key: 'accountAlerts' as const,
      label: 'Account Alerts',
      description: 'Receive alerts for important account activities and changes',
      icon: AlertCircle,
      disabled: !localSettings.enabled,
    },
    {
      key: 'systemUpdates' as const,
      label: 'System Updates',
      description: 'Stay informed about new features and system maintenance',
      icon: Info,
      disabled: !localSettings.enabled,
    },
    {
      key: 'marketingEmails' as const,
      label: 'Marketing Communications',
      description: 'Receive tips, insights, and promotional content',
      icon: Mail,
      disabled: !localSettings.enabled,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {localSettings.enabled ? (
            <Bell className="h-5 w-5 text-blue-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Control which notifications you receive and how you're contacted.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Display */}
        {(error || saveError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || saveError}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {saveSuccess && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Notification settings updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="space-y-1">
            <Label htmlFor="notifications-enabled" className="text-base font-medium">
              Enable Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Master control for all notification types
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={localSettings.enabled}
            onCheckedChange={handleMasterToggle}
            disabled={loading || saving}
          />
        </div>

        <Separator />

        {/* Individual Notification Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Notification Types
          </h4>
          
          {notificationTypes.map(({ key, label, description, icon: Icon, disabled }) => (
            <div
              key={key}
              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                disabled ? 'bg-muted/30 opacity-60' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <Icon className={`h-5 w-5 mt-0.5 ${disabled ? 'text-gray-400' : 'text-blue-600'}`} />
                <div className="space-y-1 flex-1">
                  <Label 
                    htmlFor={`notification-${key}`} 
                    className={`text-sm font-medium cursor-pointer ${disabled ? 'text-muted-foreground' : ''}`}
                  >
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
              <Switch
                id={`notification-${key}`}
                checked={localSettings[key]}
                onCheckedChange={(value) => handleToggle(key, value)}
                disabled={disabled || loading || saving}
              />
            </div>
          ))}
        </div>

        <Separator />

        {/* Email Notifications Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50">
          <div className="space-y-1">
            <Label htmlFor="email-notifications" className="text-base font-medium">
              Email Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email in addition to in-app notifications
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={localSettings.email}
            onCheckedChange={(value) => handleToggle('email', value)}
            disabled={!localSettings.enabled || loading || saving}
          />
        </div>

        {/* Loading State */}
        {(loading || saving) && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Saving changes...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}