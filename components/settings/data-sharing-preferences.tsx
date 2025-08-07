'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Database, TrendingUp, Mail, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import type { UpdatePrivacySettingsRequest } from '@/types';

interface DataSharingPreferencesProps {
  className?: string;
}

export function DataSharingPreferences({ className }: DataSharingPreferencesProps) {
  const { privacy, updatePrivacy, isLoading, error } = usePrivacySettings();
  const { toast } = useToast();
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    analytics?: boolean;
    marketing?: boolean;
  } | null>(null);

  // Handle individual preference changes
  const handlePreferenceChange = async (type: 'analytics' | 'marketing', enabled: boolean) => {
    // If disabling a preference, apply immediately
    if (!enabled) {
      await updatePreference(type, enabled);
      return;
    }

    // If enabling, show confirmation dialog
    setPendingChanges({ [type]: enabled });
    setConfirmDialogOpen(true);
  };

  // Apply preference update
  const updatePreference = async (type: 'analytics' | 'marketing', enabled: boolean) => {
    setUpdateStatus('updating');
    setUpdateError(null);

    try {
      const updates: UpdatePrivacySettingsRequest = {
        [`dataSharing${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof UpdatePrivacySettingsRequest]: enabled,
      };

      await updatePrivacy(updates);
      setUpdateStatus('success');
      
      toast({
        title: "Preferences Updated",
        description: `Data sharing for ${type} has been ${enabled ? 'enabled' : 'disabled'}.`,
      });

      // Reset success status after 3 seconds
      setTimeout(() => {
        setUpdateStatus('idle');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to update ${type} preference`;
      setUpdateError(errorMessage);
      setUpdateStatus('error');
    }
  };

  // Confirm and apply pending changes
  const handleConfirmChanges = async () => {
    if (!pendingChanges) return;

    const updates: UpdatePrivacySettingsRequest = {};
    
    if (pendingChanges.analytics !== undefined) {
      updates.dataSharingAnalytics = pendingChanges.analytics;
    }
    if (pendingChanges.marketing !== undefined) {
      updates.dataSharingMarketing = pendingChanges.marketing;
    }

    setUpdateStatus('updating');
    setUpdateError(null);

    try {
      await updatePrivacy(updates);
      setUpdateStatus('success');
      setConfirmDialogOpen(false);
      setPendingChanges(null);
      
      const changeTypes = Object.keys(pendingChanges).join(' and ');
      toast({
        title: "Preferences Updated",
        description: `Data sharing preferences for ${changeTypes} have been updated.`,
      });

      // Reset success status after 3 seconds
      setTimeout(() => {
        setUpdateStatus('idle');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setUpdateError(errorMessage);
      setUpdateStatus('error');
    }
  };

  // Cancel pending changes
  const handleCancelChanges = () => {
    setConfirmDialogOpen(false);
    setPendingChanges(null);
    setUpdateError(null);
  };

  const analyticsEnabled = privacy?.dataSharingAnalytics || false;
  const marketingEnabled = privacy?.dataSharingMarketing || false;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Sharing Preferences
        </CardTitle>
        <CardDescription>
          Control how your data is used to improve our services and provide you with relevant information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Error Alert */}
          {(error || updateError) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {updateError || error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {updateStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Data sharing preferences updated successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Analytics Data Sharing */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <TrendingUp className="h-5 w-5 mt-0.5 text-blue-600" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="analytics-sharing" className="text-base font-medium">
                      Analytics & Performance Data
                    </Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Analytics & Performance Data</DialogTitle>
                          <DialogDescription className="space-y-3">
                            <p>
                              When enabled, we collect anonymized usage data to help us understand how you use our application and improve its performance.
                            </p>
                            <div>
                              <strong>What we collect:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Page views and navigation patterns</li>
                                <li>Feature usage statistics</li>
                                <li>Performance metrics (load times, errors)</li>
                                <li>Device and browser information</li>
                              </ul>
                            </div>
                            <div>
                              <strong>What we don't collect:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Personal financial data</li>
                                <li>Account balances or transaction details</li>
                                <li>Personally identifiable information</li>
                                <li>Login credentials or sensitive data</li>
                              </ul>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              All analytics data is anonymized and aggregated. We never sell your data to third parties.
                            </p>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Help us improve the app by sharing anonymized usage data and performance metrics.
                  </p>
                </div>
              </div>
              <Switch
                id="analytics-sharing"
                checked={analyticsEnabled}
                onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                disabled={isLoading || updateStatus === 'updating'}
              />
            </div>
          </div>

          <Separator />

          {/* Marketing Data Sharing */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Mail className="h-5 w-5 mt-0.5 text-purple-600" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="marketing-sharing" className="text-base font-medium">
                      Marketing & Communications
                    </Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Marketing & Communications</DialogTitle>
                          <DialogDescription className="space-y-3">
                            <p>
                              When enabled, we may use your preferences and usage patterns to provide you with relevant product updates, tips, and promotional content.
                            </p>
                            <div>
                              <strong>What this enables:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Personalized product recommendations</li>
                                <li>Relevant feature announcements</li>
                                <li>Educational content based on your usage</li>
                                <li>Special offers and promotions</li>
                              </ul>
                            </div>
                            <div>
                              <strong>Your control:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>You can opt out at any time</li>
                                <li>Unsubscribe from any email communication</li>
                                <li>Control notification preferences separately</li>
                                <li>Your financial data is never used for marketing</li>
                              </ul>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              We respect your privacy and will never spam you or share your information with third-party marketers.
                            </p>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive personalized recommendations and relevant product updates based on your usage.
                  </p>
                </div>
              </div>
              <Switch
                id="marketing-sharing"
                checked={marketingEnabled}
                onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                disabled={isLoading || updateStatus === 'updating'}
              />
            </div>
          </div>

          {/* Privacy Information */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Your Privacy Rights
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• You can change these preferences at any time</li>
              <li>• All data sharing is optional and can be disabled</li>
              <li>• We never sell your personal data to third parties</li>
              <li>• You can request a copy of your data or account deletion</li>
              <li>• Our privacy policy explains how we protect your information</li>
            </ul>
            <div className="mt-3">
              <Button variant="link" className="h-auto p-0 text-sm">
                Read our Privacy Policy
              </Button>
            </div>
          </div>

          {/* Confirmation Dialog */}
          <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Confirm Data Sharing
                </DialogTitle>
                <DialogDescription>
                  You're about to enable data sharing. Please review what this means:
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {pendingChanges?.analytics && (
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Analytics & Performance Data</h4>
                    <p className="text-sm text-muted-foreground">
                      We'll collect anonymized usage data to improve our services. This helps us understand how features are used and identify areas for improvement.
                    </p>
                  </div>
                )}
                
                {pendingChanges?.marketing && (
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Marketing & Communications</h4>
                    <p className="text-sm text-muted-foreground">
                      We'll use your preferences to provide relevant product updates and recommendations. You can unsubscribe at any time.
                    </p>
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Remember:</strong> Your financial data and personal information are never shared for marketing purposes. You can change these preferences at any time.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelChanges}
                  disabled={updateStatus === 'updating'}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmChanges}
                  disabled={updateStatus === 'updating'}
                >
                  {updateStatus === 'updating' ? (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Confirm & Enable'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}