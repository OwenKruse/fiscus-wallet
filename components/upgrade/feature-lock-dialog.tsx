'use client'

import React from 'react'
import { UpgradePrompt } from './upgrade-prompt'
import { SubscriptionTier } from '@/lib/subscription/tier-config'

interface FeatureLockDialogProps {
  featureName: string
  currentTier: SubscriptionTier
  targetTier: SubscriptionTier
  isOpen: boolean
  onClose: () => void
  onUpgrade?: (tier: SubscriptionTier) => void
  className?: string
}

export function FeatureLockDialog({
  featureName,
  currentTier,
  targetTier,
  isOpen,
  onClose,
  onUpgrade,
  className
}: FeatureLockDialogProps) {
  return (
    <UpgradePrompt
      type="modal"
      reason="feature_locked"
      currentTier={currentTier}
      targetTier={targetTier}
      isOpen={isOpen}
      onClose={onClose}
      onUpgrade={(tier, cycle) => onUpgrade?.(tier)}
      onDismiss={onClose}
      featureName={featureName}
      className={className}
    />
  )
}