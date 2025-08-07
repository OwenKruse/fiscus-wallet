'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Unlink,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ConnectedAccount {
  id: string;
  name: string;
  officialName?: string;
  type: string;
  subtype: string;
  balance: {
    available?: number;
    current: number;
    limit?: number;
  };
  institutionName: string;
  lastUpdated: string;
  connectionId: string;
  itemId: string;
  status: 'active' | 'error' | 'disconnected';
  lastSync?: string;
}

interface ConnectedAccountsListProps {
  accounts: ConnectedAccount[];
  loading?: boolean;
  error?: string;
  onDisconnect: (itemId: string, institutionName: string) => void;
  onSync: (itemId: string) => void;
  onRefresh: () => void;
}

const getAccountIcon = (type: string, subtype: string) => {
  switch (type) {
    case 'depository':
      return <Wallet className="h-4 w-4" />;
    case 'credit':
      return <CreditCard className="h-4 w-4" />;
    case 'investment':
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <Building2 className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: string, lastSync?: string) => {
  switch (status) {
    case 'active':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    case 'disconnected':
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Disconnected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      );
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatAccountType = (type: string, subtype: string) => {
  const typeMap: Record<string, string> = {
    depository: 'Bank Account',
    credit: 'Credit Card',
    investment: 'Investment',
    loan: 'Loan',
  };

  const subtypeMap: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    'money market': 'Money Market',
    cd: 'Certificate of Deposit',
    'credit card': 'Credit Card',
    '401k': '401(k)',
    ira: 'IRA',
    brokerage: 'Brokerage',
    mortgage: 'Mortgage',
    'auto loan': 'Auto Loan',
    'student loan': 'Student Loan',
  };

  const formattedSubtype = subtypeMap[subtype.toLowerCase()] || subtype;
  const formattedType = typeMap[type] || type;

  return formattedSubtype !== formattedType ? formattedSubtype : formattedType;
};

export function ConnectedAccountsList({
  accounts,
  loading = false,
  error,
  onDisconnect,
  onSync,
  onRefresh,
}: ConnectedAccountsListProps) {
  // Group accounts by institution
  const accountsByInstitution = accounts.reduce((acc, account) => {
    const key = account.institutionName;
    if (!acc[key]) {
      acc[key] = {
        institutionName: key,
        itemId: account.itemId,
        status: account.status,
        lastSync: account.lastSync,
        accounts: [],
      };
    }
    acc[key].accounts.push(account);
    return acc;
  }, {} as Record<string, {
    institutionName: string;
    itemId: string;
    status: string;
    lastSync?: string;
    accounts: ConnectedAccount[];
  }>);

  const institutionGroups = Object.values(accountsByInstitution);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load connected accounts: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Loading your connected financial accounts...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-16 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (institutionGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            No financial accounts connected yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Connect your bank accounts to start tracking your finances.
            </p>
            <Button onClick={onRefresh}>
              Connect Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Manage your connected financial institutions and accounts.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {institutionGroups.map((group, index) => (
          <div key={group.itemId} className="space-y-4">
            {index > 0 && <Separator />}
            
            {/* Institution Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{group.institutionName}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStatusBadge(group.status, group.lastSync)}
                    {group.lastSync && (
                      <span>
                        Last synced {formatDistanceToNow(new Date(group.lastSync), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSync(group.itemId)}
                  disabled={loading || group.status !== 'active'}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDisconnect(group.itemId, group.institutionName)}
                  disabled={loading}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>

            {/* Accounts List */}
            <div className="grid gap-3 ml-12">
              {group.accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {getAccountIcon(account.type, account.subtype)}
                    </div>
                    <div>
                      <div className="font-medium">{account.name}</div>
                      {account.officialName && account.officialName !== account.name && (
                        <div className="text-sm text-muted-foreground">{account.officialName}</div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {formatAccountType(account.type, account.subtype)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(account.balance.current)}
                    </div>
                    {account.balance.available !== undefined && 
                     account.balance.available !== account.balance.current && (
                      <div className="text-sm text-muted-foreground">
                        Available: {formatCurrency(account.balance.available)}
                      </div>
                    )}
                    {account.balance.limit && (
                      <div className="text-sm text-muted-foreground">
                        Limit: {formatCurrency(account.balance.limit)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(account.lastUpdated), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}