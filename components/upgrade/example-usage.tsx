'use client'

import React from 'react'
import { UpgradePromptProvider, useUpgradePromptContext } from './upgrade-prompt-provider'
import { AccountLimitBanner } from './account-limit-banner'
import { BalanceLimitWarning } from './balance-limit-warning'
import { FeatureLockDialog } from './feature-lock-dialog'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'
import { Button } from '@/components/ui/button'

// Example component that uses the upgrade prompt context
function ExampleFeature() {
  const { checkFeatureAccess, showUpgradePrompt } = useUpgradePromptContext()

  const handleExportClick = () => {
    if (!checkFeatureAccess('csv_export')) {
      // Prompt will be shown automatically by the context
      return
    }
    
    // Proceed with export functionality
    console.log('Exporting data...')
  }

  const handleManualPrompt = () => {
    showUpgradePrompt('feature_locked', { featureName: 'Advanced Analytics' })
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleExportClick}>
        Export Data (CSV)
      </Button>
      
      <Button onClick={handleManualPrompt} variant="outline">
        Show Manual Prompt
      </Button>
    </div>
  )
}

// Example dashboard component with upgrade prompts
function ExampleDashboard() {
  const currentTier = SubscriptionTier.STARTER
  const currentUsage = {
    connectedAccounts: 3,
    totalBalance: 20000
  }

  const handleUpgrade = (tier: SubscriptionTier, cycle: BillingCycle) => {
    console.log(`Upgrading to ${tier} with ${cycle} billing`)
    // Implement actual upgrade logic here
  }

  const handleUpgradeRequested = (tier: SubscriptionTier, reason: string) => {
    console.log(`Upgrade requested: ${tier} for ${reason}`)
    // Track analytics or show additional UI
  }

  return (
    <UpgradePromptProvider
      currentTier={currentTier}
      currentUsage={currentUsage}
      promptType="modal" // Can be 'modal', 'banner', or 'inline'
      onUpgrade={handleUpgrade}
      onUpgradeRequested={handleUpgradeRequested}
    >
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        {/* Account limit banner - shows when at/over limit */}
        <AccountLimitBanner
          accountCount={currentUsage.connectedAccounts}
          accountLimit={3}
          currentTier={currentTier}
          targetTier={SubscriptionTier.GROWTH}
          onUpgrade={handleUpgrade}
        />
        
        {/* Balance limit warning - shows when over limit */}
        <BalanceLimitWarning
          currentBalance={currentUsage.totalBalance}
          balanceLimit={15000}
          currentTier={currentTier}
          targetTier={SubscriptionTier.GROWTH}
          onUpgrade={handleUpgrade}
        />
        
        {/* Feature that uses the context */}
        <ExampleFeature />
      </div>
    </UpgradePromptProvider>
  )
}

// Example with feature lock dialog
function ExampleWithDialog() {
  const [showDialog, setShowDialog] = React.useState(false)

  return (
    <div className="p-6">
      <Button onClick={() => setShowDialog(true)}>
        Try Premium Feature
      </Button>
      
      <FeatureLockDialog
        featureName="Advanced Investment Tracking"
        currentTier={SubscriptionTier.STARTER}
        targetTier={SubscriptionTier.PRO}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onUpgrade={(tier) => {
          console.log(`Upgrading to ${tier}`)
          setShowDialog(false)
        }}
      />
    </div>
  )
}

export { ExampleDashboard, ExampleWithDialog }