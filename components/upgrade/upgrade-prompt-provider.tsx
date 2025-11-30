'use client'

import React, { createContext, useContext, useCallback, useEffect } from 'react'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'
import { UpgradePrompt, UpgradePromptType, UpgradeReason } from './upgrade-prompt'
import { useUpgradePrompts, UseUpgradePromptsOptions } from '@/hooks/use-upgrade-prompts'
import { eventBus, EVENTS } from '@/lib/events'

interface UpgradePromptContextValue {
  checkAccountLimit: (accountCount: number) => boolean
  checkBalanceLimit: (balance: number) => boolean
  checkFeatureAccess: (featureName: string) => boolean
  showUpgradePrompt: (reason: UpgradeReason, data?: any) => void
  dismissPrompt: () => void
  isDismissed: (reason: UpgradeReason) => boolean
}

const UpgradePromptContext = createContext<UpgradePromptContextValue | null>(null)

export interface UpgradePromptProviderProps {
  children: React.ReactNode
  currentTier: SubscriptionTier
  currentUsage?: {
    connectedAccounts: number
    totalBalance: number
  }
  promptType?: UpgradePromptType
  onUpgrade?: (tier: SubscriptionTier, cycle: BillingCycle) => void
  onUpgradeRequested?: (tier: SubscriptionTier, reason: UpgradeReason) => void
}

export function UpgradePromptProvider({
  children,
  currentTier,
  currentUsage,
  promptType = 'modal',
  onUpgrade,
  onUpgradeRequested
}: UpgradePromptProviderProps) {
  const {
    promptState,
    checkAccountLimit,
    checkBalanceLimit,
    checkFeatureAccess,
    showUpgradePrompt,
    dismissPrompt,
    isDismissed
  } = useUpgradePrompts({
    currentTier,
    currentUsage,
    onUpgradeRequested
  })

  // Listen for global limit events
  useEffect(() => {
    const handleLimitExceeded = (data: any) => {
      let reason: UpgradeReason = 'account_limit'
      const promptData: any = {}

      if (data?.limitType === 'Connected accounts') {
        reason = 'account_limit'
        promptData.accountCount = data.currentValue
        promptData.accountLimit = data.limitValue
      } else if (data?.limitType === 'Total balance tracking') {
        reason = 'balance_limit'
        promptData.currentBalance = data.currentValue
        promptData.balanceLimit = data.limitValue
      }

      showUpgradePrompt(reason, promptData)
    }

    const handleFeatureLocked = (data: any) => {
      showUpgradePrompt('feature_locked', {
        featureName: data?.feature
      })
    }

    eventBus.on(EVENTS.TIER_LIMIT_EXCEEDED, handleLimitExceeded)
    eventBus.on(EVENTS.FEATURE_LOCKED, handleFeatureLocked)

    return () => {
      eventBus.off(EVENTS.TIER_LIMIT_EXCEEDED, handleLimitExceeded)
      eventBus.off(EVENTS.FEATURE_LOCKED, handleFeatureLocked)
    }
  }, [showUpgradePrompt])

  const handleUpgrade = useCallback((tier: SubscriptionTier, cycle: BillingCycle) => {
    onUpgrade?.(tier, cycle)
    dismissPrompt()
  }, [onUpgrade, dismissPrompt])

  const contextValue: UpgradePromptContextValue = {
    checkAccountLimit,
    checkBalanceLimit,
    checkFeatureAccess,
    showUpgradePrompt,
    dismissPrompt,
    isDismissed
  }

  return (
    <UpgradePromptContext.Provider value={contextValue}>
      {children}
      
      {promptState && (
        <UpgradePrompt
          type={promptType}
          reason={promptState.reason}
          currentTier={promptState.currentTier}
          targetTier={promptState.targetTier}
          isOpen={promptState.isVisible}
          onClose={dismissPrompt}
          onUpgrade={handleUpgrade}
          onDismiss={dismissPrompt}
          accountCount={promptState.data.accountCount}
          accountLimit={promptState.data.accountLimit}
          currentBalance={promptState.data.currentBalance}
          balanceLimit={promptState.data.balanceLimit}
          featureName={promptState.data.featureName}
        />
      )}
    </UpgradePromptContext.Provider>
  )
}

export function useUpgradePromptContext(): UpgradePromptContextValue {
  const context = useContext(UpgradePromptContext)
  if (!context) {
    throw new Error('useUpgradePromptContext must be used within an UpgradePromptProvider')
  }
  return context
}