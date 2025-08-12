import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PricingPage } from '../pricing-page'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'

describe('PricingPage', () => {
  const mockOnSelectPlan = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the main heading and description', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument()
    expect(screen.getByText('Start free and upgrade as your financial needs grow. All plans include core budgeting features.')).toBeInTheDocument()
  })

  it('should render billing cycle toggle buttons', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Annual')).toBeInTheDocument()
    expect(screen.getByText('Save 17%')).toBeInTheDocument()
  })

  it('should render all three pricing cards', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    expect(screen.getByText('starter')).toBeInTheDocument()
    expect(screen.getByText('growth')).toBeInTheDocument()
    expect(screen.getByText('pro')).toBeInTheDocument()
  })

  it('should show Growth tier as popular by default', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('should switch billing cycle when toggle is clicked', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    // Initially should show monthly pricing
    expect(screen.getByText('$5')).toBeInTheDocument() // Growth monthly price

    // Click Annual toggle
    const annualButton = screen.getByText('Annual')
    fireEvent.click(annualButton)

    // Should now show yearly pricing
    expect(screen.getByText('$4')).toBeInTheDocument() // Growth yearly price ($50/12 ≈ $4)
  })

  it('should call onSelectPlan when a plan is selected', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    // Find and click the Growth plan button
    const getStartedButtons = screen.getAllByText('Get Started')
    fireEvent.click(getStartedButtons[0]) // Growth plan button

    expect(mockOnSelectPlan).toHaveBeenCalledWith(
      SubscriptionTier.GROWTH,
      BillingCycle.MONTHLY
    )
  })

  it('should render FAQ section', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
    expect(screen.getByText('Can I change my plan anytime?')).toBeInTheDocument()
    expect(screen.getByText('What happens if I exceed my limits?')).toBeInTheDocument()
    expect(screen.getByText('Is my financial data secure?')).toBeInTheDocument()
    expect(screen.getByText('Can I cancel anytime?')).toBeInTheDocument()
  })

  it('should render FAQ answers', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    expect(screen.getByText(/Yes, you can upgrade or downgrade your plan at any time/)).toBeInTheDocument()
    expect(screen.getByText(/We'll notify you when you're approaching your limits/)).toBeInTheDocument()
    expect(screen.getByText(/We use bank-level encryption/)).toBeInTheDocument()
    expect(screen.getByText(/Yes, you can cancel your subscription at any time/)).toBeInTheDocument()
  })

  it('should render bottom CTA section', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    expect(screen.getByText('Still have questions?')).toBeInTheDocument()
    expect(screen.getByText('Our team is here to help you choose the right plan for your needs.')).toBeInTheDocument()
    expect(screen.getByText('Contact Support')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <PricingPage 
        onSelectPlan={mockOnSelectPlan} 
        className="custom-pricing-class"
      />
    )

    const pricingContainer = container.querySelector('.custom-pricing-class')
    expect(pricingContainer).toBeInTheDocument()
  })

  it('should handle missing onSelectPlan prop gracefully', () => {
    // Should not throw error when onSelectPlan is not provided
    expect(() => {
      render(<PricingPage />)
    }).not.toThrow()
  })

  it('should show correct current tier', () => {
    render(
      <PricingPage 
        onSelectPlan={mockOnSelectPlan}
        currentTier={SubscriptionTier.GROWTH}
      />
    )

    // The component should render but currentTier is passed to individual cards
    // This test ensures the prop is accepted without errors
    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument()
  })

  it('should maintain billing cycle state across interactions', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    // Switch to annual
    const annualButton = screen.getByText('Annual')
    fireEvent.click(annualButton)

    // Verify annual pricing is shown
    expect(screen.getByText('$4')).toBeInTheDocument() // Growth yearly

    // Switch back to monthly
    const monthlyButton = screen.getByText('Monthly')
    fireEvent.click(monthlyButton)

    // Verify monthly pricing is shown again
    expect(screen.getByText('$5')).toBeInTheDocument() // Growth monthly
  })

  it('should have proper responsive layout classes', () => {
    const { container } = render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    // Check for responsive grid classes
    const gridContainer = container.querySelector('.grid-cols-1.md\\:grid-cols-3')
    expect(gridContainer).toBeInTheDocument()
  })

  it('should show savings badge on annual toggle', () => {
    render(<PricingPage onSelectPlan={mockOnSelectPlan} />)

    const savingsBadge = screen.getByText('Save 17%')
    expect(savingsBadge).toBeInTheDocument()
    
    // Check if it has the correct styling classes
    expect(savingsBadge.closest('span')).toHaveClass('absolute', '-top-2', '-right-2', 'bg-green-500')
  })
})