import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SubscriptionSettings } from '../subscription-settings';
import { SubscriptionTier, SubscriptionStatus, BillingCycle } from '@/lib/subscription/tier-config';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the PlanChangeDialog component
vi.mock('../plan-change-dialog', () => ({
  PlanChangeDialog: ({ open, onOpenChange, currentTier, targetTier, changeType, onSuccess }: any) => (
    open ? (
      <div data-testid="plan-change-dialog">
        <div>Plan Change Dialog</div>
        <div>Current: {currentTier}</div>
        <div>Target: {targetTier}</div>
        <div>Type: {changeType}</div>
        <button onClick={() => onSuccess()}>Confirm</button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    ) : null
  )
}));

const mockSubscription = {
  id: 'sub_123',
  userId: 'user_123',
  tier: SubscriptionTier.GROWTH,
  status: SubscriptionStatus.ACTIVE,
  billingCycle: BillingCycle.MONTHLY,
  currentPeriodStart: new Date('2024-01-01'),
  currentPeriodEnd: new Date('2024-02-01'),
  cancelAtPeriodEnd: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

describe('SubscriptionSettings', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<SubscriptionSettings />);
    
    // Should show skeleton loading
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    // Should show card structure
    expect(document.querySelector('.rounded-lg.border')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders subscription data correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
    });
    
    expect(screen.getByText('GROWTH')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('$5/month')).toBeInTheDocument();
    expect(screen.getByText('monthly')).toBeInTheDocument();
    expect(screen.getByText('January 31, 2024')).toBeInTheDocument();
  });

  it('shows plan features correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Plan Features')).toBeInTheDocument();
    });
    
    expect(screen.getByText('10')).toBeInTheDocument(); // Connected Accounts
    expect(screen.getByText('Up to $100,000')).toBeInTheDocument(); // Balance Limit
    expect(screen.getByText('Unlimited')).toBeInTheDocument(); // Transaction History
    expect(screen.getByText('Real-time')).toBeInTheDocument(); // Sync Frequency
    expect(screen.getByText('Email')).toBeInTheDocument(); // Support
  });

  it('shows upgrade button for Growth tier', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Upgrade to PRO')).toBeInTheDocument();
    });
  });

  it('shows downgrade button for Growth tier', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Downgrade to STARTER')).toBeInTheDocument();
    });
  });

  it('shows cancel subscription button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Cancel Subscription')).toBeInTheDocument();
    });
  });

  it('opens upgrade dialog when upgrade button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Upgrade to PRO')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Upgrade to PRO'));
    
    expect(screen.getByTestId('plan-change-dialog')).toBeInTheDocument();
    expect(screen.getByText('Current: GROWTH')).toBeInTheDocument();
    expect(screen.getByText('Target: PRO')).toBeInTheDocument();
    expect(screen.getByText('Type: upgrade')).toBeInTheDocument();
  });

  it('opens downgrade dialog when downgrade button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Downgrade to STARTER')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Downgrade to STARTER'));
    
    expect(screen.getByTestId('plan-change-dialog')).toBeInTheDocument();
    expect(screen.getByText('Current: GROWTH')).toBeInTheDocument();
    expect(screen.getByText('Target: STARTER')).toBeInTheDocument();
    expect(screen.getByText('Type: downgrade')).toBeInTheDocument();
  });

  it('refreshes subscription data after successful plan change', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSubscription
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockSubscription, tier: SubscriptionTier.PRO }
        })
      });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Upgrade to PRO')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Upgrade to PRO'));
    fireEvent.click(screen.getByText('Confirm'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows cancellation notice when subscription is set to cancel', async () => {
    const cancelingSubscription = {
      ...mockSubscription,
      cancelAtPeriodEnd: true
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: cancelingSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText(/Your subscription will be canceled on/)).toBeInTheDocument();
    });
  });

  it('handles no subscription state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: null
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('No subscription found')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('shows correct tier icons and colors', async () => {
    const starterSubscription = {
      ...mockSubscription,
      tier: SubscriptionTier.STARTER
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: starterSubscription
      })
    });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('STARTER')).toBeInTheDocument();
    });
    
    // Check that the badge has the correct styling
    const tierBadge = screen.getByText('STARTER').closest('.inline-flex');
    expect(tierBadge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('retries fetch when Try Again button is clicked', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSubscription
        })
      });
    
    render(<SubscriptionSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Try Again'));
    
    await waitFor(() => {
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
    });
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});