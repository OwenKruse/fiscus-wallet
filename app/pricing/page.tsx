import { PricingPage } from '@/components/pricing'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'

export default function PricingPageRoute() {
  const handlePlanSelect = (tier: SubscriptionTier, cycle: BillingCycle) => {
    console.log('Selected plan:', tier, cycle)
    // In a real implementation, this would redirect to payment processing
    // or trigger a subscription creation flow
  }

  return (
    <div className="min-h-screen bg-background">
      <PricingPage onSelectPlan={handlePlanSelect} />
    </div>
  )
}