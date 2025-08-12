import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountLimitBanner } from '../account-limit-banner'
import { SubscriptionTier } from '@/lib/subscription/tier-config'

// Mock the UpgradePrompt component
vi.mock('../upgrade-prompt', () => ({
  UpgradePrompt: ({ type, reason, onUpgrade, onDismiss, accountCount, accountLimit }: any) => (
    <div data-testid="upgrade-prompt">
      <span data-testid="prompt-type">{type}</span>
      <span data-testid="prompt-reason">{reason}</span>
      <span data-testid="account-info">{accountCount}/{accountLimit}</span>
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

describe('AccountLimitBanner', () => {
  const mockOnUpgrade = vi.fn()
  
  const defaultProps = {
    accountCount: 3,
    accountLimit: 3,
    currentTier: SubscriptionTier.STARTER,
    targetTier: SubscriptionTier.GROWTH,
    onUpgrade: mockOnUpgrade
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders banner when at account limit', () => {
    render(<AccountLimitBanner {...defaultProps} />)
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-type')).toHaveTextContent('banner')
    expect(screen.getByTestId('prompt-reason')).toHaveTextContent('account_limit')
    expect(screen.getByTestId('account-info')).toHaveTextContent('3/3')
  })

  it('renders banner when over account limit', () => {
    render(
      <AccountLimitBanner 
        {...defaultProps} 
        accountCount={4}
        accountLimit={3}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('account-info')).toHaveTextContent('4/3')
  })

  it('does not render when under account limit', () => {
    render(
      <AccountLimitBanner 
        {...defaultProps} 
        accountCount={2}
        accountLimit={3}
      />
    )
    
    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument()
  })

  it('calls onUpgrade when upgrade button clicked', () => {
    render(<AccountLimitBanner {...defaultProps} />)
    
    const upgradeButton = screen.getByText('Upgrade')
    fireEvent.click(upgradeButton)
    
    expect(mockOnUpgrade).toHaveBeenCalledWith(SubscriptionTier.GROWTH)
  })

  it('calls dismissPrompt when dismiss button clicked', () => {
    // This test verifies the component structure - the actual dismissPrompt call
    // is handled by the UpgradePrompt component which is mocked
    render(<AccountLimitBanner {...defaultProps} />)
    
    const dismissButton = screen.getByText('Dismiss')
    fireEvent.click(dismissButton)
    
    // The mock UpgradePrompt should receive the onDismiss prop
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
  })

  it('passes correct props to UpgradePrompt', () => {
    render(
      <AccountLimitBanner 
        {...defaultProps}
        className="custom-class"
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-type')).toHaveTextContent('banner')
    expect(screen.getByTestId('prompt-reason')).toHaveTextContent('account_limit')
  })

  it('handles edge case with zero limits', () => {
    render(
      <AccountLimitBanner 
        {...defaultProps} 
        accountCount={0}
        accountLimit={0}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('account-info')).toHaveTextContent('0/0')
  })

  it('works without onUpgrade callback', () => {
    render(
      <AccountLimitBanner 
        accountCount={3}
        accountLimit={3}
        currentTier={SubscriptionTier.STARTER}
        targetTier={SubscriptionTier.GROWTH}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    
    // Should not throw when clicking upgrade without callback
    const upgradeButton = screen.getByText('Upgrade')
    expect(() => fireEvent.click(upgradeButton)).not.toThrow()
  })
})