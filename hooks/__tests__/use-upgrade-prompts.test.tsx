import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useUpgradePrompts } from '../use-upgrade-prompts'
import { SubscriptionTier } from '@/lib/subscription/tier-config'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useUpgradePrompts', () => {
  const mockOnUpgradeRequested = vi.fn()

  const defaultOptions = {
    currentTier: SubscriptionTier.STARTER,
    currentUsage: {
      connectedAccounts: 2,
      totalBalance: 10000
    },
    onUpgradeRequested: mockOnUpgradeRequested
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Account Limit Checking', () => {
    it('returns true when under account limit', () => {
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      const canAdd = result.current.checkAccountLimit(2) // Under limit of 3
      expect(canAdd).toBe(true)
      expect(result.current.promptState).toBeNull()
    })

    it('shows prompt when at account limit', () => {
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      act(() => {
        const canAdd = result.current.checkAccountLimit(3) // At limit of 3
        expect(canAdd).toBe(false)
      })

      expect(result.current.promptState).toEqual({
        isVisible: true,
        reason: 'account_limit',
        currentTier: SubscriptionTier.STARTER,
        targetTier: SubscriptionTier.GROWTH,
        data: {
          accountCount: 3,
          accountLimit: 3
        }
      })
      expect(mockOnUpgradeRequested).toHaveBeenCalledWith(SubscriptionTier.GROWTH, 'account_limit')
    })

    it('returns true for unlimited tier', () => {
      const { result } = renderHook(() => 
        useUpgradePrompts({
          ...defaultOptions,
          currentTier: SubscriptionTier.PRO
        })
      )
      
      const canAdd = result.current.checkAccountLimit(100)
      expect(canAdd).toBe(true)
      expect(result.current.promptState).toBeNull()
    })
  })

  describe('Balance Limit Checking', () => {
    it('returns true when under balance limit', () => {
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      const canTrack = result.current.checkBalanceLimit(10000) // Under limit of 15000
      expect(canTrack).toBe(true)
      expect(result.current.promptState).toBeNull()
    })

    it('shows prompt when over balance limit', () => {
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      act(() => {
        const canTrack = result.current.checkBalanceLimit(20000) // Over limit of 15000
        expect(canTrack).toBe(false)
      })

      expect(result.current.promptState).toEqual({
        isVisible: true,
        reason: 'balance_limit',
        currentTier: SubscriptionTier.STARTER,
        targetTier: SubscriptionTier.GROWTH,
        data: {
          currentBalance: 20000,
          balanceLimit: 15000
        }
      })
      expect(mockOnUpgradeRequested).toHaveBeenCalledWith(SubscriptionTier.GROWTH, 'balance_limit')
    })

    it('returns true for unlimited tier', () => {
      const { result } = renderHook(() => 
        useUpgradePrompts({
          ...defaultOptions,
          currentTier: SubscriptionTier.PRO
        })
      )
      
      const canTrack = result.current.checkBalanceLimit(1000000)
      expect(canTrack).toBe(true)
      expect(result.current.promptState).toBeNull()
    })
  })

  describe('Feature Access Checking', () => {
    it('returns true for available features', () => {
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      const hasAccess = result.current.checkFeatureAccess('basic_budgeting')
      expect(hasAccess).toBe(true)
      expect(result.current.promptState).toBeNull()
    })

    it('shows prompt for locked features', () => {
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      act(() => {
        const hasAccess = result.current.checkFeatureAccess('csv_export')
        expect(hasAccess).toBe(false)
      })

      expect(result.current.promptState).toEqual({
        isVisible: true,
        reason: 'feature_locked',
        currentTier: SubscriptionTier.STARTER,
        targetTier: SubscriptionTier.GROWTH,
        data: {
          featureName: 'csv_export'
        }
      })
      expect(mockOnUpgradeRequested).toHaveBeenCalledWith(SubscriptionTier.GROWTH, 'feature_locked')
    })

    it('returns true for higher tier features', () => {
      const { result } = renderHook(() => 
        useUpgradePrompts({
          ...defaultOptions,
          currentTier: SubscriptionTier.GROWTH
        })
      )
      
      const hasAccess = result.current.checkFeatureAccess('csv_export')
      expect(hasAccess).toBe(true)
      expect(result.current.promptState).toBeNull()
    })
  })

  describe('Prompt Dismissal', () => {
    it('dismisses prompt and saves to localStorage', () => {
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      // Show a prompt first
      act(() => {
        result.current.checkAccountLimit(3)
      })
      
      expect(result.current.promptState).not.toBeNull()
      
      // Dismiss the prompt
      act(() => {
        result.current.dismissPrompt()
      })
      
      expect(result.current.promptState).toBeNull()
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dismissed_upgrade_prompts',
        expect.stringContaining('account_limit')
      )
    })

    it('does not show dismissed prompts', () => {
      // Mock localStorage to return a dismissed prompt
      const dismissedPrompts = [{
        reason: 'account_limit',
        dismissedAt: Date.now()
      }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(dismissedPrompts))
      
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      act(() => {
        const canAdd = result.current.checkAccountLimit(3)
        expect(canAdd).toBe(false) // Still returns false (limit exceeded)
      })
      
      expect(result.current.promptState).toBeNull() // But no prompt shown
      expect(mockOnUpgradeRequested).not.toHaveBeenCalled()
    })

    it('shows prompts after dismissal expires', () => {
      // Mock localStorage to return an expired dismissed prompt
      const expiredTime = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const dismissedPrompts = [{
        reason: 'account_limit',
        dismissedAt: expiredTime
      }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(dismissedPrompts))
      
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      act(() => {
        result.current.checkAccountLimit(3)
      })
      
      expect(result.current.promptState).not.toBeNull() // Prompt should show
      expect(mockOnUpgradeRequested).toHaveBeenCalled()
    })

    it('checks if prompt is dismissed', () => {
      const dismissedPrompts = [{
        reason: 'account_limit',
        dismissedAt: Date.now()
      }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(dismissedPrompts))
      
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      expect(result.current.isDismissed('account_limit')).toBe(true)
      expect(result.current.isDismissed('balance_limit')).toBe(false)
    })
  })

  describe('Auto-checking Current Usage', () => {
    it('auto-checks account limit on mount', () => {
      renderHook(() => 
        useUpgradePrompts({
          ...defaultOptions,
          currentUsage: {
            connectedAccounts: 3, // At limit
            totalBalance: 10000
          }
        })
      )
      
      expect(mockOnUpgradeRequested).toHaveBeenCalledWith(SubscriptionTier.GROWTH, 'account_limit')
    })

    it('auto-checks balance limit on mount', () => {
      renderHook(() => 
        useUpgradePrompts({
          ...defaultOptions,
          currentUsage: {
            connectedAccounts: 2,
            totalBalance: 20000 // Over limit
          }
        })
      )
      
      expect(mockOnUpgradeRequested).toHaveBeenCalledWith(SubscriptionTier.GROWTH, 'balance_limit')
    })

    it('does not auto-check with zero usage', () => {
      renderHook(() => 
        useUpgradePrompts({
          ...defaultOptions,
          currentUsage: {
            connectedAccounts: 0,
            totalBalance: 0
          }
        })
      )
      
      expect(mockOnUpgradeRequested).not.toHaveBeenCalled()
    })
  })

  describe('Manual Prompt Triggering', () => {
    it('shows prompt when manually triggered', () => {
      const { result } = renderHook(() => useUpgradePrompts(defaultOptions))
      
      act(() => {
        result.current.showUpgradePrompt('feature_locked', { featureName: 'Advanced Reports' })
      })
      
      expect(result.current.promptState).toEqual({
        isVisible: true,
        reason: 'feature_locked',
        currentTier: SubscriptionTier.STARTER,
        targetTier: SubscriptionTier.GROWTH,
        data: { featureName: 'Advanced Reports' }
      })
    })

    it('does not show prompt for highest tier', () => {
      const { result } = renderHook(() => 
        useUpgradePrompts({
          ...defaultOptions,
          currentTier: SubscriptionTier.PRO
        })
      )
      
      act(() => {
        result.current.showUpgradePrompt('feature_locked', { featureName: 'Test Feature' })
      })
      
      expect(result.current.promptState).toBeNull()
      expect(mockOnUpgradeRequested).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      expect(() => {
        renderHook(() => useUpgradePrompts(defaultOptions))
      }).not.toThrow()
    })

    it('handles invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      expect(() => {
        renderHook(() => useUpgradePrompts(defaultOptions))
      }).not.toThrow()
    })
  })
})