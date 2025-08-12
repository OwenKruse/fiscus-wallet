'use client'

import { useState, useEffect, useCallback } from 'react'
import { SubscriptionTier, getTierLimits, getNextTier } from '@/lib/subscription/tier-config'
import { UsageMetricType } from '@/lib/subscription/types'
import { UpgradeReason } from '@/components/upgrade/upgrade-prompt'

export interface UpgradePromptState {
  isVisible: boolean
  reason: UpgradeReason
  currentTier: SubscriptionTier
  targetTier: SubscriptionTier
  data: {
    accountCount?: number
    accountLimit?: number
    currentBalance?: number
    balanceLimit?: number
    featureName?: string
  }
}

export interface UseUpgradePromptsOptions {
  currentTier: SubscriptionTier
  currentUsage?: {
    connectedAccounts: number
    totalBalance: number
  }
  onUpgradeRequested?: (tier: SubscriptionTier, reason: UpgradeReason) => void
}

export interface UseUpgradePromptsReturn {
  promptState: UpgradePromptState | null
  checkAccountLimit: (accountCount: number) => boolean
  checkBalanceLimit: (balance: number) => boolean
  checkFeatureAccess: (featureName: string) => boolean
  showUpgradePrompt: (reason: UpgradeReason, data?: any) => void
  dismissPrompt: () => void
  isDismissed: (reason: UpgradeReason) => boolean
}

const DISMISSED_PROMPTS_KEY = 'dismissed_upgrade_prompts'
const DISMISSAL_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface DismissedPrompt {
  reason: UpgradeReason
  dismissedAt: number
}

export function useUpgradePrompts({
  currentTier,
  currentUsage,
  onUpgradeRequested
}: UseUpgradePromptsOptions): UseUpgradePromptsReturn {
  const [promptState, setPromptState] = useState<UpgradePromptState | null>(null)
  const [dismissedPrompts, setDismissedPrompts] = useState<DismissedPrompt[]>([])

  // Load dismissed prompts from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(DISMISSED_PROMPTS_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as DismissedPrompt[]
          // Filter out expired dismissals
          const now = Date.now()
          const valid = parsed.filter(p => (now - p.dismissedAt) < DISMISSAL_DURATION)
          setDismissedPrompts(valid)
          
          // Update localStorage with filtered list
          if (valid.length !== parsed.length) {
            localStorage.setItem(DISMISSED_PROMPTS_KEY, JSON.stringify(valid))
          }
        }
      } catch (error) {
        console.error('Failed to load dismissed prompts:', error)
      }
    }
  }, [])

  const isDismissed = useCallback((reason: UpgradeReason): boolean => {
    const now = Date.now()
    return dismissedPrompts.some(p => 
      p.reason === reason && (now - p.dismissedAt) < DISMISSAL_DURATION
    )
  }, [dismissedPrompts])

  const dismissPrompt = useCallback(() => {
    if (promptState) {
      const newDismissal: DismissedPrompt = {
        reason: promptState.reason,
        dismissedAt: Date.now()
      }
      
      const updatedDismissals = [...dismissedPrompts, newDismissal]
      setDismissedPrompts(updatedDismissals)
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(DISMISSED_PROMPTS_KEY, JSON.stringify(updatedDismissals))
        } catch (error) {
          console.error('Failed to save dismissed prompts:', error)
        }
      }
    }
    
    setPromptState(null)
  }, [promptState, dismissedPrompts])

  const showUpgradePrompt = useCallback((reason: UpgradeReason, data: any = {}) => {
    // Don't show if already dismissed recently
    if (isDismissed(reason)) {
      return
    }

    const targetTier = getNextTier(currentTier)
    if (!targetTier) {
      return // Already on highest tier
    }

    setPromptState({
      isVisible: true,
      reason,
      currentTier,
      targetTier,
      data
    })

    // Notify parent component
    onUpgradeRequested?.(targetTier, reason)
  }, [currentTier, isDismissed, onUpgradeRequested])

  const checkAccountLimit = useCallback((accountCount: number): boolean => {
    const limits = getTierLimits(currentTier)
    
    if (limits.accounts === 'unlimited') {
      return true // No limit
    }

    const isAtLimit = accountCount >= limits.accounts
    
    if (isAtLimit && !isDismissed('account_limit')) {
      showUpgradePrompt('account_limit', {
        accountCount,
        accountLimit: limits.accounts
      })
    }

    return !isAtLimit
  }, [currentTier, isDismissed, showUpgradePrompt])

  const checkBalanceLimit = useCallback((balance: number): boolean => {
    const limits = getTierLimits(currentTier)
    
    if (limits.balanceLimit === 'unlimited') {
      return true // No limit
    }

    const isOverLimit = balance > limits.balanceLimit
    
    if (isOverLimit && !isDismissed('balance_limit')) {
      showUpgradePrompt('balance_limit', {
        currentBalance: balance,
        balanceLimit: limits.balanceLimit
      })
    }

    return !isOverLimit
  }, [currentTier, isDismissed, showUpgradePrompt])

  const checkFeatureAccess = useCallback((featureName: string): boolean => {
    const limits = getTierLimits(currentTier)
    const hasAccess = limits.features.includes(featureName)
    
    if (!hasAccess && !isDismissed('feature_locked')) {
      showUpgradePrompt('feature_locked', {
        featureName
      })
    }

    return hasAccess
  }, [currentTier, isDismissed, showUpgradePrompt])

  // Auto-check current usage on mount and when usage changes
  useEffect(() => {
    if (currentUsage) {
      // Check account limit
      if (currentUsage.connectedAccounts > 0) {
        checkAccountLimit(currentUsage.connectedAccounts)
      }
      
      // Check balance limit
      if (currentUsage.totalBalance > 0) {
        checkBalanceLimit(currentUsage.totalBalance)
      }
    }
  }, [currentUsage, checkAccountLimit, checkBalanceLimit])

  return {
    promptState,
    checkAccountLimit,
    checkBalanceLimit,
    checkFeatureAccess,
    showUpgradePrompt,
    dismissPrompt,
    isDismissed
  }
}