import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../auth-provider';
import { useAuth } from '../../hooks/use-api';

// Mock dependencies
vi.mock('../../hooks/use-api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

const mockUseAuth = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  signInState: {
    loading: '',
    error: null,
    isLoading: false,
    isSuccess: false,
  },
  signUpState: {
    loading: '',
    error: null,
    isLoading: false,
    isSuccess: false,
  },
};

vi.mocked(useAuth).mockReturnValue(mockUseAuth);

// Test component to access auth context
function TestComponent() {
  const { user, subscription, isAuthenticated, refreshSubscription } = useAuthContext();
  
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="subscription">{subscription ? subscription.tier : 'No subscription'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'Yes' : 'No'}</div>
      <button onClick={refreshSubscription} data-testid="refresh">Refresh</button>
    </div>
  );
}

describe('AuthProvider with Subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch subscription when user is authenticated', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
    };

    const mockSubscription = {
      id: 'sub-123',
      tier: 'STARTER',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      currentPeriodEnd: '2024-02-01T00:00:00Z',
      cancelAtPeriodEnd: false,
    };

    // Mock authenticated user
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      user: mockUser,
      isAuthenticated: true,
    });

    // Mock successful subscription fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription,
      }),
    } as Response);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for subscription to be fetched
    await waitFor(() => {
      expect(screen.getByTestId('subscription')).toHaveTextContent('STARTER');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
    expect(fetch).toHaveBeenCalledWith('/api/subscriptions', {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('should handle no subscription gracefully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
    };

    // Mock authenticated user
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      user: mockUser,
      isAuthenticated: true,
    });

    // Mock no subscription response
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: null,
      }),
    } as Response);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for subscription fetch to complete
    await waitFor(() => {
      expect(screen.getByTestId('subscription')).toHaveTextContent('No subscription');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
  });

  it('should handle subscription fetch error gracefully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
    };

    // Mock authenticated user
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      user: mockUser,
      isAuthenticated: true,
    });

    // Mock fetch error
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for error handling
    await waitFor(() => {
      expect(screen.getByTestId('subscription')).toHaveTextContent('No subscription');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
  });

  it('should not fetch subscription when user is not authenticated', async () => {
    // Mock unauthenticated state
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      user: null,
      isAuthenticated: false,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(screen.getByTestId('subscription')).toHaveTextContent('No subscription');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should refresh subscription when refreshSubscription is called', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
    };

    const mockSubscription = {
      id: 'sub-123',
      tier: 'GROWTH',
      status: 'ACTIVE',
      billingCycle: 'YEARLY',
      currentPeriodEnd: '2024-12-01T00:00:00Z',
      cancelAtPeriodEnd: false,
    };

    // Mock authenticated user
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      user: mockUser,
      isAuthenticated: true,
    });

    // Mock successful subscription fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription,
      }),
    } as Response);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial subscription fetch
    await waitFor(() => {
      expect(screen.getByTestId('subscription')).toHaveTextContent('GROWTH');
    });

    // Clear fetch mock calls
    vi.mocked(fetch).mockClear();

    // Click refresh button
    const refreshButton = screen.getByTestId('refresh');
    refreshButton.click();

    // Wait for refresh to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/subscriptions', {
        method: 'GET',
        credentials: 'include',
      });
    });
  });

  it('should clear subscription when user logs out', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
    };

    const mockSubscription = {
      id: 'sub-123',
      tier: 'STARTER',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      currentPeriodEnd: '2024-02-01T00:00:00Z',
      cancelAtPeriodEnd: false,
    };

    // Start with authenticated user
    const mockUseAuthWithUser = {
      ...mockUseAuth,
      user: mockUser,
      isAuthenticated: true,
    };

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Mock initial auth state
    vi.mocked(useAuth).mockReturnValue(mockUseAuthWithUser);

    // Mock successful subscription fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSubscription,
      }),
    } as Response);

    // Wait for subscription to be fetched
    await waitFor(() => {
      expect(screen.getByTestId('subscription')).toHaveTextContent('STARTER');
    });

    // Now mock user logout
    vi.mocked(useAuth).mockReturnValue({
      ...mockUseAuth,
      user: null,
      isAuthenticated: false,
    });

    // Rerender with logged out state
    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Subscription should be cleared
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(screen.getByTestId('subscription')).toHaveTextContent('No subscription');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
  });
});