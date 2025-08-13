'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { SubscriptionTier, BillingCycle, TIER_CONFIGS, TIER_PRICING } from '@/lib/subscription/tier-config'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PricingCardProps {
  tier: SubscriptionTier
  billingCycle: BillingCycle
  isPopular?: boolean
  onSelectPlan: (tier: SubscriptionTier, cycle: BillingCycle) => void
  className?: string
  disabled?: boolean
}

const TIER_TAGLINES = {
  [SubscriptionTier.STARTER]: 'For personal finance beginners',
  [SubscriptionTier.GROWTH]: 'For active budgeters & investors',
  [SubscriptionTier.PRO]: 'For power users & advanced features'
}

const FEATURE_LABELS = {
  basic_budgeting: 'Basic budgeting',
  goal_tracking: 'Goal tracking',
  mobile_web_access: 'Mobile & web access',
  csv_export: 'CSV/Excel export',
  spending_insights: 'Monthly spending insights',
  trends_analysis: 'Trends analysis',
  investment_tracking: 'Advanced investment tracking',
  tax_reports: 'Tax-ready reports',
  ai_insights: 'AI-driven insights',
  multi_currency: 'Multi-currency support'
}

export function PricingCard({ 
  tier, 
  billingCycle, 
  isPopular = false, 
  onSelectPlan, 
  className,
  disabled = false
}: PricingCardProps) {
  const config = TIER_CONFIGS[tier]
  const pricing = TIER_PRICING[tier]
  const price = billingCycle === BillingCycle.MONTHLY ? pricing.monthly : pricing.yearly
  const monthlyPrice = billingCycle === BillingCycle.YEARLY ? pricing.yearly / 12 : pricing.monthly
  
  const formatLimit = (value: number | 'unlimited') => {
    if (value === 'unlimited') return 'Unlimited'
    if (typeof value === 'number' && value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`
    }
    return value.toString()
  }

  const formatSupport = (support: string) => {
    switch (support) {
      case 'none': return 'Community support'
      case 'email': return 'Email support'
      case 'priority_chat': return 'Priority chat support'
      default: return support
    }
  }

  return (
    <Card className={cn(
      'relative flex flex-col h-full',
      isPopular && 'border-primary shadow-lg scale-105',
      className
    )}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold capitalize">
          {tier.toLowerCase()}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {TIER_TAGLINES[tier]}
        </CardDescription>
        
        <div className="mt-4">
          <div className="flex items-baseline justify-center">
            <span className="text-4xl font-bold">
              ${monthlyPrice === 0 ? '0' : monthlyPrice.toFixed(0)}
            </span>
            <span className="text-muted-foreground ml-1">/month</span>
          </div>
          
          {billingCycle === BillingCycle.YEARLY && price > 0 && (
            <div className="mt-1">
              <span className="text-sm text-muted-foreground line-through">
                ${pricing.monthly}/month
              </span>
              <span className="text-sm text-green-600 ml-2 font-medium">
                Save ${(pricing.monthly * 12 - pricing.yearly)}
              </span>
            </div>
          )}
          
          {billingCycle === BillingCycle.YEARLY && price > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Billed annually (${price})
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
            <span className="text-sm">
              {config.accounts === 'unlimited' ? 'Unlimited' : config.accounts} accounts
            </span>
          </div>
          
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
            <span className="text-sm">
              {formatLimit(config.balanceLimit)} balance tracking
            </span>
          </div>
          
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
            <span className="text-sm">
              {config.transactionHistoryMonths === 'unlimited' 
                ? 'Unlimited' 
                : `${config.transactionHistoryMonths}-month`} transaction history
            </span>
          </div>
          
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
            <span className="text-sm">
              {config.syncFrequency === 'daily' && 'Daily syncs'}
              {config.syncFrequency === 'realtime' && 'Real-time sync'}
              {config.syncFrequency === 'priority' && 'Priority real-time sync'}
            </span>
          </div>
          
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
            <span className="text-sm">
              {formatSupport(config.support)}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <h4 className="font-medium text-sm mb-2">Features included:</h4>
          <div className="space-y-2">
            {config.features.map((feature) => (
              <div key={feature} className="flex items-center">
                <Check className="h-3 w-3 text-green-600 mr-2 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {FEATURE_LABELS[feature as keyof typeof FEATURE_LABELS] || feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <Button 
          className="w-full" 
          variant={isPopular ? 'default' : 'outline'}
          onClick={() => onSelectPlan(tier, billingCycle)}
          disabled={tier === SubscriptionTier.STARTER || disabled}
        >
          {disabled ? 'Processing...' : tier === SubscriptionTier.STARTER ? 'Current Plan' : 'Get Started'}
        </Button>
      </CardFooter>
    </Card>
  )
}