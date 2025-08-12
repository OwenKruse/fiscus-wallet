'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SubscriptionTier, TIER_CONFIGS } from '@/lib/subscription/tier-config'
import { UsageMetric } from '@/lib/subscription/types'
import { ArrowUp, CreditCard, DollarSign, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UsageIndicatorProps {
  currentTier: SubscriptionTier
  usageMetrics: UsageMetric[]
  onUpgrade?: (tier: SubscriptionTier) => void
  className?: string
  showUpgradeButton?: boolean
  compact?: boolean
}

interface UsageItemProps {
  label: string
  current: number
  limit: number | 'unlimited'
  unit?: string
  icon?: React.ComponentType<{ className?: string }>
  formatValue?: (value: number) => string
  isOverLimit?: boolean
  compact?: boolean
}

function UsageItem({
  label,
  current,
  limit,
  unit = '',
  icon: Icon,
  formatValue = (value) => value.toString(),
  isOverLimit = false,
  compact = false
}: UsageItemProps) {
  const percentage = limit === 'unlimited' ? 0 : Math.min((current / limit) * 100, 100)
  const isAtLimit = limit !== 'unlimited' && current >= limit
  const isNearLimit = limit !== 'unlimited' && current >= limit * 0.8

  const getProgressColor = () => {
    if (isOverLimit || isAtLimit) return 'bg-destructive'
    if (isNearLimit) return 'bg-yellow-500'
    return 'bg-primary'
  }

  const getStatusColor = () => {
    if (isOverLimit || isAtLimit) return 'text-destructive'
    if (isNearLimit) return 'text-yellow-600'
    return 'text-muted-foreground'
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 flex-1">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-16">
            {limit === 'unlimited' ? (
              <Badge variant="secondary" className="text-xs">
                Unlimited
              </Badge>
            ) : (
              <Progress 
                value={percentage} 
                className="h-2"
                style={{
                  '--progress-background': getProgressColor()
                } as React.CSSProperties}
              />
            )}
          </div>
          <span className={cn("text-sm tabular-nums min-w-fit", getStatusColor())}>
            {formatValue(current)}{unit}
            {limit !== 'unlimited' && (
              <span className="text-muted-foreground">
                /{formatValue(limit)}{unit}
              </span>
            )}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={cn("text-sm tabular-nums", getStatusColor())}>
          {formatValue(current)}{unit}
          {limit !== 'unlimited' && (
            <span className="text-muted-foreground">
              /{formatValue(limit)}{unit}
            </span>
          )}
        </span>
      </div>
      {limit !== 'unlimited' && (
        <div className="space-y-1">
          <Progress 
            value={percentage} 
            className="h-2"
            style={{
              '--progress-background': getProgressColor()
            } as React.CSSProperties}
          />
          {(isOverLimit || isAtLimit || isNearLimit) && (
            <div className="flex items-center gap-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isOverLimit || isAtLimit ? "bg-destructive" : "bg-yellow-500"
              )} />
              <span className="text-xs text-muted-foreground">
                {isOverLimit || isAtLimit ? 'Limit reached' : 'Near limit'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function UsageIndicator({
  currentTier,
  usageMetrics,
  onUpgrade,
  className,
  showUpgradeButton = true,
  compact = false
}: UsageIndicatorProps) {
  const tierLimits = TIER_CONFIGS[currentTier]
  
  // Find usage metrics by type
  const accountsUsage = usageMetrics.find(m => m.metricType === 'connected_accounts')
  const balanceUsage = usageMetrics.find(m => m.metricType === 'total_balance')
  const exportsUsage = usageMetrics.find(m => m.metricType === 'transaction_exports')
  const syncUsage = usageMetrics.find(m => m.metricType === 'sync_requests')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const hasLimitsToShow = tierLimits.accounts !== 'unlimited' || 
                         tierLimits.balanceLimit !== 'unlimited'

  const isNearAnyLimit = [
    accountsUsage && tierLimits.accounts !== 'unlimited' && 
      accountsUsage.currentValue >= (tierLimits.accounts as number) * 0.8,
    balanceUsage && tierLimits.balanceLimit !== 'unlimited' && 
      balanceUsage.currentValue >= (tierLimits.balanceLimit as number) * 0.8
  ].some(Boolean)

  const nextTier = currentTier === SubscriptionTier.STARTER 
    ? SubscriptionTier.GROWTH 
    : SubscriptionTier.PRO

  if (compact) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Usage</h4>
              <Badge variant="outline" className="text-xs">
                {currentTier}
              </Badge>
            </div>
            
            {accountsUsage && (
              <UsageItem
                label="Accounts"
                current={accountsUsage.currentValue}
                limit={tierLimits.accounts}
                icon={CreditCard}
                compact={true}
              />
            )}
            
            {balanceUsage && (
              <UsageItem
                label="Balance"
                current={balanceUsage.currentValue}
                limit={tierLimits.balanceLimit}
                icon={DollarSign}
                formatValue={formatCurrency}
                compact={true}
              />
            )}

            {showUpgradeButton && isNearAnyLimit && currentTier !== SubscriptionTier.PRO && (
              <div className="pt-2 border-t">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onUpgrade?.(nextTier)}
                  className="w-full text-xs"
                >
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Upgrade to {nextTier}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Usage & Limits</CardTitle>
          <Badge variant="outline">
            {currentTier} Plan
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {accountsUsage && (
          <UsageItem
            label="Connected Accounts"
            current={accountsUsage.currentValue}
            limit={tierLimits.accounts}
            icon={CreditCard}
          />
        )}
        
        {balanceUsage && (
          <UsageItem
            label="Total Balance Tracked"
            current={balanceUsage.currentValue}
            limit={tierLimits.balanceLimit}
            icon={DollarSign}
            formatValue={formatCurrency}
          />
        )}

        {exportsUsage && (
          <UsageItem
            label="Monthly Exports"
            current={exportsUsage.currentValue}
            limit={30} // Example limit for exports
            icon={Zap}
          />
        )}

        {syncUsage && (
          <UsageItem
            label="Sync Frequency"
            current={1}
            limit="unlimited"
            unit={` (${tierLimits.syncFrequency})`}
            icon={Zap}
            formatValue={() => tierLimits.syncFrequency}
          />
        )}

        {!hasLimitsToShow && (
          <div className="text-center py-4 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Unlimited usage on {currentTier} plan</p>
          </div>
        )}

        {showUpgradeButton && currentTier !== SubscriptionTier.PRO && (
          <div className="pt-4 border-t">
            <Button 
              onClick={() => onUpgrade?.(nextTier)}
              className="w-full"
              variant={isNearAnyLimit ? "default" : "outline"}
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Upgrade to {nextTier}
              {isNearAnyLimit && " - Near Limits"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}