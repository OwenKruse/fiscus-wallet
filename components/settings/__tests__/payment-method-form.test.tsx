import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PaymentMethodForm } from '../payment-method-form';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock confirm dialog
global.confirm = vi.fn();

const mockPaymentMethods = [
  {
    id: 'pm_123',
    type: 'card',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
    isDefault: true
  },
  {
    id: 'pm_124',
    type: 'card',
    brand: 'mastercard',
    last4: '5555',
    expMonth: 6,
    expYear: 2026,
    isDefault: false
  }
];

describe('PaymentMethodForm', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    (global.confirm as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<PaymentMethodForm />);
    
    // Should show skeleton loading
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    // Should show card structure
    expect(document.querySelector('.rounded-lg.border')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders payment methods correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPaymentMethods
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Payment Methods')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Saved Payment Methods')).toBeInTheDocument();
    expect(screen.getByText('VISA •••• 4242')).toBeInTheDocument();
    expect(screen.getByText('MASTERCARD •••• 5555')).toBeInTheDocument();
    expect(screen.getByText('Expires 12/2025')).toBeInTheDocument();
    expect(screen.getByText('Expires 06/2026')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows add payment method button when methods exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPaymentMethods
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Payment Method')).toBeInTheDocument();
    });
  });

  it('shows add payment method button when no methods exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
  });

  it('shows payment method form when add button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPaymentMethods
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add New Payment Method'));
    
    expect(screen.getByLabelText('Card Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Expiry Month')).toBeInTheDocument();
    expect(screen.getByLabelText('Expiry Year')).toBeInTheDocument();
    expect(screen.getByLabelText('CVC')).toBeInTheDocument();
    expect(screen.getByLabelText('Cardholder Name')).toBeInTheDocument();
  });

  it('formats card number input correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    const cardNumberInput = screen.getByLabelText('Card Number');
    fireEvent.change(cardNumberInput, { target: { value: '4242424242424242' } });
    
    expect(cardNumberInput).toHaveValue('4242 4242 4242 4242');
  });

  it('validates card number length', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    const cardNumberInput = screen.getByLabelText('Card Number');
    fireEvent.change(cardNumberInput, { target: { value: '42424242424242424242' } });
    
    // Should not exceed 16 digits (19 chars with spaces)
    expect(cardNumberInput.value.replace(/\s/g, '')).toHaveLength(16);
  });

  it('validates expiry month input', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    const monthInput = screen.getByLabelText('Expiry Month');
    
    // Valid month
    fireEvent.change(monthInput, { target: { value: '12' } });
    expect(monthInput).toHaveValue('12');
    
    // Invalid month (too high)
    fireEvent.change(monthInput, { target: { value: '13' } });
    expect(monthInput).toHaveValue('12'); // Should not change
    
    // Valid single digit month
    fireEvent.change(monthInput, { target: { value: '5' } });
    expect(monthInput).toHaveValue('05');
  });

  it('validates CVC input length', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    const cvcInput = screen.getByLabelText('CVC');
    fireEvent.change(cvcInput, { target: { value: '12345' } });
    
    // Should not exceed 4 digits
    expect(cvcInput).toHaveValue('1234');
  });

  it('validates form before submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    const submitButton = screen.getByText('Save Payment Method');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Valid card number is required/)).toBeInTheDocument();
    });
  });

  it('validates expired card', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    // Fill form with expired card
    fireEvent.change(screen.getByLabelText('Card Number'), { target: { value: '4242424242424242' } });
    fireEvent.change(screen.getByLabelText('Expiry Month'), { target: { value: '01' } });
    fireEvent.change(screen.getByLabelText('Expiry Year'), { target: { value: '2020' } });
    fireEvent.change(screen.getByLabelText('CVC'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Cardholder Name'), { target: { value: 'John Doe' } });
    
    const submitButton = screen.getByText('Save Payment Method');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Card has expired/)).toBeInTheDocument();
    });
  });

  it('submits form successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pm_new' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [...mockPaymentMethods, { id: 'pm_new', type: 'card', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025, isDefault: false }]
        })
      });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText('Card Number'), { target: { value: '4242424242424242' } });
    fireEvent.change(screen.getByLabelText('Expiry Month'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Expiry Year'), { target: { value: '2025' } });
    fireEvent.change(screen.getByLabelText('CVC'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Cardholder Name'), { target: { value: 'John Doe' } });
    
    const submitButton = screen.getByText('Save Payment Method');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardNumber: '4242424242424242',
          expMonth: 12,
          expYear: 2025,
          cvc: '123',
          name: 'John Doe',
          email: '',
          address: {
            line1: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'US'
          }
        }),
      });
    });
  });

  it('handles form submission error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Invalid card number' }
        })
      });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText('Card Number'), { target: { value: '4242424242424242' } });
    fireEvent.change(screen.getByLabelText('Expiry Month'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Expiry Year'), { target: { value: '2025' } });
    fireEvent.change(screen.getByLabelText('CVC'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Cardholder Name'), { target: { value: 'John Doe' } });
    
    const submitButton = screen.getByText('Save Payment Method');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid card number')).toBeInTheDocument();
    });
  });

  it('deletes payment method when delete button is clicked', async () => {
    (global.confirm as any).mockReturnValue(true);
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPaymentMethods
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockPaymentMethods[0]] // Only first method remains
        })
      });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('MASTERCARD •••• 5555')).toBeInTheDocument();
    });
    
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => button.querySelector('svg')); // Find button with trash icon
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/payment-method/pm_124', {
        method: 'DELETE',
      });
    });
  });

  it('cancels delete when user declines confirmation', async () => {
    (global.confirm as any).mockReturnValue(false);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPaymentMethods
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('MASTERCARD •••• 5555')).toBeInTheDocument();
    });
    
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => button.querySelector('svg')); // Find button with trash icon
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }
    
    // Should not make delete API call
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial fetch
  });

  it('sets payment method as default', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPaymentMethods
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPaymentMethods.map(pm => ({ ...pm, isDefault: pm.id === 'pm_124' }))
        })
      });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Set Default')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Set Default'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/payment-method/pm_124/default', {
        method: 'POST',
      });
    });
  });

  it('cancels form editing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    expect(screen.getByLabelText('Card Number')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.queryByLabelText('Card Number')).not.toBeInTheDocument();
    expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
  });

  it('shows loading state during form submission', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      })
      .mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<PaymentMethodForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Payment Method'));
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText('Card Number'), { target: { value: '4242424242424242' } });
    fireEvent.change(screen.getByLabelText('Expiry Month'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Expiry Year'), { target: { value: '2025' } });
    fireEvent.change(screen.getByLabelText('CVC'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Cardholder Name'), { target: { value: 'John Doe' } });
    
    const submitButton = screen.getByText('Save Payment Method');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
    
    expect(submitButton).toBeDisabled();
  });
});