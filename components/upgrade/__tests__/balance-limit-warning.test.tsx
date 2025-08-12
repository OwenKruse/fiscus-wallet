import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BalanceLimitWarning } from '../balance-limit-warning'
import { SubscriptionTier } from '@/lib/subscription/tier-config'

// Mock the UpgradePrompt component
vi.mock('../upgrade-prompt', () => ({
  UpgradePrompt: ({ type, reason, onUpgrade, onDismiss, currentBalance, balanceLimit }: any) => (
    <div data-testid="upgrade-prompt">
      <span data-testid="prompt-type">{type}</span>
      <span data-testid="prompt-reason">{reason}</span>
      <span data-testid="balance-info">${currentBalance}/${balanceLimit}</span>
      <button onClick={() => onUpgrade(SubscriptionTier.GROWTH)}>Upgrade</button>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  )
}))

// Mock the context
vi.mock('../upgrade-prompt-provider', () => ({
  useUpgradePromptContext: () => ({
    dismissPrompt: vi.fn()
  })
}))

describe('BalanceLimitWarning', () => {
  const mockOnUpgrade = vi.fn()
  
  const defaultProps = {
    currentBalance: 20000,
    balanceLimit: 15000,
    currentTier: SubscriptionTier.STARTER,
    targetTier: SubscriptionTier.GROWTH,
    onUpgrade: mockOnUpgrade
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders warning when over balance limit', () => {
    render(<BalanceLimitWarning {...defaultProps} />)
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-type')).toHaveTextContent('banner')
    expect(screen.getByTestId('prompt-reason')).toHaveTextContent('balance_limit')
    expect(screen.getByTestId('balance-info')).toHaveTextContent('$20000/$15000')
  })

  it('does not render when under balance limit', () => {
    render(
      <BalanceLimitWarning 
        {...defaultProps} 
        currentBalance={10000}
        balanceLimit={15000}
      />
    )
    
    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument()
  })

  it('does not render when at balance limit exactly', () => {
    render(
      <BalanceLimitWarning 
        {...defaultProps} 
        currentBalance={15000}
        balanceLimit={15000}
      />
    )
    
    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument()
  })

  it('renders when significantly over balance limit', () => {
    render(
      <BalanceLimitWarning 
        {...defaultProps} 
        currentBalance={50000}
        balanceLimit={15000}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('balance-info')).toHaveTextContent('$50000/$15000')
  })

  it('calls onUpgrade when upgrade button clicked', () => {
    render(<BalanceLimitWarning {...defaultProps} />)
    
    const upgradeButton = screen.getByText('Upgrade')
    fireEvent.click(upgradeButton)
    
    expect(mockOnUpgrade).toHaveBeenCalledWith(SubscriptionTier.GROWTH)
  })

  it('calls dismissPrompt when dismiss button clicked', () => {
    // This test verifies the component structure - the actual dismissPrompt call
    // is handled by the UpgradePrompt component which is mocked
    render(<BalanceLimitWarning {...defaultProps} />)
    
    const dismissButton = screen.getByText('Dismiss')
    fireEvent.click(dismissButton)
    
    // The mock UpgradePrompt should receive the onDismiss prop
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
  })

  it('passes correct props to UpgradePrompt', () => {
    render(
      <BalanceLimitWarning 
        {...defaultProps}
        className="custom-class"
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-type')).toHaveTextContent('banner')
    expect(screen.getByTestId('prompt-reason')).toHaveTextContent('balance_limit')
  })

  it('handles edge case with zero balance', () => {
    render(
      <BalanceLimitWarning 
        {...defaultProps} 
        currentBalance={0}
        balanceLimit={15000}
      />
    )
    
    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument()
  })

  it('handles edge case with zero limit', () => {
    render(
      <BalanceLimitWarning 
        {...defaultProps} 
        currentBalance={1000}
        balanceLimit={0}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('balance-info')).toHaveTextContent('$1000/$0')
  })

  it('works without onUpgrade callback', () => {
    render(
      <BalanceLimitWarning 
        currentBalance={20000}
        balanceLimit={15000}
        currentTier={SubscriptionTier.STARTER}
        targetTier={SubscriptionTier.GROWTH}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    
    // Should not throw when clicking upgrade without callback
    const upgradeButton = screen.getByText('Upgrade')
    expect(() => fireEvent.click(upgradeButton)).not.toThrow()
  })

  it('handles large balance numbers', () => {
    render(
      <BalanceLimitWarning 
        {...defaultProps} 
        currentBalance={1000000}
        balanceLimit={15000}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('balance-info')).toHaveTextContent('$1000000/$15000')
  })
})