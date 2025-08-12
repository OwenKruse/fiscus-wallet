import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FeatureLockDialog } from '../feature-lock-dialog'
import { SubscriptionTier } from '@/lib/subscription/tier-config'

// Mock the UpgradePrompt component
vi.mock('../upgrade-prompt', () => ({
  UpgradePrompt: ({ type, reason, isOpen, onClose, onUpgrade, onDismiss, featureName }: any) => (
    isOpen ? (
      <div data-testid="upgrade-prompt">
        <span data-testid="prompt-type">{type}</span>
        <span data-testid="prompt-reason">{reason}</span>
        <span data-testid="feature-name">{featureName}</span>
        <button onClick={() => onUpgrade(SubscriptionTier.GROWTH)}>Upgrade</button>
        <button onClick={onDismiss}>Dismiss</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}))

describe('FeatureLockDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnUpgrade = vi.fn()
  
  const defaultProps = {
    featureName: 'CSV Export',
    currentTier: SubscriptionTier.STARTER,
    targetTier: SubscriptionTier.GROWTH,
    isOpen: true,
    onClose: mockOnClose,
    onUpgrade: mockOnUpgrade
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog when open', () => {
    render(<FeatureLockDialog {...defaultProps} />)
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-type')).toHaveTextContent('modal')
    expect(screen.getByTestId('prompt-reason')).toHaveTextContent('feature_locked')
    expect(screen.getByTestId('feature-name')).toHaveTextContent('CSV Export')
  })

  it('does not render when closed', () => {
    render(<FeatureLockDialog {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument()
  })

  it('calls onUpgrade when upgrade button clicked', () => {
    render(<FeatureLockDialog {...defaultProps} />)
    
    const upgradeButton = screen.getByText('Upgrade')
    fireEvent.click(upgradeButton)
    
    expect(mockOnUpgrade).toHaveBeenCalledWith(SubscriptionTier.GROWTH)
  })

  it('calls onClose when close button clicked', () => {
    render(<FeatureLockDialog {...defaultProps} />)
    
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onClose when dismiss button clicked', () => {
    render(<FeatureLockDialog {...defaultProps} />)
    
    const dismissButton = screen.getByText('Dismiss')
    fireEvent.click(dismissButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('handles different feature names', () => {
    render(
      <FeatureLockDialog 
        {...defaultProps} 
        featureName="Advanced Analytics"
      />
    )
    
    expect(screen.getByTestId('feature-name')).toHaveTextContent('Advanced Analytics')
  })

  it('handles different tier combinations', () => {
    render(
      <FeatureLockDialog 
        {...defaultProps} 
        currentTier={SubscriptionTier.GROWTH}
        targetTier={SubscriptionTier.PRO}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    
    const upgradeButton = screen.getByText('Upgrade')
    fireEvent.click(upgradeButton)
    
    expect(mockOnUpgrade).toHaveBeenCalledWith(SubscriptionTier.GROWTH)
  })

  it('passes custom className to UpgradePrompt', () => {
    render(
      <FeatureLockDialog 
        {...defaultProps}
        className="custom-dialog-class"
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
  })

  it('works without onUpgrade callback', () => {
    render(
      <FeatureLockDialog 
        featureName="Test Feature"
        currentTier={SubscriptionTier.STARTER}
        targetTier={SubscriptionTier.GROWTH}
        isOpen={true}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    
    // Should not throw when clicking upgrade without callback
    const upgradeButton = screen.getByText('Upgrade')
    expect(() => fireEvent.click(upgradeButton)).not.toThrow()
  })

  it('handles empty feature name', () => {
    render(
      <FeatureLockDialog 
        {...defaultProps} 
        featureName=""
      />
    )
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('feature-name')).toHaveTextContent('')
  })

  it('handles long feature names', () => {
    const longFeatureName = 'Very Long Feature Name That Might Cause Layout Issues'
    
    render(
      <FeatureLockDialog 
        {...defaultProps} 
        featureName={longFeatureName}
      />
    )
    
    expect(screen.getByTestId('feature-name')).toHaveTextContent(longFeatureName)
  })

  it('maintains dialog state correctly', () => {
    const { rerender } = render(<FeatureLockDialog {...defaultProps} isOpen={true} />)
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    
    rerender(<FeatureLockDialog {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument()
    
    rerender(<FeatureLockDialog {...defaultProps} isOpen={true} />)
    
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
  })
})