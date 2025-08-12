'use client'

import React from 'react'
import { UpgradePrompt } from './upgrade-prompt'
import { SubscriptionTier } from '@/lib/subscription/tier-config'
import { useUpgradePromptContext } from './upgrade-prompt-provider'

interface AccountLimitBannerProps {
  accountCount: number
  accountLimit: number
  currentTier: SubscriptionTier
  targetTier: SubscriptionTier
  onUpgrade?: (tier: SubscriptionTier) => void
  className?: string
}

export function AccountLimitBanner({
  accountCount,
  accountLimit,
  currentTier,
  targetTier,
  onUpgrade,
  className
}: AccountLimitBannerProps) {
  const { dismissPrompt } = useUpgradePromptContext()

  // Only show when at or near limit
  const shouldShow = accountCount >= accountLimit

  if (!shouldShow) {
    return null
  }

  return (
    <UpgradePrompt
      type="banner"
      reason="account_limit"
      currentTier={currentTier}
      targetTier={targetTier}
      onUpgrade={(tier, cycle) => onUpgrade?.(tier)}
      onDismiss={dismissPrompt}
      accountCount={accountCount}
      accountLimit={accountLimit}
      className={className}
    />
  )
}