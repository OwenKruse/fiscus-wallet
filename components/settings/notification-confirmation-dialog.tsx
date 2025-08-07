'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Mail, MailX, AlertTriangle, Info } from 'lucide-react';

export interface NotificationConfirmationData {
  type: 'disable_all' | 'disable_email' | 'enable_critical' | 'bulk_change';
  title: string;
  description: string;
  changes: {
    setting: string;
    from: boolean;
    to: boolean;
    label: string;
  }[];
  severity: 'info' | 'warning' | 'critical';
}

interface NotificationConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmationData: NotificationConfirmationData | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function NotificationConfirmationDialog({
  open,
  onOpenChange,
  confirmationData,
  onConfirm,
  onCancel,
  loading = false
}: NotificationConfirmationDialogProps) {
  if (!confirmationData) return null;

  const getSeverityIcon = () => {
    switch (confirmationData.severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = () => {
    switch (confirmationData.severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getChangeIcon = (from: boolean, to: boolean) => {
    if (from && !to) {
      return <BellOff className="h-4 w-4 text-red-600" />;
    } else if (!from && to) {
      return <Bell className="h-4 w-4 text-green-600" />;
    }
    return <Bell className="h-4 w-4 text-blue-600" />;
  };

  const getChangeBadge = (from: boolean, to: boolean) => {
    if (from && !to) {
      return <Badge variant="destructive" className="text-xs">Disabling</Badge>;
    } else if (!from && to) {
      return <Badge variant="default" className="text-xs bg-green-100 text-green-800">Enabling</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Changing</Badge>;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getSeverityIcon()}
            {confirmationData.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {confirmationData.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Changes Summary */}
        {confirmationData.changes.length > 0 && (
          <div className={`rounded-lg border p-3 ${getSeverityColor()}`}>
            <h4 className="text-sm font-medium mb-2">Changes to be made:</h4>
            <div className="space-y-2">
              {confirmationData.changes.map((change, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getChangeIcon(change.from, change.to)}
                    <span>{change.label}</span>
                  </div>
                  {getChangeBadge(change.from, change.to)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning Messages */}
        {confirmationData.severity === 'critical' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Important Security Notice</p>
                <p className="mt-1">
                  Disabling critical notifications may prevent you from receiving important 
                  security alerts and account updates. We recommend keeping essential 
                  notifications enabled.
                </p>
              </div>
            </div>
          </div>
        )}

        {confirmationData.severity === 'warning' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Please Confirm</p>
                <p className="mt-1">
                  This change will affect how you receive notifications. You can 
                  always change these settings later.
                </p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={
              confirmationData.severity === 'critical' 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600' 
                : confirmationData.severity === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600'
                : ''
            }
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </div>
            ) : (
              'Confirm Changes'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Helper function to create confirmation data for common scenarios
export function createNotificationConfirmation(
  type: NotificationConfirmationData['type'],
  changes: NotificationConfirmationData['changes']
): NotificationConfirmationData {
  switch (type) {
    case 'disable_all':
      return {
        type,
        title: 'Disable All Notifications?',
        description: 'This will turn off all notification types. You won\'t receive any alerts about your account or goals.',
        changes,
        severity: 'critical',
      };

    case 'disable_email':
      return {
        type,
        title: 'Disable Email Notifications?',
        description: 'You will no longer receive notifications via email, but in-app notifications will still work.',
        changes,
        severity: 'warning',
      };

    case 'enable_critical':
      return {
        type,
        title: 'Enable Critical Notifications?',
        description: 'This will enable important security and account notifications to keep your account safe.',
        changes,
        severity: 'info',
      };

    case 'bulk_change':
      return {
        type,
        title: 'Update Multiple Settings?',
        description: 'This will change several notification preferences at once.',
        changes,
        severity: 'info',
      };

    default:
      return {
        type: 'bulk_change',
        title: 'Confirm Changes',
        description: 'Please confirm the changes to your notification settings.',
        changes,
        severity: 'info',
      };
  }
}