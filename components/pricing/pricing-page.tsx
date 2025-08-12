'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'
import { PricingCard } from './pricing-card'
import { cn } from '@/lib/utils'

interface PricingPageProps {
  onSelectPlan?: (tier: SubscriptionTier, cycle: BillingCycle) => void
  currentTier?: SubscriptionTier
  className?: string
}

export function PricingPage({ 
  onSelectPlan = () => {}, 
  currentTier = SubscriptionTier.STARTER,
  className 
}: PricingPageProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.MONTHLY)

  const handlePlanSelect = (tier: SubscriptionTier, cycle: BillingCycle) => {
    onSelectPlan(tier, cycle)
  }

  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12', className)}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start free and upgrade as your financial needs grow. All plans include core budgeting features.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-12">
        <div className="bg-muted p-1 rounded-lg">
          <Button
            variant={billingCycle === BillingCycle.MONTHLY ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle(BillingCycle.MONTHLY)}
            className="px-6"
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === BillingCycle.YEARLY ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle(BillingCycle.YEARLY)}
            className="px-6 relative"
          >
            Annual
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              Save 17%
            </span>
          </Button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        <PricingCard
          tier={SubscriptionTier.STARTER}
          billingCycle={billingCycle}
          onSelectPlan={handlePlanSelect}
          className="md:mt-8"
        />
        
        <PricingCard
          tier={SubscriptionTier.GROWTH}
          billingCycle={billingCycle}
          isPopular={true}
          onSelectPlan={handlePlanSelect}
        />
        
        <PricingCard
          tier={SubscriptionTier.PRO}
          billingCycle={billingCycle}
          onSelectPlan={handlePlanSelect}
          className="md:mt-8"
        />
      </div>

      {/* FAQ Section */}
      <div className="mt-20">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Can I change my plan anytime?</h3>
            <p className="text-muted-foreground text-sm">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
              and billing is prorated accordingly.
            </p>
          </div>
          
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">What happens if I exceed my limits?</h3>
            <p className="text-muted-foreground text-sm">
              We'll notify you when you're approaching your limits and offer upgrade options. 
              Your data remains safe, but some features may be restricted until you upgrade.
            </p>
          </div>
          
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Is my financial data secure?</h3>
            <p className="text-muted-foreground text-sm">
              Absolutely. We use bank-level encryption and never store your banking credentials. 
              All connections are read-only and secured through our trusted partner Plaid.
            </p>
          </div>
          
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-muted-foreground text-sm">
              Yes, you can cancel your subscription at any time. You'll continue to have access 
              to paid features until the end of your billing period, then automatically switch to the free plan.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-16 p-8 bg-muted rounded-lg">
        <h3 className="text-xl font-semibold mb-2">
          Still have questions?
        </h3>
        <p className="text-muted-foreground mb-4">
          Our team is here to help you choose the right plan for your needs.
        </p>
        <Button variant="outline">
          Contact Support
        </Button>
      </div>
    </div>
  )
}