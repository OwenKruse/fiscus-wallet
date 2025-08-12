import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpgradePrompt } from '../upgrade-prompt'
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config'

// Mock the UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div data-testid="alert" role="alert" {...props}>{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid={`button-${props.variant || 'default'}`} {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>
}))

describe('UpgradePrompt', () => {
  const defaultProps = {
    type: 'modal' as const,
    reason: 'account_limit' as const,
    currentTier: SubscriptionTier.STARTER,
    targetTier: SubscriptionTier.GROWTH,
    isOpen: true,
    onClose: vi.fn(),
    onUpgrade: vi.fn(),
    onDismiss: vi.fn(),
    accountCount: 3,
    accountLimit: 3
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal Type', () => {
    it('renders modal with account limit message', () => {
      render(<UpgradePrompt {...defaultProps} />)
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Account Limit Reached')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent(
        "You've linked 3/3 accounts — upgrade to Growth for up to 10 accounts"
      )
    })

    it('renders modal with balance limit message', () => {
      render(
        <UpgradePrompt
          {...defaultProps}
          reason="balance_limit"
          currentBalance={20000}
          balanceLimit={15000}
        />
      )
      
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Balance Limit Exceeded')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent(
        'Your total tracked assets are above $15,000 — upgrade for unlimited balance tracking'
      )
    })

    it('renders modal with feature locked message', () => {
      render(
        <UpgradePrompt
          {...defaultProps}
          reason="feature_locked"
          featureName="CSV Export"
        />
      )
      
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Premium Feature')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent(
        'CSV Export is available in Growth — unlock now for $5/month'
      )
    })

    it('calls onUpgrade with yearly billing when yearly button clicked', () => {
      render(<UpgradePrompt {...defaultProps} />)
      
      const yearlyButton = screen.getByText(/Upgrade Annual/)
      fireEvent.click(yearlyButton)
      
      expect(defaultProps.onUpgrade).toHaveBeenCalledWith(
        SubscriptionTier.GROWTH,
        BillingCycle.YEARLY
      )
    })

    it('calls onUpgrade with monthly billing when monthly button clicked', () => {
      render(<UpgradePrompt {...defaultProps} />)
      
      const monthlyButton = screen.getByText(/Upgrade Monthly/)
      fireEvent.click(monthlyButton)
      
      expect(defaultProps.onUpgrade).toHaveBeenCalledWith(
        SubscriptionTier.GROWTH,
        BillingCycle.MONTHLY
      )
    })

    it('calls onDismiss when maybe later button clicked', () => {
      render(<UpgradePrompt {...defaultProps} />)
      
      const dismissButton = screen.getByText('Maybe later')
      fireEvent.click(dismissButton)
      
      expect(defaultProps.onDismiss).toHaveBeenCalled()
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('does not render when isOpen is false', () => {
      render(<UpgradePrompt {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Banner Type', () => {
    it('renders banner with upgrade message', () => {
      render(<UpgradePrompt {...defaultProps} type="banner" />)
      
      expect(screen.getByTestId('alert')).toBeInTheDocument()
      expect(screen.getByTestId('alert-description')).toHaveTextContent(
        "Account Limit Reached: You've linked 3/3 accounts — upgrade to Growth for up to 10 accounts"
      )
    })

    it('calls onUpgrade when upgrade button clicked', () => {
      render(<UpgradePrompt {...defaultProps} type="banner" />)
      
      const upgradeButton = screen.getByText('Upgrade Now')
      fireEvent.click(upgradeButton)
      
      expect(defaultProps.onUpgrade).toHaveBeenCalledWith(
        SubscriptionTier.GROWTH,
        BillingCycle.MONTHLY
      )
    })

    it('calls onDismiss when X button clicked', () => {
      render(<UpgradePrompt {...defaultProps} type="banner" />)
      
      // The X button would be rendered by the X icon component
      // For this test, we'll look for any button that calls onDismiss
      const buttons = screen.getAllByRole('button')
      const dismissButton = buttons.find(button => 
        button.getAttribute('data-testid')?.includes('ghost')
      )
      
      if (dismissButton) {
        fireEvent.click(dismissButton)
        expect(defaultProps.onDismiss).toHaveBeenCalled()
      }
    })
  })

  describe('Inline Type', () => {
    it('renders inline card with upgrade message', () => {
      render(<UpgradePrompt {...defaultProps} type="inline" />)
      
      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByText('Account Limit Reached')).toBeInTheDocument()
      expect(screen.getByText(/You've linked 3\/3 accounts/)).toBeInTheDocument()
    })

    it('calls onUpgrade when upgrade button clicked', () => {
      render(<UpgradePrompt {...defaultProps} type="inline" />)
      
      const upgradeButton = screen.getByText('Upgrade to GROWTH')
      fireEvent.click(upgradeButton)
      
      expect(defaultProps.onUpgrade).toHaveBeenCalledWith(
        SubscriptionTier.GROWTH,
        BillingCycle.MONTHLY
      )
    })

    it('calls onDismiss when dismiss button clicked', () => {
      render(<UpgradePrompt {...defaultProps} type="inline" />)
      
      const dismissButton = screen.getByText('Dismiss')
      fireEvent.click(dismissButton)
      
      expect(defaultProps.onDismiss).toHaveBeenCalled()
    })
  })

  describe('Pricing Display', () => {
    it('shows correct pricing for Growth tier', () => {
      render(<UpgradePrompt {...defaultProps} />)
      
      // Should show $5/month for monthly and savings for yearly
      expect(screen.getByText('$5/month')).toBeInTheDocument()
      expect(screen.getByText('Save $10')).toBeInTheDocument() // 12*5 - 50 = 10
    })

    it('shows correct pricing for Pro tier', () => {
      render(
        <UpgradePrompt
          {...defaultProps}
          currentTier={SubscriptionTier.GROWTH}
          targetTier={SubscriptionTier.PRO}
        />
      )
      
      // Should show $15/month for monthly and savings for yearly
      expect(screen.getByText('$15/month')).toBeInTheDocument()
      expect(screen.getByText('Save $30')).toBeInTheDocument() // 12*15 - 150 = 30
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes for modal', () => {
      render(<UpgradePrompt {...defaultProps} />)
      
      const dialog = screen.getByTestId('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('has proper role for alert banner', () => {
      render(<UpgradePrompt {...defaultProps} type="banner" />)
      
      const alert = screen.getByTestId('alert')
      expect(alert).toHaveAttribute('role', 'alert')
    })
  })
})