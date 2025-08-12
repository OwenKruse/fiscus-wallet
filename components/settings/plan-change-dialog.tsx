'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  Crown,
  Zap,
  Star,
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  SubscriptionTier, 
  BillingCycle,
  TIER_PRICING,
  getTierLimits
} from '@/lib/subscription/tier-config';

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: SubscriptionTier;
  targetTier: SubscriptionTier;
  changeType: 'upgrade' | 'downgrade';
  currentBillingCycle: BillingCycle;
  onSuccess: () => void;
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  currentTier,
  targetTier,
  changeType,
  currentBillingCycle,
  onSuccess
}: PlanChangeDialogProps) {
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>(currentBillingCycle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const formatPrice = (tier: SubscriptionTier, cycle: BillingCycle) => {
    const price = TIER_PRICING[tier][cycle === BillingCycle.MONTHLY ? 'monthly' : 'yearly'];
    if (price === 0) return 'Free';
    return cycle === BillingCycle.MONTHLY ? `$${price}/month` : `$${price}/year`;
  };

  const getYearlySavings = (tier: SubscriptionTier) => {
    const monthly = TIER_PRICING[tier].monthly;
    const yearly = TIER_PRICING[tier].yearly;
    if (monthly === 0 || yearly === 0) return 0;
    return (monthly * 12) - yearly;
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = changeType === 'upgrade' ? '/api/subscriptions/upgrade' : '/api/subscriptions/downgrade';
      const requestBody = {
        targetTier,
        billingCycle: selectedBillingCycle,
        ...(changeType === 'downgrade' && targetTier === SubscriptionTier.STARTER && {
          cancelAtPeriodEnd: true
        })
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `Failed to ${changeType} subscription`);
      }

      onSuccess();
    } catch (error) {
      console.error(`${changeType} error:`, error);
      setError(error instanceof Error ? error.message : `Failed to ${changeType} subscription`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentLimits = getTierLimits(currentTier);
  const targetLimits = getTierLimits(targetTier);
  const currentPrice = formatPrice(currentTier, currentBillingCycle);
  const targetPrice = formatPrice(targetTier, selectedBillingCycle);
  const yearlySavings = getYearlySavings(targetTier);

  const isDowngradeToFree = changeType === 'downgrade' && targetTier === SubscriptionTier.STARTER;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {changeType === 'upgrade' ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-orange-600" />
            )}
            {changeType === 'upgrade' ? 'Upgrade' : 'Downgrade'} Your Plan
          </DialogTitle>
          <DialogDescription>
            {changeType === 'upgrade' 
              ? 'Unlock more features and higher limits with your new plan.'
              : isDowngradeToFree
                ? 'Your subscription will be canceled and you\'ll return to the free plan.'
                : 'Your plan will be changed and limits will be adjusted accordingly.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Plan */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={getTierColor(currentTier)}>
                  {getTierIcon(currentTier)}
                  {currentTier}
                </Badge>
                <span className="text-sm text-muted-foreground">Current</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium">{currentPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accounts:</span>
                  <span className="font-medium">
                    {currentLimits.accounts === 'unlimited' ? 'Unlimited' : currentLimits.accounts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Balance Limit:</span>
                  <span className="font-medium">
                    {currentLimits.balanceLimit === 'unlimited' 
                      ? 'Unlimited' 
                      : `$${currentLimits.balanceLimit.toLocaleString()}`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sync:</span>
                  <span className="font-medium capitalize">
                    {currentLimits.syncFrequency === 'realtime' ? 'Real-time' : currentLimits.syncFrequency}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Plan */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={getTierColor(targetTier)}>
                  {getTierIcon(targetTier)}
                  {targetTier}
                </Badge>
                <span className="text-sm text-muted-foreground">New</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium">{targetPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accounts:</span>
                  <span className="font-medium">
                    {targetLimits.accounts === 'unlimited' ? 'Unlimited' : targetLimits.accounts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Balance Limit:</span>
                  <span className="font-medium">
                    {targetLimits.balanceLimit === 'unlimited' 
                      ? 'Unlimited' 
                      : `$${targetLimits.balanceLimit.toLocaleString()}`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sync:</span>
                  <span className="font-medium capitalize">
                    {targetLimits.syncFrequency === 'realtime' ? 'Real-time' : targetLimits.syncFrequency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Billing Cycle Selection (only for paid plans) */}
          {targetTier !== SubscriptionTier.STARTER && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Billing Cycle
              </h4>
              <RadioGroup
                value={selectedBillingCycle}
                onValueChange={(value) => setSelectedBillingCycle(value as BillingCycle)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={BillingCycle.MONTHLY} id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <span>Monthly - {formatPrice(targetTier, BillingCycle.MONTHLY)}</span>
                      <span className="text-sm text-muted-foreground">Billed monthly</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={BillingCycle.YEARLY} id="yearly" />
                  <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <span>Yearly - {formatPrice(targetTier, BillingCycle.YEARLY)}</span>
                      <div className="flex items-center gap-2">
                        {yearlySavings > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Save ${yearlySavings}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">Billed annually</span>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Warnings for downgrades */}
          {changeType === 'downgrade' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isDowngradeToFree ? (
                  <>
                    Your subscription will be canceled at the end of your current billing period. 
                    You'll retain access to {currentTier} features until then, after which you'll 
                    be moved to the free Starter plan.
                  </>
                ) : (
                  <>
                    Downgrading may affect your current usage. If you exceed the new plan's limits, 
                    some features may be restricted until you're within the new limits.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={changeType === 'downgrade' && isDowngradeToFree ? 'destructive' : 'default'}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Processing...
              </>
            ) : (
              <>
                {changeType === 'upgrade' ? (
                  <TrendingUp className="h-4 w-4 mr-2" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-2" />
                )}
                Confirm {changeType === 'upgrade' ? 'Upgrade' : isDowngradeToFree ? 'Cancellation' : 'Downgrade'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}