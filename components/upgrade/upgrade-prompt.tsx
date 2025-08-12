'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SubscriptionTier, BillingCycle, TIER_PRICING } from '@/lib/subscription/tier-config'
import { X, ArrowUp, CreditCard, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export type UpgradePromptType = 'modal' | 'banner' | 'inline'
export type UpgradeReason = 'account_limit' | 'balance_limit' | 'feature_locked'

export interface UpgradePromptProps {
  type: UpgradePromptType
  reason: UpgradeReason
  currentTier: SubscriptionTier
  targetTier: SubscriptionTier
  isOpen?: boolean
  onClose?: () => void
  onUpgrade?: (tier: SubscriptionTier, cycle: BillingCycle) => void
  onDismiss?: () => void
  className?: string
  // Specific data for different prompt types
  accountCount?: number
  accountLimit?: number
  currentBalance?: number
  balanceLimit?: number
  featureName?: string
}

const UPGRADE_MESSAGES = {
  account_limit: {
    title: 'Account Limit Reached',
    description: (accountCount: number, accountLimit: number) => 
      `You've linked ${accountCount}/${accountLimit} accounts — upgrade to Growth for up to 10 accounts`,
    icon: CreditCard
  },
  balance_limit: {
    title: 'Balance Limit Exceeded',
    description: (currentBalance: number, balanceLimit: number) => 
      `Your total tracked assets are above $${balanceLimit.toLocaleString()} — upgrade for unlimited balance tracking`,
    icon: ArrowUp
  },
  feature_locked: {
    title: 'Premium Feature',
    description: (featureName: string) => 
      `${featureName} is available in Growth — unlock now for $5/month`,
    icon: Zap
  }
}

export function UpgradePrompt({
  type,
  reason,
  currentTier,
  targetTier,
  isOpen = true,
  onClose,
  onUpgrade,
  onDismiss,
  className,
  accountCount = 0,
  accountLimit = 0,
  currentBalance = 0,
  balanceLimit = 0,
  featureName = ''
}: UpgradePromptProps) {
  const messageConfig = UPGRADE_MESSAGES[reason]
  const Icon = messageConfig.icon
  
  const getDescription = () => {
    switch (reason) {
      case 'account_limit':
        return messageConfig.description(accountCount, accountLimit)
      case 'balance_limit':
        return messageConfig.description(currentBalance, balanceLimit)
      case 'feature_locked':
        return messageConfig.description(featureName)
      default:
        return 'Upgrade to unlock more features'
    }
  }

  const handleUpgrade = (cycle: BillingCycle = BillingCycle.MONTHLY) => {
    onUpgrade?.(targetTier, cycle)
  }

  const handleDismiss = () => {
    onDismiss?.()
    onClose?.()
  }

  const targetPrice = TIER_PRICING[targetTier]
  const monthlyPrice = targetPrice.monthly
  const yearlyPrice = targetPrice.yearly
  const yearlySavings = (monthlyPrice * 12) - yearlyPrice

  if (type === 'modal') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn('sm:max-w-md', className)}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-left">{messageConfig.title}</DialogTitle>
                <DialogDescription className="text-left mt-1">
                  {getDescription()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Upgrade to {targetTier}</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monthly</span>
                  <span className="font-medium">${monthlyPrice}/month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Annual</span>
                  <div className="text-right">
                    <span className="font-medium">${(yearlyPrice / 12).toFixed(0)}/month</span>
                    <div className="text-xs text-green-600">Save ${yearlySavings}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={() => handleUpgrade(BillingCycle.YEARLY)} className="w-full">
              Upgrade Annual - Save ${yearlySavings}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleUpgrade(BillingCycle.MONTHLY)}
              className="w-full"
            >
              Upgrade Monthly - ${monthlyPrice}/month
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="w-full text-sm">
              Maybe later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (type === 'banner') {
    return (
      <Alert className={cn('border-primary/20 bg-primary/5', className)}>
        <Icon className="h-4 w-4 text-primary" />
        <div className="flex-1 flex items-center justify-between">
          <AlertDescription className="flex-1">
            <span className="font-medium">{messageConfig.title}:</span> {getDescription()}
          </AlertDescription>
          <div className="flex items-center gap-2 ml-4">
            <Button 
              size="sm" 
              onClick={() => handleUpgrade()}
              className="whitespace-nowrap"
            >
              Upgrade Now
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismiss}
              className="p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Alert>
    )
  }

  if (type === 'inline') {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm mb-1">{messageConfig.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {getDescription()}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleUpgrade()}>
                  Upgrade to {targetTier}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}