import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccounts } from './use-api'
import { checkOnboardingStatus } from '@/lib/middleware/onboarding-middleware'

export interface OnboardingState {
  needsOnboarding: boolean
  isLoading: boolean
  accountCount: number
  hasChecked: boolean
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    needsOnboarding: false,
    isLoading: true,
    accountCount: 0,
    hasChecked: false
  })
  
  const router = useRouter()
  const { accounts, loading: accountsLoading } = useAccounts()

  // Check onboarding status
  const checkStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))
      
      const status = await checkOnboardingStatus()
      
      setState({
        needsOnboarding: status.needsOnboarding,
        isLoading: false,
        accountCount: status.accountCount,
        hasChecked: true
      })

      return status
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasChecked: true
      }))
      return null
    }
  }, [])

  // Update state when accounts change
  useEffect(() => {
    if (!accountsLoading) {
      const accountCount = accounts.length
      const needsOnboarding = accountCount === 0

      setState(prev => ({
        ...prev,
        needsOnboarding,
        accountCount,
        isLoading: false,
        hasChecked: true
      }))
    }
  }, [accounts, accountsLoading])

  // Navigate to onboarding
  const startOnboarding = useCallback(() => {
    router.push('/onboarding')
  }, [router])

  // Navigate to dashboard
  const completeOnboarding = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  // Skip onboarding (for demo purposes)
  const skipOnboarding = useCallback(() => {
    localStorage.setItem('fiscus_skip_onboarding', 'true')
    setState(prev => ({ ...prev, needsOnboarding: false }))
  }, [])

  // Check if onboarding was skipped
  const isOnboardingSkipped = useCallback(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('fiscus_skip_onboarding') === 'true'
  }, [])

  return {
    ...state,
    checkStatus,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    isOnboardingSkipped,
    // Computed properties
    shouldShowOnboarding: state.needsOnboarding && state.hasChecked && !isOnboardingSkipped(),
    isReady: state.hasChecked && !state.isLoading
  }
}