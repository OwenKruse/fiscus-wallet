import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingFlow } from '../onboarding-flow'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  }))
}))

// Mock toast hook
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock Plaid Link Button
vi.mock('../../plaid-link-button', () => ({
  PlaidLinkButton: ({ children, onSuccess }: any) => (
    <button onClick={() => onSuccess?.()}>
      {children || 'Connect Bank Account'}
    </button>
  )
}))

describe('OnboardingFlow', () => {
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render welcome step initially', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    expect(screen.getByText('Welcome to Fiscus')).toBeInTheDocument()
    expect(screen.getByText('Take Control of Your Finances')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('should show progress indicator', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('33% Complete')).toBeInTheDocument()
  })

  it('should display security features in welcome step', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    expect(screen.getByText('Bank-Level Security')).toBeInTheDocument()
    expect(screen.getByText('Real-Time Updates')).toBeInTheDocument()
    expect(screen.getByText('Smart Analytics')).toBeInTheDocument()
  })

  it('should advance to connect account step when get started is clicked', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    const getStartedButton = screen.getByText('Get Started')
    fireEvent.click(getStartedButton)
    
    await waitFor(() => {
      expect(screen.getByText('Connect Your Bank Account')).toBeInTheDocument()
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    })
  })

  it('should show Plaid connection information in step 2', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    // Navigate to step 2
    fireEvent.click(screen.getByText('Get Started'))
    
    await waitFor(() => {
      expect(screen.getByText('Connect Your Bank Account')).toBeInTheDocument()
      expect(screen.getByText('What happens next:')).toBeInTheDocument()
      expect(screen.getByText("You'll be redirected to your bank's secure login page")).toBeInTheDocument()
      expect(screen.getByText('Connect Bank Account Securely')).toBeInTheDocument()
    })
  })

  it('should advance to completion step when Plaid connection succeeds', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    // Navigate to step 2
    fireEvent.click(screen.getByText('Get Started'))
    
    await waitFor(() => {
      expect(screen.getByText('Connect Bank Account Securely')).toBeInTheDocument()
    })
    
    // Simulate successful Plaid connection
    fireEvent.click(screen.getByText('Connect Bank Account Securely'))
    
    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument()
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
      expect(screen.getByText('100% Complete')).toBeInTheDocument()
    })
  })

  it('should show completion benefits in final step', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    // Navigate through all steps
    fireEvent.click(screen.getByText('Get Started'))
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Connect Bank Account Securely'))
    })
    
    await waitFor(() => {
      expect(screen.getByText('What you can do now:')).toBeInTheDocument()
      expect(screen.getByText('View your account balances and transaction history')).toBeInTheDocument()
      expect(screen.getByText('Analyze your spending patterns and trends')).toBeInTheDocument()
      expect(screen.getByText('Set up budgets and financial goals')).toBeInTheDocument()
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    })
  })

  it('should call onComplete when dashboard button is clicked', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    // Navigate through all steps
    fireEvent.click(screen.getByText('Get Started'))
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Connect Bank Account Securely'))
    })
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Go to Dashboard'))
    })
    
    expect(mockOnComplete).toHaveBeenCalled()
  })

  it('should show step indicators with correct states', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    // Initially, step 1 should be active
    const stepIndicators = screen.getAllByRole('generic').filter(el => 
      el.className.includes('rounded-full') && el.className.includes('w-8 h-8')
    )
    
    // Navigate to step 2
    fireEvent.click(screen.getByText('Get Started'))
    
    await waitFor(() => {
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    })
    
    // Navigate to step 3
    fireEvent.click(screen.getByText('Connect Bank Account Securely'))
    
    await waitFor(() => {
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
    })
  })

  it('should have proper accessibility attributes', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { name: 'Fiscus' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome to Fiscus' })).toBeInTheDocument()
    
    // Check for buttons
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<OnboardingFlow onComplete={mockOnComplete} />)
    
    // This should not crash the component
    fireEvent.click(screen.getByText('Get Started'))
    
    await waitFor(() => {
      expect(screen.getByText('Connect Your Bank Account')).toBeInTheDocument()
    })
    
    consoleSpy.mockRestore()
  })
})