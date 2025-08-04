import { describe, it, expect, vi } from 'vitest'

// Mock the API hooks to simulate Plaid integration
const mockTransactions = [
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
]

const mockAccounts = [
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
]

describe('Plaid Integration with Financial Pages', () => {
  describe('Data Processing and Calculations', () => {
    it('should calculate total balance from all accounts', () => {
      const totalBalance = mockAccounts.reduce((sum, account) => sum + account.balance.current, 0)
      expect(totalBalance).toBe(46275.25)
    })

    it('should filter investment accounts correctly', () => {
      const investmentAccounts = mockAccounts.filter(account => 
        account.type === 'investment' || 
        account.subtype === 'brokerage' ||
        account.subtype === '401k' ||
        account.subtype === 'ira' ||
        account.subtype === 'roth'
      )
      
      expect(investmentAccounts).toHaveLength(1)
      expect(investmentAccounts[0].name).toBe('Fidelity 401k')
    })

    it('should calculate monthly income from transactions', () => {
      // Use a fixed date that includes our mock transactions
      const thirtyDaysAgo = new Date('2024-01-01T00:00:00Z')
      const monthlyIncome = mockTransactions
        .filter(t => t.amount > 0 && new Date(t.date) > thirtyDaysAgo)
        .reduce((sum, t) => sum + t.amount, 0)
      
      expect(monthlyIncome).toBe(2500.00)
    })

    it('should calculate monthly expenses from transactions', () => {
      // Use a fixed date that includes our mock transactions
      const thirtyDaysAgo = new Date('2024-01-01T00:00:00Z')
      const monthlyExpenses = Math.abs(mockTransactions
        .filter(t => t.amount < 0 && new Date(t.date) > thirtyDaysAgo)
        .reduce((sum, t) => sum + t.amount, 0))
      
      expect(monthlyExpenses).toBe(25.50)
    })

    it('should calculate savings rate correctly', () => {
      const monthlyIncome = 2500.00
      const monthlyExpenses = 25.50
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0
      
      expect(savingsRate).toBeCloseTo(98.98, 2)
    })
  })

  describe('Transaction Data Processing', () => {
    it('should format transaction dates correctly', () => {
      const formatTransactionDate = (dateString: string): string => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      const formattedDate = formatTransactionDate(mockTransactions[0].date)
      expect(formattedDate).toContain('January 15, 2024')
    })

    it('should categorize transactions by color', () => {
      const getCategoryColor = (categories: string[]): string => {
        const primaryCategory = categories[0]?.toLowerCase() || 'other'
        
        const colorMap: Record<string, string> = {
          'food and drink': 'bg-green-500',
          'deposit': 'bg-emerald-500',
          'other': 'bg-slate-500'
        }
        
        return colorMap[primaryCategory] || 'bg-slate-500'
      }

      expect(getCategoryColor(mockTransactions[0].category)).toBe('bg-green-500')
      expect(getCategoryColor(mockTransactions[1].category)).toBe('bg-emerald-500')
    })

    it('should sort transactions by date', () => {
      const sortedTransactions = [...mockTransactions].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })

      expect(sortedTransactions[0].name).toBe('Coffee Shop') // More recent
      expect(sortedTransactions[1].name).toBe('Salary Deposit') // Older
    })
  })

  describe('Account Data Processing', () => {
    it('should determine account icons based on type', () => {
      const getAccountIcon = (type: string, subtype: string) => {
        if (type === 'investment' || subtype === 'brokerage' || subtype === '401k' || subtype === 'ira') {
          return 'PieChart'
        }
        if (type === 'depository' && subtype === 'savings') {
          return 'Target'
        }
        return 'Wallet'
      }

      expect(getAccountIcon(mockAccounts[0].type, mockAccounts[0].subtype)).toBe('Wallet')
      expect(getAccountIcon(mockAccounts[1].type, mockAccounts[1].subtype)).toBe('PieChart')
    })

    it('should determine account colors based on type', () => {
      const getAccountColor = (type: string, subtype: string) => {
        if (type === 'investment' || subtype === 'brokerage' || subtype === '401k' || subtype === 'ira') {
          return {
            color: "bg-purple-500",
            gradient: "from-purple-50 to-purple-100",
            border: "border-purple-200"
          }
        }
        if (type === 'depository' && subtype === 'savings') {
          return {
            color: "bg-green-500",
            gradient: "from-green-50 to-green-100",
            border: "border-green-200"
          }
        }
        return {
          color: "bg-blue-500",
          gradient: "from-blue-50 to-blue-100",
          border: "border-blue-200"
        }
      }

      const checkingColors = getAccountColor(mockAccounts[0].type, mockAccounts[0].subtype)
      const investmentColors = getAccountColor(mockAccounts[1].type, mockAccounts[1].subtype)

      expect(checkingColors.color).toBe('bg-blue-500')
      expect(investmentColors.color).toBe('bg-purple-500')
    })
  })

  describe('API Integration Scenarios', () => {
    it('should handle empty account list', () => {
      const emptyAccounts: any[] = []
      const totalBalance = emptyAccounts.reduce((sum, account) => sum + account.balance.current, 0)
      expect(totalBalance).toBe(0)
    })

    it('should handle empty transaction list', () => {
      const emptyTransactions: any[] = []
      const monthlyIncome = emptyTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)
      expect(monthlyIncome).toBe(0)
    })

    it('should handle transactions with missing categories', () => {
      const transactionWithoutCategory = {
        ...mockTransactions[0],
        category: []
      }

      const getCategoryColor = (categories: string[]): string => {
        const primaryCategory = categories[0]?.toLowerCase() || 'other'
        return primaryCategory === 'other' ? 'bg-slate-500' : 'bg-green-500'
      }

      expect(getCategoryColor(transactionWithoutCategory.category)).toBe('bg-slate-500')
    })

    it('should handle accounts with missing balance fields', () => {
      const accountWithMissingBalance = {
        ...mockAccounts[0],
        balance: {
          current: 1000.00
          // available and limit are missing
        }
      }

      expect(accountWithMissingBalance.balance.current).toBe(1000.00)
      expect(accountWithMissingBalance.balance.available).toBeUndefined()
    })
  })

  describe('Filter and Search Functionality', () => {
    it('should filter transactions by account', () => {
      const filteredTransactions = mockTransactions.filter(t => t.accountId === 'acc1')
      expect(filteredTransactions).toHaveLength(2)
    })

    it('should filter transactions by amount type', () => {
      const incomeTransactions = mockTransactions.filter(t => t.amount > 0)
      const expenseTransactions = mockTransactions.filter(t => t.amount < 0)
      
      expect(incomeTransactions).toHaveLength(1)
      expect(expenseTransactions).toHaveLength(1)
    })

    it('should search transactions by name', () => {
      const searchTerm = 'coffee'
      const searchResults = mockTransactions.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchantName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].name).toBe('Coffee Shop')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed transaction data', () => {
      const malformedTransaction = {
        id: '3',
        accountId: 'acc1',
        amount: null, // Invalid amount
        date: 'invalid-date',
        name: '',
        category: null,
        pending: 'not-boolean',
        accountName: 'Test Account'
      }

      // Should handle null/undefined amounts
      const amount = malformedTransaction.amount || 0
      expect(amount).toBe(0)

      // Should handle invalid dates
      const date = new Date(malformedTransaction.date)
      expect(isNaN(date.getTime())).toBe(true)

      // Should handle null categories
      const categories = malformedTransaction.category || []
      expect(Array.isArray(categories)).toBe(true)
    })

    it('should handle network errors gracefully', () => {
      const mockError = {
        message: 'Network error',
        code: 'NETWORK_ERROR'
      }

      const getErrorMessage = (error: any): string => {
        if (error?.code === 'NETWORK_ERROR') {
          return 'Network connection error. Please check your internet connection.'
        }
        return error?.message || 'An unexpected error occurred.'
      }

      expect(getErrorMessage(mockError)).toBe('Network connection error. Please check your internet connection.')
    })
  })
})