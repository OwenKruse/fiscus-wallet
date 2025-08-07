'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Shield, 
  Megaphone,
  Settings
} from 'lucide-react';
import type { NotificationSettings, UpdateNotificationSettingsRequest } from '@/types';

interface EmailPreferencesFormProps {
  notifications: NotificationSettings;
  onUpdate: (updates: UpdateNotificationSettingsRequest) => Promise<void>;
  loading?: boolean;
  error?: string;
}

interface EmailPreference {
  key: keyof NotificationSettings;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  frequency: string;
  category: 'essential' | 'updates' | 'marketing';
  enabled: boolean;
}

export function EmailPreferencesForm({
  notifications,
  onUpdate,
  loading = false,
  error
}: EmailPreferencesFormProps) {
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
      setSaveError(err instanceof Error ? err.message : 'Failed to update email preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpdate = async (category: 'essential' | 'updates' | 'marketing', enabled: boolean) => {
    const categoryPreferences = emailPreferences.filter(pref => pref.category === category);
    const updates: UpdateNotificationSettingsRequest = {};
    
    categoryPreferences.forEach(pref => {
      updates[pref.key] = enabled;
    });

    // Update local state immediately
    setLocalSettings(prev => ({ ...prev, ...updates }));

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
      setSaveError(err instanceof Error ? err.message : 'Failed to update email preferences');
    } finally {
      setSaving(false);
    }
  };

  const emailPreferences: EmailPreference[] = [
    {
      key: 'goalProgress',
      label: 'Goal Progress Updates',
      description: 'Weekly summaries of your progress towards financial goals',
      icon: TrendingUp,
      frequency: 'Weekly',
      category: 'essential',
      enabled: localSettings.goalProgress && localSettings.email,
    },
    {
      key: 'accountAlerts',
      label: 'Account Security Alerts',
      description: 'Important security notifications and account changes',
      icon: Shield,
      frequency: 'Immediate',
      category: 'essential',
      enabled: localSettings.accountAlerts && localSettings.email,
    },
    {
      key: 'systemUpdates',
      label: 'Product Updates',
      description: 'New features, improvements, and maintenance notifications',
      icon: Settings,
      frequency: 'Monthly',
      category: 'updates',
      enabled: localSettings.systemUpdates && localSettings.email,
    },
    {
      key: 'marketingEmails',
      label: 'Tips & Insights',
      description: 'Financial tips, market insights, and educational content',
      icon: Megaphone,
      frequency: 'Bi-weekly',
      category: 'marketing',
      enabled: localSettings.marketingEmails && localSettings.email,
    },
  ];

  const getCategoryStats = (category: 'essential' | 'updates' | 'marketing') => {
    const categoryPrefs = emailPreferences.filter(pref => pref.category === category);
    const enabledCount = categoryPrefs.filter(pref => pref.enabled).length;
    return { total: categoryPrefs.length, enabled: enabledCount };
  };

  const categories = [
    {
      id: 'essential' as const,
      label: 'Essential',
      description: 'Critical notifications for account security and goal tracking',
      color: 'bg-red-100 text-red-800 border-red-200',
      stats: getCategoryStats('essential'),
    },
    {
      id: 'updates' as const,
      label: 'Product Updates',
      description: 'Information about new features and improvements',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      stats: getCategoryStats('updates'),
    },
    {
      id: 'marketing' as const,
      label: 'Educational',
      description: 'Tips, insights, and educational content',
      color: 'bg-green-100 text-green-800 border-green-200',
      stats: getCategoryStats('marketing'),
    },
  ];

  const isEmailEnabled = localSettings.enabled && localSettings.email;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className={`h-5 w-5 ${isEmailEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
          Email Preferences
        </CardTitle>
        <CardDescription>
          Customize which notifications you receive via email and how often.
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
              Email preferences updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Email Disabled Warning */}
        {!isEmailEnabled && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Email notifications are currently disabled. Enable them in the notification preferences above to receive emails.
            </AlertDescription>
          </Alert>
        )}

        {/* Category Management */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Email Categories
          </h4>
          
          {categories.map(({ id, label, description, color, stats }) => (
            <div key={id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={color}>
                    {label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {stats.enabled} of {stats.total} enabled
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkUpdate(id, true)}
                    disabled={!isEmailEnabled || loading || saving || stats.enabled === stats.total}
                  >
                    Enable All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkUpdate(id, false)}
                    disabled={!isEmailEnabled || loading || saving || stats.enabled === 0}
                  >
                    Disable All
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
              
              <div className="space-y-2">
                {emailPreferences
                  .filter(pref => pref.category === id)
                  .map(({ key, label: prefLabel, description: prefDesc, icon: Icon, frequency, enabled }) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                        !isEmailEnabled ? 'bg-muted/30 opacity-60' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className={`h-4 w-4 mt-0.5 ${!isEmailEnabled ? 'text-gray-400' : 'text-blue-600'}`} />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Label 
                              htmlFor={`email-${key}`} 
                              className={`text-sm font-medium cursor-pointer ${!isEmailEnabled ? 'text-muted-foreground' : ''}`}
                            >
                              {prefLabel}
                            </Label>
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {frequency}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {prefDesc}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={`email-${key}`}
                        checked={enabled}
                        onCheckedChange={(value) => handleToggle(key, value)}
                        disabled={!isEmailEnabled || loading || saving}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Email Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Email Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-lg">
                {emailPreferences.filter(p => p.enabled).length}
              </div>
              <div className="text-muted-foreground">Active Email Types</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-lg">
                {categories.reduce((sum, cat) => sum + cat.stats.enabled, 0)}
              </div>
              <div className="text-muted-foreground">Total Subscriptions</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-lg">
                {isEmailEnabled ? 'Enabled' : 'Disabled'}
              </div>
              <div className="text-muted-foreground">Email Status</div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(loading || saving) && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Updating preferences...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}