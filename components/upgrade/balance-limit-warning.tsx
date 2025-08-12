'use client'

import React from 'react'
import { UpgradePrompt } from './upgrade-prompt'
import { SubscriptionTier } from '@/lib/subscription/tier-config'
import { useUpgradePromptContext } from './upgrade-prompt-provider'

interface BalanceLimitWarningProps {
  currentBalance: number
  balanceLimit: number
  currentTier: SubscriptionTier
  targetTier: SubscriptionTier
  onUpgrade?: (tier: SubscriptionTier) => void
  className?: string
}

export function BalanceLimitWarning({
  currentBalance,
  balanceLimit,
  currentTier,
  targetTier,
  onUpgrade,
  className
}: BalanceLimitWarningProps) {
  const { dismissPrompt } = useUpgradePromptContext()

  // Only show when over limit
  const shouldShow = currentBalance > balanceLimit

  if (!shouldShow) {
    return null
  }

  return (
    <UpgradePrompt
      type="banner"
      reason="balance_limit"
      currentTier={currentTier}
      targetTier={targetTier}
      onUpgrade={(tier, cycle) => onUpgrade?.(tier)}
      onDismiss={dismissPrompt}
      currentBalance={currentBalance}
      balanceLimit={balanceLimit}
      className={className}
    />
  )
}