'use client'

import React, { createContext, useContext, useCallback } from 'react'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'
import { UpgradePrompt, UpgradePromptType, UpgradeReason } from './upgrade-prompt'
import { useUpgradePrompts, UseUpgradePromptsOptions } from '@/hooks/use-upgrade-prompts'

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