'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ConnectedAccountsList, type ConnectedAccount } from './connected-accounts-list';
import { AccountConnectionManager } from './account-connection-manager';
import { useToast } from '@/hooks/use-toast';

interface AccountsSettingsProps {
  className?: string;
}

export function AccountsSettings({ className }: AccountsSettingsProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  // Fetch connected accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/plaid/accounts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch accounts');
      }

      const data = await response.json();
      
      if (data.success && data.data?.accounts) {
        // Transform the accounts data to include connection information
        const transformedAccounts: ConnectedAccount[] = data.data.accounts.map((account: any) => ({
          id: account.id,
          name: account.name,
          officialName: account.officialName,
          type: account.type,
          subtype: account.subtype,
          balance: account.balance,
          institutionName: account.institutionName,
          lastUpdated: account.lastUpdated,
          connectionId: account.connectionId || account.id, // Fallback for connection ID
          itemId: account.itemId || account.id, // This should come from the connection
          status: 'active', // Default to active, should be determined by connection status
          lastSync: account.lastSync,
        }));
        
        setAccounts(transformedAccounts);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts with connection status
  const fetchAccountsWithConnections = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both accounts and connections to get complete data
      const [accountsResponse, connectionsResponse] = await Promise.all([
        fetch('/api/plaid/accounts'),
        fetch('/api/settings/accounts/connections'),
      ]);

      if (!accountsResponse.ok) {
        const errorData = await accountsResponse.json();
        throw new Error(errorData.error?.message || 'Failed to fetch accounts');
      }

      const accountsData = await accountsResponse.json();
      let connectionsData = { success: true, data: { connections: [] } };

      // Fetch connections data if available
      if (connectionsResponse.ok) {
        connectionsData = await connectionsResponse.json();
      }

      if (accountsData.success && accountsData.data?.accounts) {
        // Create a map of connections by institution for easy lookup
        const connectionsMap = new Map();
        if (connectionsData.success && connectionsData.data?.connections) {
          connectionsData.data.connections.forEach((conn: any) => {
            connectionsMap.set(conn.institutionName, conn);
          });
        }

        // Transform accounts and merge with connection data
        const transformedAccounts: ConnectedAccount[] = accountsData.data.accounts.map((account: any) => {
          const connection = connectionsMap.get(account.institutionName);
          
          return {
            id: account.id,
            name: account.name,
            officialName: account.officialName,
            type: account.type,
            subtype: account.subtype,
            balance: account.balance,
            institutionName: account.institutionName,
            lastUpdated: account.lastUpdated,
            connectionId: connection?.id || account.id,
            itemId: connection?.itemId || `item_${account.institutionName.toLowerCase().replace(/\s+/g, '_')}`,
            status: connection?.status || 'active',
            lastSync: connection?.lastSync || account.lastUpdated,
          };
        });
        
        setAccounts(transformedAccounts);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle new account connection
  const handleConnect = async () => {
    try {
      setActionLoading(true);
      
      // The PlaidLinkButton will handle the connection flow
      // After successful connection, refresh the accounts list
      await fetchAccountsWithConnections();
      
      toast({
        title: "Account Connected",
        description: "Your bank account has been successfully connected.",
      });
    } catch (err) {
      console.error('Failed to connect account:', err);
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to connect account",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle account disconnection
  const handleDisconnect = async (itemId: string, reason?: string) => {
    try {
      setActionLoading(true);

      const response = await fetch('/api/settings/accounts/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId, reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to disconnect account');
      }

      // Remove disconnected accounts from the list
      setAccounts(prev => prev.filter(account => account.itemId !== itemId));
      
      toast({
        title: "Account Disconnected",
        description: "Your bank account has been successfully disconnected.",
      });
    } catch (err) {
      console.error('Failed to disconnect account:', err);
      toast({
        title: "Disconnection Failed",
        description: err instanceof Error ? err.message : "Failed to disconnect account",
        variant: "destructive",
      });
      throw err; // Re-throw to let the dialog handle the error
    } finally {
      setActionLoading(false);
    }
  };

  // Handle account sync
  const handleSync = async (itemId: string) => {
    try {
      setActionLoading(true);

      const response = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          forceRefresh: true,
          // Filter by itemId if possible
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to sync account');
      }

      // Refresh accounts after sync
      await fetchAccountsWithConnections();
      
      toast({
        title: "Sync Complete",
        description: "Your account data has been successfully updated.",
      });
    } catch (err) {
      console.error('Failed to sync account:', err);
      toast({
        title: "Sync Failed",
        description: err instanceof Error ? err.message : "Failed to sync account data",
        variant: "destructive",
      });
      throw err; // Re-throw to let the dialog handle the error
    } finally {
      setActionLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchAccountsWithConnections();
  };

  // Load accounts on component mount
  useEffect(() => {
    fetchAccountsWithConnections();
  }, []);

  if (loading && accounts.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connection Manager */}
      <AccountConnectionManager
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onSync={handleSync}
        loading={actionLoading}
      />

      {/* Connected Accounts List */}
      <ConnectedAccountsList
        accounts={accounts}
        loading={loading}
        error={error}
        onDisconnect={handleDisconnect}
        onSync={handleSync}
        onRefresh={handleRefresh}
      />
    </div>
  );
}