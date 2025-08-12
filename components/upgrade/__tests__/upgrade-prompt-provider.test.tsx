import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpgradePromptProvider, useUpgradePromptContext } from '../upgrade-prompt-provider'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'

// Mock the upgrade prompt component
vi.mock('../upgrade-prompt', () => ({
  UpgradePrompt: ({ reason, onUpgrade, onDismiss, isOpen }: any) => (
    isOpen ? (
      <div data-testid="upgrade-prompt">
        <span data-testid="prompt-reason">{reason}</span>
        <button onClick={() => onUpgrade(SubscriptionTier.GROWTH, BillingCycle.MONTHLY)}>
          Upgrade
        </button>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    ) : null
  )
}))

// Mock the hook
const mockUseUpgradePrompts = vi.fn(() => ({
  promptState: null,
  checkAccountLimit: vi.fn(() => true),
  checkBalanceLimit: vi.fn(() => true),
  checkFeatureAccess: vi.fn(() => true),
  showUpgradePrompt: vi.fn(),
  dismissPrompt: vi.fn(),
  isDismissed: vi.fn(() => false)
}))

vi.mock('@/hooks/use-upgrade-prompts', () => ({
  useUpgradePrompts: mockUseUpgradePrompts
}))

// Test component that uses the context
function TestComponent() {
  const {
    checkAccountLimit,
    checkBalanceLimit,
    checkFeatureAccess,
    showUpgradePrompt,
    dismissPrompt,
    isDismissed
  } = useUpgradePromptContext()

  return (
    <div>
      <button onClick={() => checkAccountLimit(3)}>Check Account Limit</button>
      <button onClick={() => checkBalanceLimit(20000)}>Check Balance Limit</button>
      <button onClick={() => checkFeatureAccess('csv_export')}>Check Feature Access</button>
      <button onClick={() => showUpgradePrompt('feature_locked', { featureName: 'Test' })}>
        Show Prompt
      </button>
      <button onClick={dismissPrompt}>Dismiss Prompt</button>
      <span data-testid="is-dismissed">{isDismissed('account_limit').toString()}</span>
    </div>
  )
}

describe('UpgradePromptProvider', () => {
  const mockOnUpgrade = vi.fn()
  const mockOnUpgradeRequested = vi.fn()

  const defaultProps = {
    currentTier: SubscriptionTier.STARTER,
    currentUsage: {
      connectedAccounts: 2,
      totalBalance: 10000
    },
    onUpgrade: mockOnUpgrade,
    onUpgradeRequested: mockOnUpgradeRequested
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides context to child components', () => {
    render(
      <UpgradePromptProvider {...defaultProps}>
        <TestComponent />
      </UpgradePromptProvider>
    )

    expect(screen.getByText('Check Account Limit')).toBeInTheDocument()
    expect(screen.getByText('Check Balance Limit')).toBeInTheDocument()
    expect(screen.getByText('Check Feature Access')).toBeInTheDocument()
    expect(screen.getByText('Show Prompt')).toBeInTheDocument()
    expect(screen.getByText('Dismiss Prompt')).toBeInTheDocument()
  })

  it('throws error when context is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useUpgradePromptContext must be used within an UpgradePromptProvider')
    
    consoleSpy.mockRestore()
  })

  it('renders upgrade prompt when prompt state is active', () => {
    mockUseUpgradePrompts.mockReturnValue({
      promptState: {
        isVisible: true,
        reason: 'account_limit',
        currentTier: SubscriptionTier.STARTER,
        targetTier: SubscriptionTier.GROWTH,
        data: { accountCount: 3, accountLimit: 3 }
      },
      checkAccountLimit: vi.fn(() => true),
      checkBalanceLimit: vi.fn(() => true),
      checkFeatureAccess: vi.fn(() => true),
      showUpgradePrompt: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: vi.fn(() => false)
    })

    render(
      <UpgradePromptProvider {...defaultProps}>
        <TestComponent />
      </UpgradePromptProvider>
    )

    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-reason')).toHaveTextContent('account_limit')
  })

  it('calls onUpgrade and dismisses prompt when upgrade button clicked', () => {
    const mockDismissPrompt = vi.fn()
    
    mockUseUpgradePrompts.mockReturnValue({
      promptState: {
        isVisible: true,
        reason: 'account_limit',
        currentTier: SubscriptionTier.STARTER,
        targetTier: SubscriptionTier.GROWTH,
        data: { accountCount: 3, accountLimit: 3 }
      },
      checkAccountLimit: vi.fn(() => true),
      checkBalanceLimit: vi.fn(() => true),
      checkFeatureAccess: vi.fn(() => true),
      showUpgradePrompt: vi.fn(),
      dismissPrompt: mockDismissPrompt,
      isDismissed: vi.fn(() => false)
    })

    render(
      <UpgradePromptProvider {...defaultProps}>
        <TestComponent />
      </UpgradePromptProvider>
    )

    const upgradeButton = screen.getByText('Upgrade')
    fireEvent.click(upgradeButton)

    expect(mockOnUpgrade).toHaveBeenCalledWith(
      SubscriptionTier.GROWTH,
      BillingCycle.MONTHLY
    )
    expect(mockDismissPrompt).toHaveBeenCalled()
  })

  it('calls dismissPrompt when dismiss button clicked', () => {
    const mockDismissPrompt = vi.fn()
    
    mockUseUpgradePrompts.mockReturnValue({
      promptState: {
        isVisible: true,
        reason: 'account_limit',
        currentTier: SubscriptionTier.STARTER,
        targetTier: SubscriptionTier.GROWTH,
        data: { accountCount: 3, accountLimit: 3 }
      },
      checkAccountLimit: vi.fn(() => true),
      checkBalanceLimit: vi.fn(() => true),
      checkFeatureAccess: vi.fn(() => true),
      showUpgradePrompt: vi.fn(),
      dismissPrompt: mockDismissPrompt,
      isDismissed: vi.fn(() => false)
    })

    render(
      <UpgradePromptProvider {...defaultProps}>
        <TestComponent />
      </UpgradePromptProvider>
    )

    const dismissButton = screen.getByText('Dismiss')
    fireEvent.click(dismissButton)

    expect(mockDismissPrompt).toHaveBeenCalled()
  })

  it('passes correct props to UpgradePrompt component', () => {
    mockUseUpgradePrompts.mockReturnValue({
      promptState: {
        isVisible: true,
        reason: 'balance_limit',
        currentTier: SubscriptionTier.STARTER,
        targetTier: SubscriptionTier.GROWTH,
        data: { currentBalance: 20000, balanceLimit: 15000 }
      },
      checkAccountLimit: vi.fn(() => true),
      checkBalanceLimit: vi.fn(() => true),
      checkFeatureAccess: vi.fn(() => true),
      showUpgradePrompt: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: vi.fn(() => false)
    })

    render(
      <UpgradePromptProvider {...defaultProps} promptType="banner">
        <TestComponent />
      </UpgradePromptProvider>
    )

    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-reason')).toHaveTextContent('balance_limit')
  })

  it('does not render prompt when promptState is null', () => {
    mockUseUpgradePrompts.mockReturnValue({
      promptState: null,
      checkAccountLimit: vi.fn(() => true),
      checkBalanceLimit: vi.fn(() => true),
      checkFeatureAccess: vi.fn(() => true),
      showUpgradePrompt: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: vi.fn(() => false)
    })

    render(
      <UpgradePromptProvider {...defaultProps}>
        <TestComponent />
      </UpgradePromptProvider>
    )

    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument()
  })

  it('forwards context methods correctly', () => {
    const mockCheckAccountLimit = vi.fn(() => true)
    const mockCheckBalanceLimit = vi.fn(() => true)
    const mockCheckFeatureAccess = vi.fn(() => true)
    const mockShowUpgradePrompt = vi.fn()
    const mockDismissPrompt = vi.fn()
    const mockIsDismissed = vi.fn(() => false)
    
    mockUseUpgradePrompts.mockReturnValue({
      promptState: null,
      checkAccountLimit: mockCheckAccountLimit,
      checkBalanceLimit: mockCheckBalanceLimit,
      checkFeatureAccess: mockCheckFeatureAccess,
      showUpgradePrompt: mockShowUpgradePrompt,
      dismissPrompt: mockDismissPrompt,
      isDismissed: mockIsDismissed
    })

    render(
      <UpgradePromptProvider {...defaultProps}>
        <TestComponent />
      </UpgradePromptProvider>
    )

    // Test each context method
    fireEvent.click(screen.getByText('Check Account Limit'))
    expect(mockCheckAccountLimit).toHaveBeenCalledWith(3)

    fireEvent.click(screen.getByText('Check Balance Limit'))
    expect(mockCheckBalanceLimit).toHaveBeenCalledWith(20000)

    fireEvent.click(screen.getByText('Check Feature Access'))
    expect(mockCheckFeatureAccess).toHaveBeenCalledWith('csv_export')

    fireEvent.click(screen.getByText('Show Prompt'))
    expect(mockShowUpgradePrompt).toHaveBeenCalledWith('feature_locked', { featureName: 'Test' })

    fireEvent.click(screen.getByText('Dismiss Prompt'))
    expect(mockDismissPrompt).toHaveBeenCalled()

    expect(screen.getByTestId('is-dismissed')).toHaveTextContent('false')
    expect(mockIsDismissed).toHaveBeenCalledWith('account_limit')
  })
})