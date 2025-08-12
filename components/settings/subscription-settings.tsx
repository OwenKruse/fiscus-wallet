'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  Crown,
  Zap,
  Star
} from 'lucide-react';
import { 
  SubscriptionTier, 
  BillingCycle, 
  SubscriptionStatus,
  TIER_PRICING,
  getTierLimits,
  getNextTier,
  getPreviousTier
} from '@/lib/subscription/tier-config';
import { Subscription } from '@/lib/subscription/types';
import { PlanChangeDialog } from './plan-change-dialog';

interface SubscriptionSettingsProps {
  className?: string;
}

interface SubscriptionData {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
}

export function SubscriptionSettings({ className }: SubscriptionSettingsProps) {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscription: null,
    loading: true,
    error: null
  });
  const [showPlanChangeDialog, setShowPlanChangeDialog] = useState(false);
  const [planChangeType, setPlanChangeType] = useState<'upgrade' | 'downgrade'>('upgrade');
  const [targetTier, setTargetTier] = useState<SubscriptionTier | null>(null);

  // Fetch subscription data
  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setSubscriptionData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/subscriptions');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch subscription');
      }
      
      setSubscriptionData({
        subscription: result.data,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscriptionData({
        subscription: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch subscription'
      });
    }
  };

  const handleUpgrade = (tier?: SubscriptionTier) => {
    const nextTier = tier || (subscriptionData.subscription ? getNextTier(subscriptionData.subscription.tier) : SubscriptionTier.GROWTH);
    if (nextTier) {
      setTargetTier(nextTier);
      setPlanChangeType('upgrade');
      setShowPlanChangeDialog(true);
    }
  };

  const handleDowngrade = (tier?: SubscriptionTier) => {
    const prevTier = tier || (subscriptionData.subscription ? getPreviousTier(subscriptionData.subscription.tier) : SubscriptionTier.STARTER);
    if (prevTier) {
      setTargetTier(prevTier);
      setPlanChangeType('downgrade');
      setShowPlanChangeDialog(true);
    }
  };

  const handlePlanChangeSuccess = () => {
    setShowPlanChangeDialog(false);
    fetchSubscription(); // Refresh subscription data
  };

  const getTierIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.STARTER:
        return <Star className="h-4 w-4" />;
      case SubscriptionTier.GROWTH:
        return <Zap className="h-4 w-4" />;
      case SubscriptionTier.PRO:
        return <Crown className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.STARTER:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case SubscriptionTier.GROWTH:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case SubscriptionTier.PRO:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200';
      case SubscriptionStatus.TRIALING:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case SubscriptionStatus.CANCELED:
        return 'bg-red-100 text-red-800 border-red-200';
      case SubscriptionStatus.PAST_DUE:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case SubscriptionStatus.UNPAID:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (tier: SubscriptionTier, cycle: BillingCycle) => {
    const price = TIER_PRICING[tier][cycle === BillingCycle.MONTHLY ? 'monthly' : 'yearly'];
    if (price === 0) return 'Free';
    return cycle === BillingCycle.MONTHLY ? `$${price}/month` : `$${price}/year`;
  };

  if (subscriptionData.loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (subscriptionData.error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your subscription plan and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {subscriptionData.error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchSubscription} 
            variant="outline" 
            className="mt-4"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const subscription = subscriptionData.subscription;
  const nextTier = subscription ? getNextTier(subscription.tier) : null;
  const prevTier = subscription ? getPreviousTier(subscription.tier) : null;
  const limits = subscription ? getTierLimits(subscription.tier) : null;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription plan and billing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscription ? (
            <>
              {/* Current Plan Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Current Plan</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={getTierColor(subscription.tier)}>
                      {getTierIcon(subscription.tier)}
                      {subscription.tier}
                    </Badge>
                    <Badge className={getStatusColor(subscription.status)}>
                      {subscription.status === SubscriptionStatus.ACTIVE && <CheckCircle className="h-3 w-3" />}
                      {subscription.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Price</p>
                    <p className="text-lg font-semibold">
                      {formatPrice(subscription.tier, subscription.billingCycle)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Billing Cycle</p>
                    <p className="text-lg font-semibold capitalize">
                      {subscription.billingCycle.toLowerCase()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Next Payment</p>
                    <p className="text-lg font-semibold">
                      {subscription.tier === SubscriptionTier.STARTER 
                        ? 'N/A' 
                        : formatDate(subscription.currentPeriodEnd)
                      }
                    </p>
                  </div>
                </div>

                {subscription.cancelAtPeriodEnd && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}. 
                      You'll be downgraded to the Starter plan.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              {/* Plan Features */}
              {limits && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Plan Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Connected Accounts</span>
                        <span className="text-sm font-medium">
                          {limits.accounts === 'unlimited' ? 'Unlimited' : limits.accounts}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Balance Tracking</span>
                        <span className="text-sm font-medium">
                          {limits.balanceLimit === 'unlimited' 
                            ? 'Unlimited' 
                            : `Up to $${limits.balanceLimit.toLocaleString()}`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Transaction History</span>
                        <span className="text-sm font-medium">
                          {limits.transactionHistoryMonths === 'unlimited' 
                            ? 'Unlimited' 
                            : `${limits.transactionHistoryMonths} months`
                          }
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sync Frequency</span>
                        <span className="text-sm font-medium capitalize">
                          {limits.syncFrequency === 'realtime' ? 'Real-time' : limits.syncFrequency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Support</span>
                        <span className="text-sm font-medium">
                          {limits.support === 'none' ? 'Community' : 
                           limits.support === 'email' ? 'Email' : 'Priority Chat'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Features</span>
                        <span className="text-sm font-medium">
                          {limits.features.length} included
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Plan Change Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Change Plan</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  {nextTier && (
                    <Button 
                      onClick={() => handleUpgrade()}
                      className="flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Upgrade to {nextTier}
                    </Button>
                  )}
                  {prevTier && subscription.tier !== SubscriptionTier.STARTER && (
                    <Button 
                      onClick={() => handleDowngrade()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <TrendingDown className="h-4 w-4" />
                      Downgrade to {prevTier}
                    </Button>
                  )}
                  {subscription.tier !== SubscriptionTier.STARTER && !subscription.cancelAtPeriodEnd && (
                    <Button 
                      onClick={() => handleDowngrade(SubscriptionTier.STARTER)}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <TrendingDown className="h-4 w-4" />
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No subscription found</p>
              <Button onClick={() => handleUpgrade(SubscriptionTier.GROWTH)}>
                Get Started
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Change Dialog */}
      {showPlanChangeDialog && targetTier && (
        <PlanChangeDialog
          open={showPlanChangeDialog}
          onOpenChange={setShowPlanChangeDialog}
          currentTier={subscription?.tier || SubscriptionTier.STARTER}
          targetTier={targetTier}
          changeType={planChangeType}
          currentBillingCycle={subscription?.billingCycle || BillingCycle.MONTHLY}
          onSuccess={handlePlanChangeSuccess}
        />
      )}
    </>
  );
}