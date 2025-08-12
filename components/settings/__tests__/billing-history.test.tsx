import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BillingHistory } from '../billing-history';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and related APIs
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock document.createElement and related DOM APIs
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();

Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        click: mockClick,
      };
    }
    return {};
  }),
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild,
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild,
});

const mockBillingHistory = [
  {
    id: 'bill_123',
    subscriptionId: 'sub_123',
    userId: 'user_123',
    stripeInvoiceId: 'in_123',
    amount: 5.00,
    currency: 'usd',
    status: 'paid',
    billingReason: 'subscription_cycle',
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-02-01'),
    paidAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'bill_124',
    subscriptionId: 'sub_123',
    userId: 'user_123',
    stripeInvoiceId: 'in_124',
    amount: 15.00,
    currency: 'usd',
    status: 'pending',
    billingReason: 'subscription_update',
    periodStart: new Date('2024-02-01'),
    periodEnd: new Date('2024-03-01'),
    paidAt: null,
    createdAt: new Date('2024-02-01')
  },
  {
    id: 'bill_125',
    subscriptionId: 'sub_123',
    userId: 'user_123',
    stripeInvoiceId: null,
    amount: 5.00,
    currency: 'usd',
    status: 'failed',
    billingReason: 'invoice_payment_failed',
    periodStart: new Date('2024-03-01'),
    periodEnd: new Date('2024-04-01'),
    paidAt: null,
    createdAt: new Date('2024-03-01')
  }
];

describe('BillingHistory', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
    mockAppendChild.mockClear();
    mockRemoveChild.mockClear();
    mockClick.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<BillingHistory />);
    
    // Should show skeleton loading
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    // Should show card structure
    expect(document.querySelector('.rounded-lg.border')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders billing history data correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockBillingHistory
      })
    });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Billing History')).toBeInTheDocument();
    });
    
    // Check first item
    expect(screen.getByText('Recurring payment')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('paid')).toBeInTheDocument();
    
    // Check second item
    expect(screen.getByText('Plan change')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    
    // Check third item
    expect(screen.getByText('Payment retry')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('shows empty state when no billing history exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('No billing history found')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Your payment history will appear here once you have an active subscription.')).toBeInTheDocument();
  });

  it('displays correct status icons', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockBillingHistory
      })
    });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Billing History')).toBeInTheDocument();
    });
    
    // Check that status badges have correct colors
    const paidBadge = screen.getByText('paid').closest('.inline-flex');
    expect(paidBadge).toHaveClass('bg-green-100', 'text-green-800');
    
    const pendingBadge = screen.getByText('pending').closest('.inline-flex');
    expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    
    const failedBadge = screen.getByText('failed').closest('.inline-flex');
    expect(failedBadge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('shows invoice download button only for paid items with invoice ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockBillingHistory
      })
    });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Billing History')).toBeInTheDocument();
    });
    
    // Should show invoice button for paid item with invoice ID
    const invoiceButtons = screen.getAllByText('Invoice');
    expect(invoiceButtons).toHaveLength(1);
    
    // Should not show invoice button for pending item (even with invoice ID)
    // Should not show invoice button for failed item (no invoice ID)
  });

  it('handles invoice download correctly', async () => {
    const mockBlob = new Blob(['fake pdf content'], { type: 'application/pdf' });
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockBillingHistory
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });
    
    mockCreateObjectURL.mockReturnValue('blob:fake-url');
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Invoice')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Invoice'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/invoice/in_123');
    });
    
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it('handles invoice download error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockBillingHistory
        })
      })
      .mockRejectedValueOnce(new Error('Download failed'));
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Invoice')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Invoice'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error downloading invoice:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('formats dates correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockBillingHistory
      })
    });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Billing History')).toBeInTheDocument();
    });
    
    // Check date formatting
    expect(screen.getByText('Jan 1, 2024 - Jan 31, 2024')).toBeInTheDocument();
    expect(screen.getByText('Paid on Jan 1, 2024')).toBeInTheDocument();
  });

  it('formats amounts correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockBillingHistory
      })
    });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Billing History')).toBeInTheDocument();
    });
    
    // Check amount formatting
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
  });

  it('formats billing reasons correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockBillingHistory
      })
    });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Billing History')).toBeInTheDocument();
    });
    
    // Check billing reason formatting
    expect(screen.getByText('Recurring payment')).toBeInTheDocument();
    expect(screen.getByText('Plan change')).toBeInTheDocument();
    expect(screen.getByText('Payment retry')).toBeInTheDocument();
  });

  it('retries fetch when Try Again button is clicked', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockBillingHistory
        })
      });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Try Again'));
    
    await waitFor(() => {
      expect(screen.getByText('Billing History')).toBeInTheDocument();
    });
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles API error response correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: 'Unauthorized access' }
      })
    });
    
    render(<BillingHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Unauthorized access')).toBeInTheDocument();
    });
  });
});