'use client';

import React from 'react';
import { useSettings, useDisplaySettings, useNotificationSettings } from '../hooks/use-settings';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2 } from 'lucide-react';

/**
 * Example component demonstrating how to use the settings context
 * This shows the basic patterns for reading and updating settings
 */
export function SettingsExample() {
  const { settings, isLoading, error } = useSettings();
  const { display, changeTheme, changeCurrency } = useDisplaySettings();
  const { notifications, toggleNotification } = useNotificationSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading settings: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <AlertDescription>
          No settings available. Please sign in to manage your preferences.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings Example</h2>
        <p className="text-muted-foreground">
          This demonstrates how to use the settings context in your components.
        </p>
      </div>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>
            Customize how the application looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Theme</label>
              <p className="text-sm text-muted-foreground">
                Current: {display?.theme || 'Not set'}
              </p>
            </div>
            <Select
              value={display?.theme || 'light'}
              onValueChange={(value: 'light' | 'dark' | 'system') => changeTheme(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Currency</label>
              <p className="text-sm text-muted-foreground">
                Current: {display?.currency || 'Not set'}
              </p>
            </div>
            <Select
              value={display?.currency || 'USD'}
              onValueChange={changeCurrency}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="CAD">CAD (C$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Control what notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Email Notifications</label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={notifications?.email || false}
              onCheckedChange={() => toggleNotification('emailNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Goal Progress</label>
              <p className="text-sm text-muted-foreground">
                Get notified about goal milestones
              </p>
            </div>
            <Switch
              checked={notifications?.goalProgress || false}
              onCheckedChange={() => toggleNotification('goalNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Account Alerts</label>
              <p className="text-sm text-muted-foreground">
                Important account-related notifications
              </p>
            </div>
            <Switch
              checked={notifications?.accountAlerts || false}
              onCheckedChange={() => toggleNotification('accountAlerts')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your current profile settings (read-only in this example)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Name:</span>
              <span className="ml-2">
                {settings.profile.firstName} {settings.profile.lastName}
              </span>
            </div>
            <div>
              <span className="font-medium">Email:</span>
              <span className="ml-2">{settings.profile.email}</span>
            </div>
            <div>
              <span className="font-medium">Phone:</span>
              <span className="ml-2">{settings.profile.phone || 'Not set'}</span>
            </div>
            <div>
              <span className="font-medium">Email Verified:</span>
              <span className="ml-2">
                {settings.profile.emailVerified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Summary</CardTitle>
          <CardDescription>
            Overview of your current settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            <p><strong>Theme:</strong> {display?.theme}</p>
            <p><strong>Currency:</strong> {display?.currency}</p>
            <p><strong>Date Format:</strong> {display?.dateFormat}</p>
            <p><strong>Language:</strong> {display?.language}</p>
            <p><strong>Notifications Enabled:</strong> {notifications?.enabled ? 'Yes' : 'No'}</p>
            <p><strong>Two-Factor Auth:</strong> {settings.privacy.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Auto Sync:</strong> {settings.accounts.autoSyncEnabled ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Sync Frequency:</strong> {settings.accounts.syncFrequency}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}