'use client'

import { useState } from 'react'
import { PricingPage } from '@/components/pricing'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'
import { useAuth } from '@/hooks/use-api'
import { useRouter } from 'next/navigation'

export default function PricingPageRoute() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handlePlanSelect = async (tier: SubscriptionTier, cycle: BillingCycle) => {
    if (!isAuthenticated) {
      router.push('/auth/signin?callbackUrl=/pricing')
      return
    }

    if (tier === SubscriptionTier.STARTER) {
      // Free tier - no payment needed
      alert('You\'re already on the free plan!')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          billingCycle: cycle,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create checkout session')
      }

      // Redirect to Stripe checkout
      if (result.data?.url) {
        window.location.href = result.data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(error instanceof Error ? error.message : 'Failed to start checkout process')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PricingPage onSelectPlan={handlePlanSelect} isLoading={isLoading} />
    </div>
  )
}