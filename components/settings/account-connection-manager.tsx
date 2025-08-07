'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Building2,
  Shield,
  Zap
} from 'lucide-react';
import { PlaidLinkButton } from '@/components/plaid-link-button';

interface AccountConnectionManagerProps {
  onConnect: () => void;
  onDisconnect: (itemId: string, reason?: string) => Promise<void>;
  onSync: (itemId: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

interface DisconnectDialogState {
  isOpen: boolean;
  itemId: string;
  institutionName: string;
}

interface SyncDialogState {
  isOpen: boolean;
  itemId: string;
  institutionName: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  error?: string;
}

export function AccountConnectionManager({
  onConnect,
  onDisconnect,
  onSync,
  loading = false,
  error,
}: AccountConnectionManagerProps) {
  const [disconnectDialog, setDisconnectDialog] = useState<DisconnectDialogState>({
    isOpen: false,
    itemId: '',
    institutionName: '',
  });

  const [syncDialog, setSyncDialog] = useState<SyncDialogState>({
    isOpen: false,
    itemId: '',
    institutionName: '',
    status: 'idle',
  });

  const handleDisconnectClick = (itemId: string, institutionName: string) => {
    setDisconnectDialog({
      isOpen: true,
      itemId,
      institutionName,
    });
  };

  const handleDisconnectConfirm = async () => {
    try {
      await onDisconnect(disconnectDialog.itemId, 'User requested disconnection');
      setDisconnectDialog({ isOpen: false, itemId: '', institutionName: '' });
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      // Error handling is managed by parent component
    }
  };

  const handleSyncClick = async (itemId: string, institutionName: string) => {
    setSyncDialog({
      isOpen: true,
      itemId,
      institutionName,
      status: 'syncing',
    });

    try {
      await onSync(itemId);
      setSyncDialog(prev => ({ ...prev, status: 'success' }));
      
      // Auto-close success dialog after 2 seconds
      setTimeout(() => {
        setSyncDialog({ isOpen: false, itemId: '', institutionName: '', status: 'idle' });
      }, 2000);
    } catch (error) {
      setSyncDialog(prev => ({ 
        ...prev, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to sync account'
      }));
    }
  };

  const handleSyncDialogClose = () => {
    if (syncDialog.status !== 'syncing') {
      setSyncDialog({ isOpen: false, itemId: '', institutionName: '', status: 'idle' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Account
          </CardTitle>
          <CardDescription>
            Connect additional bank accounts to track all your finances in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Shield className="h-8 w-8 text-green-600" />
              <div>
                <div className="font-medium">Bank-level Security</div>
                <div className="text-sm text-muted-foreground">256-bit encryption</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <div className="font-medium">11,000+ Banks</div>
                <div className="text-sm text-muted-foreground">Supported institutions</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Zap className="h-8 w-8 text-purple-600" />
              <div>
                <div className="font-medium">Real-time Sync</div>
                <div className="text-sm text-muted-foreground">Automatic updates</div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <PlaidLinkButton
              onSuccess={onConnect}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Bank Account
                </>
              )}
            </PlaidLinkButton>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            By connecting your account, you agree to our{' '}
            <a href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/terms" className="underline hover:text-foreground">
              Terms of Service
            </a>
            . We use Plaid to securely connect to your bank.
          </div>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog 
        open={disconnectDialog.isOpen} 
        onOpenChange={(open) => !open && setDisconnectDialog({ isOpen: false, itemId: '', institutionName: '' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Disconnect {disconnectDialog.institutionName}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will disconnect all accounts from {disconnectDialog.institutionName} and stop 
                automatic transaction syncing.
              </p>
              <p className="font-medium">
                Your existing transaction history will be preserved, but no new transactions 
                will be imported from this institution.
              </p>
              <p className="text-sm text-muted-foreground">
                You can reconnect this account at any time.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync Status Dialog */}
      <Dialog open={syncDialog.isOpen} onOpenChange={handleSyncDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {syncDialog.status === 'syncing' && <Loader2 className="h-5 w-5 animate-spin" />}
              {syncDialog.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {syncDialog.status === 'error' && <AlertTriangle className="h-5 w-5 text-destructive" />}
              
              {syncDialog.status === 'syncing' && 'Syncing Account'}
              {syncDialog.status === 'success' && 'Sync Complete'}
              {syncDialog.status === 'error' && 'Sync Failed'}
            </DialogTitle>
            <DialogDescription>
              {syncDialog.status === 'syncing' && (
                <p>Syncing data from {syncDialog.institutionName}. This may take a few moments...</p>
              )}
              {syncDialog.status === 'success' && (
                <p>Successfully synced account data from {syncDialog.institutionName}.</p>
              )}
              {syncDialog.status === 'error' && (
                <div className="space-y-2">
                  <p>Failed to sync data from {syncDialog.institutionName}.</p>
                  {syncDialog.error && (
                    <p className="text-sm text-muted-foreground">{syncDialog.error}</p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {syncDialog.status === 'error' && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleSyncDialogClose}>
                Close
              </Button>
              <Button onClick={() => handleSyncClick(syncDialog.itemId, syncDialog.institutionName)}>
                Try Again
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export the handler functions for use by parent components
export const createAccountConnectionManager = (
  onConnect: () => void,
  onDisconnect: (itemId: string, reason?: string) => Promise<void>,
  onSync: (itemId: string) => Promise<void>
) => {
  return {
    handleDisconnect: (itemId: string, institutionName: string) => {
      return onDisconnect(itemId, 'User requested disconnection');
    },
    handleSync: (itemId: string) => {
      return onSync(itemId);
    },
    handleConnect: onConnect,
  };
};