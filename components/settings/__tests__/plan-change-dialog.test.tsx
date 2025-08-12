import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlanChangeDialog } from '../plan-change-dialog';
import { SubscriptionTier, BillingCycle } from '@/lib/subscription/tier-config';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  currentTier: SubscriptionTier.GROWTH,
  targetTier: SubscriptionTier.PRO,
  changeType: 'upgrade' as const,
  currentBillingCycle: BillingCycle.MONTHLY,
  onSuccess: vi.fn()
};

describe('PlanChangeDialog', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders upgrade dialog correctly', () => {
    render(<PlanChangeDialog {...defaultProps} />);
    
    expect(screen.getByText('Upgrade Your Plan')).toBeInTheDocument();
    expect(screen.getByText('Unlock more features and higher limits with your new plan.')).toBeInTheDocument();
    expect(screen.getByText('GROWTH')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders downgrade dialog correctly', () => {
    const props = {
      ...defaultProps,
      changeType: 'downgrade' as const,
      targetTier: SubscriptionTier.GROWTH // Downgrade to Growth, not Starter
    };
    
    render(<PlanChangeDialog {...props} />);
    
    expect(screen.getByText('Downgrade Your Plan')).toBeInTheDocument();
    expect(screen.getByText('Your plan will be changed and limits will be adjusted accordingly.')).toBeInTheDocument();
  });

  it('renders cancellation dialog correctly', () => {
    const props = {
      ...defaultProps,
      changeType: 'downgrade' as const,
      targetTier: SubscriptionTier.STARTER
    };
    
    render(<PlanChangeDialog {...props} />);
    
    expect(screen.getByText('Downgrade Your Plan')).toBeInTheDocument();
    expect(screen.getByText(/Your subscription will be canceled and you'll return to the free plan/)).toBeInTheDocument();
  });

  it('shows plan comparison correctly', () => {
    render(<PlanChangeDialog {...defaultProps} />);
    
    // Current plan (Growth)
    expect(screen.getByText('$5/month')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // accounts
    expect(screen.getByText('$100,000')).toBeInTheDocument(); // balance limit
    expect(screen.getByText('Real-time')).toBeInTheDocument(); // sync frequency
    
    // Target plan (Pro)
    expect(screen.getByText('$15/month')).toBeInTheDocument();
    expect(screen.getAllByText('Unlimited')).toHaveLength(2); // accounts and balance limit for Pro
  });

  it('shows billing cycle options for paid plans', () => {
    render(<PlanChangeDialog {...defaultProps} />);
    
    expect(screen.getByText('Billing Cycle')).toBeInTheDocument();
    expect(screen.getByText('Monthly - $15/month')).toBeInTheDocument();
    expect(screen.getByText('Yearly - $150/year')).toBeInTheDocument();
    expect(screen.getByText('Save $30')).toBeInTheDocument(); // yearly savings
  });

  it('does not show billing cycle options for free plan', () => {
    const props = {
      ...defaultProps,
      changeType: 'downgrade' as const,
      targetTier: SubscriptionTier.STARTER
    };
    
    render(<PlanChangeDialog {...props} />);
    
    expect(screen.queryByText('Billing Cycle')).not.toBeInTheDocument();
  });

  it('allows changing billing cycle', () => {
    render(<PlanChangeDialog {...defaultProps} />);
    
    const yearlyOption = screen.getByLabelText(/Yearly/);
    fireEvent.click(yearlyOption);
    
    expect(yearlyOption).toBeChecked();
  });

  it('shows warning for downgrades', () => {
    const props = {
      ...defaultProps,
      changeType: 'downgrade' as const,
      targetTier: SubscriptionTier.STARTER
    };
    
    render(<PlanChangeDialog {...props} />);
    
    expect(screen.getByText(/Your subscription will be canceled at the end of your current billing period/)).toBeInTheDocument();
  });

  it('handles successful upgrade', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { subscription: { tier: SubscriptionTier.PRO } }
      })
    });
    
    render(<PlanChangeDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Confirm Upgrade'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetTier: SubscriptionTier.PRO,
          billingCycle: BillingCycle.MONTHLY
        })
      });
    });
    
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('handles successful downgrade', async () => {
    const props = {
      ...defaultProps,
      changeType: 'downgrade' as const,
      targetTier: SubscriptionTier.STARTER
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { subscription: { tier: SubscriptionTier.STARTER } }
      })
    });
    
    render(<PlanChangeDialog {...props} />);
    
    fireEvent.click(screen.getByText('Confirm Cancellation'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/subscriptions/downgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetTier: SubscriptionTier.STARTER,
          billingCycle: BillingCycle.MONTHLY,
          cancelAtPeriodEnd: true
        })
      });
    });
    
    expect(props.onSuccess).toHaveBeenCalled();
  });

  it('handles API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Payment failed' }
      })
    });
    
    render(<PlanChangeDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Confirm Upgrade'));
    
    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
    });
    
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('shows loading state during API call', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<PlanChangeDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Confirm Upgrade'));
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Processing/ })).toBeDisabled();
  });

  it('closes dialog when cancel is clicked', () => {
    render(<PlanChangeDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('includes billing cycle in upgrade request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });
    
    render(<PlanChangeDialog {...defaultProps} />);
    
    // Select yearly billing
    fireEvent.click(screen.getByLabelText(/Yearly/));
    fireEvent.click(screen.getByText('Confirm Upgrade'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetTier: SubscriptionTier.PRO,
          billingCycle: BillingCycle.YEARLY
        })
      });
    });
  });

  it('shows correct button text for different change types', () => {
    // Upgrade
    render(<PlanChangeDialog {...defaultProps} />);
    expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    
    // Downgrade to paid tier
    const downgradeProps = {
      ...defaultProps,
      changeType: 'downgrade' as const,
      targetTier: SubscriptionTier.GROWTH
    };
    render(<PlanChangeDialog {...downgradeProps} />);
    expect(screen.getByText('Confirm Downgrade')).toBeInTheDocument();
    
    // Cancel to free tier
    const cancelProps = {
      ...defaultProps,
      changeType: 'downgrade' as const,
      targetTier: SubscriptionTier.STARTER
    };
    render(<PlanChangeDialog {...cancelProps} />);
    expect(screen.getByText('Confirm Cancellation')).toBeInTheDocument();
  });

  it('shows correct tier icons', () => {
    render(<PlanChangeDialog {...defaultProps} />);
    
    // Should show icons for both current and target tiers
    const badges = screen.getAllByRole('generic').filter(el => 
      el.className.includes('inline-flex') && 
      (el.textContent?.includes('GROWTH') || el.textContent?.includes('PRO'))
    );
    
    expect(badges).toHaveLength(2);
  });

  it('calculates yearly savings correctly', () => {
    render(<PlanChangeDialog {...defaultProps} />);
    
    // Pro tier: $15/month * 12 = $180, yearly = $150, savings = $30
    expect(screen.getByText('Save $30')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    const props = { ...defaultProps, open: false };
    render(<PlanChangeDialog {...props} />);
    
    expect(screen.queryByText('Upgrade Your Plan')).not.toBeInTheDocument();
  });
});