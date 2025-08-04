import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import TransactionsPage from '../../transactions/page'
import InvestmentsPage from '../../investments/page'
import AnalyticsPage from '../../analytics/page'
import FinanceDashboard from '../../../finance-dashboard'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null)
  }))
}))

// Mock API hooks
vi.mock('../../../hooks/use-api', () => ({
  useTransactions: vi.fn(() => ({
    transactions: [
      {
        id: '1',
        accountId: 'acc1',
        amount: -25.50,
        date: '2024-01-15T10:30:00Z',
        name: 'Coffee Shop',
        merchantName: 'Starbucks',
        category: ['Food and Drink', 'Restaurants'],
        subcategory: 'Coffee Shops',
        pending: false,
        accountName: 'Chase Checking'
      },
      {
        id: '2',
        accountId: 'acc1',
        amount: 2500.00,
        date: '2024-01-14T09:00:00Z',
        name: 'Salary Deposit',
        category: ['Deposit', 'Payroll'],
        pending: false,
        accountName: 'Chase Checking'
      }
    ],
    loading: false,
    error: null,
    updateFilters: vi.fn(),
    loadMore: vi.fn(),
    hasMore: false,
    pagination: { total: 2, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false }
  })),
  useAccounts: vi.fn(() => ({
    accounts: [
      {
        id: 'acc1',
        name: 'Chase Checking',
        officialName: 'Chase Total Checking',
        type: 'depository',
        subtype: 'checking',
        balance: {
          available: 1250.75,
          current: 1275.25,
          limit: null
        },
        institutionName: 'Chase Bank',
        lastUpdated: '2024-01-15T12:00:00Z'
      },
      {
        id: 'acc2',
        name: 'Fidelity 401k',
        type: 'investment',
        subtype: '401k',
        balance: {
          current: 45000.00
        },
        institutionName: 'Fidelity',
        lastUpdated: '2024-01-15T12:00:00Z'
      }
    ],
    loading: false,
    refreshAccounts: vi.fn()
  })),
  useSync: vi.fn(() => ({
    performSync: vi.fn(),
    isSyncing: false,
    lastSyncTime: new Date('2024-01-15T12:00:00Z')
  })),
  usePlaid: vi.fn(() => ({
    createLinkToken: vi.fn(),
    exchangeToken: vi.fn(),
    disconnectAccount: vi.fn(),
    createLinkTokenState: { isLoading: false },
    exchangeTokenState: { isLoading: false },
    disconnectAccountState: { isLoading: false }
  }))
}))

// Mock UI components
vi.mock('../../../components/plaid-link-button', () => ({
  PlaidLinkButton: ({ children, onSuccess }: any) => {
    return React.createElement('button', {
      onClick: () => onSuccess?.()
    }, children || 'Connect Bank Account')
  }
}))

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

vi.mock('../../../hooks/use-mobile', () => ({
  useIsMobile: () => false
}))

// Mock dashboard layout
vi.mock('../../../components/dashboard-layout', () => ({
  DashboardLayout: ({ children }: any) => React.createElement('div', { 'data-testid': 'dashboard-layout' }, children)
}))

// Mock sidebar components
vi.mock('../../../components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: any) => React.createElement('div', {}, children),
  SidebarInset: ({ children }: any) => React.createElement('div', {}, children),
  SidebarTrigger: () => React.createElement('button', {}, 'Menu')
}))

describe('Plaid Integration with Financial Pages', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  }

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Transactions Page Integration', () => {
    it('should display real transaction data from Plaid', async () => {
      render(<TransactionsPage />)
      
      // Check that real transaction data is displayed
      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
      expect(screen.getByText('Salary Deposit')).toBeInTheDocument()
      expect(screen.getByText('-$25.50')).toBeInTheDocument()
      expect(screen.getByText('+$2,500.00')).toBeInTheDocument()
    })

    it('should show Plaid Link button for connecting accounts', () => {
      render(<TransactionsPage />)
      
      expect(screen.getByText('Connect Bank')).toBeInTheDocument()
    })

    it('should filter transactions by account', async () => {
      render(<TransactionsPage />)
      
      // Find account filter dropdown
      const accountFilter = screen.getByDisplayValue('All Accounts')
      expect(accountFilter).toBeInTheDocument()
      
      // Should show Chase Checking as an option
      fireEvent.click(accountFilter)
      await waitFor(() => {
        expect(screen.getByText('Chase Checking')).toBeInTheDocument()
      })
    })

    it('should handle refresh functionality', async () => {
      const mockPerformSync = vi.fn()
      vi.mocked(require('../../../hooks/use-api').useSync).mockReturnValue({
        performSync: mockPerformSync,
        isSyncing: false
      })

      render(<TransactionsPage />)
      
      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)
      
      expect(mockPerformSync).toHaveBeenCalledWith({ forceRefresh: true })
    })
  })

  describe('Investments Page Integration', () => {
    it('should display real investment account data', () => {
      render(<InvestmentsPage />)
      
      // Check that investment accounts are displayed
      expect(screen.getByText('Fidelity 401k')).toBeInTheDocument()
      expect(screen.getByText('$45,000')).toBeInTheDocument()
    })

    it('should show connect account button', () => {
      render(<InvestmentsPage />)
      
      expect(screen.getByText('Connect Account')).toBeInTheDocument()
    })

    it('should calculate portfolio value from real accounts', () => {
      render(<InvestmentsPage />)
      
      // Should show the total value of investment accounts
      expect(screen.getByText('$45,000')).toBeInTheDocument()
    })
  })

  describe('Analytics Page Integration', () => {
    it('should display real financial metrics', () => {
      render(<AnalyticsPage />)
      
      // Check that real balance is displayed
      expect(screen.getByText('$46,275')).toBeInTheDocument() // Total of both accounts
    })

    it('should calculate monthly income and expenses from transactions', () => {
      render(<AnalyticsPage />)
      
      // Should show calculated metrics from real transaction data
      expect(screen.getByText('$2,500')).toBeInTheDocument() // Monthly income
      expect(screen.getByText('$26')).toBeInTheDocument() // Monthly expenses (rounded)
    })

    it('should show refresh button', () => {
      render(<AnalyticsPage />)
      
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })
  })

  describe('Dashboard Integration', () => {
    it('should display real account balances', () => {
      render(<FinanceDashboard />)
      
      // Check total balance calculation
      expect(screen.getByText('$46,275')).toBeInTheDocument()
    })

    it('should show real transactions in recent activity', () => {
      render(<FinanceDashboard />)
      
      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
      expect(screen.getByText('Salary Deposit')).toBeInTheDocument()
    })

    it('should display connected accounts with proper styling', () => {
      render(<FinanceDashboard />)
      
      expect(screen.getByText('Chase Checking')).toBeInTheDocument()
      expect(screen.getByText('Chase Bank • checking')).toBeInTheDocument()
      expect(screen.getByText('$1,275')).toBeInTheDocument()
    })

    it('should handle Plaid Link success', async () => {
      const mockRefresh = vi.fn()
      vi.mocked(require('../../../hooks/use-api').useSync).mockReturnValue({
        performSync: mockRefresh,
        isSyncing: false
      })

      render(<FinanceDashboard />)
      
      const connectButton = screen.getByText('Connect Account')
      fireEvent.click(connectButton)
      
      // Should trigger refresh after successful connection
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Mock error state
      vi.mocked(require('../../../hooks/use-api').useTransactions).mockReturnValue({
        transactions: [],
        loading: false,
        error: 'Failed to load transactions',
        updateFilters: vi.fn(),
        loadMore: vi.fn(),
        hasMore: false,
        pagination: null
      })

      render(<TransactionsPage />)
      
      expect(screen.getByText('Failed to load transactions')).toBeInTheDocument()
    })

    it('should show loading states', () => {
      // Mock loading state
      vi.mocked(require('../../../hooks/use-api').useAccounts).mockReturnValue({
        accounts: [],
        loading: true,
        refreshAccounts: vi.fn()
      })

      render(<AnalyticsPage />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Data Refresh Functionality', () => {
    it('should sync data across all pages', async () => {
      const mockPerformSync = vi.fn()
      const mockRefreshAccounts = vi.fn()
      
      vi.mocked(require('../../../hooks/use-api').useSync).mockReturnValue({
        performSync: mockPerformSync,
        isSyncing: false
      })
      
      vi.mocked(require('../../../hooks/use-api').useAccounts).mockReturnValue({
        accounts: [],
        loading: false,
        refreshAccounts: mockRefreshAccounts
      })

      render(<FinanceDashboard />)
      
      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)
      
      expect(mockPerformSync).toHaveBeenCalledWith({ forceRefresh: true })
      expect(mockRefreshAccounts).toHaveBeenCalled()
    })
  })

  describe('Navigation Integration', () => {
    it('should navigate to transaction details', () => {
      render(<FinanceDashboard />)
      
      const transactionElement = screen.getByText('Coffee Shop')
      fireEvent.click(transactionElement)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/transactions?id=1')
    })
  })
})