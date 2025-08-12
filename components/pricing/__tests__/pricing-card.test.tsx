import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PricingCard } from '../pricing-card'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'

describe('PricingCard', () => {
  const mockOnSelectPlan = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render Starter tier card correctly', () => {
    render(
      <PricingCard
        tier={SubscriptionTier.STARTER}
        billingCycle={BillingCycle.MONTHLY}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    expect(screen.getByText('starter')).toBeInTheDocument()
    expect(screen.getByText('For personal finance beginners')).toBeInTheDocument()
    expect(screen.getByText('$0')).toBeInTheDocument()
    expect(screen.getByText('/month')).toBeInTheDocument()
    expect(screen.getByText('3 accounts')).toBeInTheDocument()
    expect(screen.getByText('$15k balance tracking')).toBeInTheDocument()
    expect(screen.getByText('12-month transaction history')).toBeInTheDocument()
    expect(screen.getByText('Daily syncs')).toBeInTheDocument()
    expect(screen.getByText('Community support')).toBeInTheDocument()
    expect(screen.getByText('Current Plan')).toBeInTheDocument()
  })

  it('should render Growth tier card correctly with monthly billing', () => {
    render(
      <PricingCard
        tier={SubscriptionTier.GROWTH}
        billingCycle={BillingCycle.MONTHLY}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    expect(screen.getByText('growth')).toBeInTheDocument()
    expect(screen.getByText('For active budgeters & investors')).toBeInTheDocument()
    expect(screen.getByText('$5')).toBeInTheDocument()
    expect(screen.getByText('10 accounts')).toBeInTheDocument()
    expect(screen.getByText('$100k balance tracking')).toBeInTheDocument()
    expect(screen.getByText('Unlimited transaction history')).toBeInTheDocument()
    expect(screen.getByText('Real-time sync')).toBeInTheDocument()
    expect(screen.getByText('Email support')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('should render Growth tier card correctly with yearly billing', () => {
    render(
      <PricingCard
        tier={SubscriptionTier.GROWTH}
        billingCycle={BillingCycle.YEARLY}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    expect(screen.getByText('$4')).toBeInTheDocument() // $50/12 = ~$4.17 rounded to $4
    expect(screen.getByText('$5/month')).toBeInTheDocument() // crossed out monthly price
    expect(screen.getByText('Save $10')).toBeInTheDocument() // $60 - $50 = $10 savings
    expect(screen.getByText('Billed annually ($50)')).toBeInTheDocument()
  })

  it('should render Pro tier card correctly', () => {
    render(
      <PricingCard
        tier={SubscriptionTier.PRO}
        billingCycle={BillingCycle.MONTHLY}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    expect(screen.getByText('pro')).toBeInTheDocument()
    expect(screen.getByText('For power users & advanced features')).toBeInTheDocument()
    expect(screen.getByText('$15')).toBeInTheDocument()
    expect(screen.getByText('Unlimited accounts')).toBeInTheDocument()
    expect(screen.getByText('Unlimited balance tracking')).toBeInTheDocument()
    expect(screen.getByText('Priority real-time sync')).toBeInTheDocument()
    expect(screen.getByText('Priority chat support')).toBeInTheDocument()
  })

  it('should show popular badge when isPopular is true', () => {
    render(
      <PricingCard
        tier={SubscriptionTier.GROWTH}
        billingCycle={BillingCycle.MONTHLY}
        isPopular={true}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('should call onSelectPlan when Get Started button is clicked', () => {
    render(
      <PricingCard
        tier={SubscriptionTier.GROWTH}
        billingCycle={BillingCycle.MONTHLY}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    const button = screen.getByText('Get Started')
    fireEvent.click(button)

    expect(mockOnSelectPlan).toHaveBeenCalledWith(
      SubscriptionTier.GROWTH,
      BillingCycle.MONTHLY
    )
  })

  it('should disable button for Starter tier', () => {
    render(
      <PricingCard
        tier={SubscriptionTier.STARTER}
        billingCycle={BillingCycle.MONTHLY}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    const button = screen.getByText('Current Plan')
    expect(button).toBeDisabled()
  })

  it('should display all features for each tier', () => {
    // Test Growth tier features
    render(
      <PricingCard
        tier={SubscriptionTier.GROWTH}
        billingCycle={BillingCycle.MONTHLY}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    expect(screen.getByText('Basic budgeting')).toBeInTheDocument()
    expect(screen.getByText('Goal tracking')).toBeInTheDocument()
    expect(screen.getByText('Mobile & web access')).toBeInTheDocument()
    expect(screen.getByText('CSV/Excel export')).toBeInTheDocument()
    expect(screen.getByText('Monthly spending insights')).toBeInTheDocument()
    expect(screen.getByText('Trends analysis')).toBeInTheDocument()
  })

  it('should apply popular styling when isPopular is true', () => {
    const { container } = render(
      <PricingCard
        tier={SubscriptionTier.GROWTH}
        billingCycle={BillingCycle.MONTHLY}
        isPopular={true}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    const card = container.querySelector('[class*="border-primary"]')
    expect(card).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <PricingCard
        tier={SubscriptionTier.GROWTH}
        billingCycle={BillingCycle.MONTHLY}
        onSelectPlan={mockOnSelectPlan}
        className="custom-class"
      />
    )

    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('should show correct pricing for Pro tier with yearly billing', () => {
    render(
      <PricingCard
        tier={SubscriptionTier.PRO}
        billingCycle={BillingCycle.YEARLY}
        onSelectPlan={mockOnSelectPlan}
      />
    )

    expect(screen.getByText('$13')).toBeInTheDocument() // $150/12 = $12.5 rounded to $13
    expect(screen.getByText('$15/month')).toBeInTheDocument() // crossed out monthly price
    expect(screen.getByText('Save $30')).toBeInTheDocument() // $180 - $150 = $30 savings
    expect(screen.getByText('Billed annually ($150)')).toBeInTheDocument()
  })
})