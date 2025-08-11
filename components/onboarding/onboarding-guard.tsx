"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAccounts } from "@/hooks/use-api"
import { Loader2, Wallet } from "lucide-react"

interface OnboardingGuardProps {
  children: React.ReactNode
  requiresAccounts?: boolean
  fallback?: React.ReactNode
}

export function OnboardingGuard({ 
  children, 
  requiresAccounts = true,
  fallback 
}: OnboardingGuardProps) {
  const router = useRouter()
  const { accounts, loading: accountsLoading, error } = useAccounts()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Only check once when accounts data is loaded
    if (!accountsLoading && !hasChecked) {
      setHasChecked(true)
      
      // If accounts are required and user has no accounts, redirect to onboarding
      if (requiresAccounts && accounts.length === 0 && !error) {
        router.replace('/onboarding')
        return
      }
    }
  }, [accountsLoading, accounts.length, requiresAccounts, hasChecked, router, error])

  // Show loading while checking account status
  if (accountsLoading || !hasChecked) {
    return <>{children}</>
  }

  // If there's an error, show the children anyway (let the app handle the error)
  if (error) {
    return <>{children}</>
  }

  // If accounts are required but user has no accounts, show loading during redirect
  if (requiresAccounts && accounts.length === 0) {
    return fallback || <OnboardingLoadingFallback />
  }

  return <>{children}</>
}

function OnboardingLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-blue-600" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Setting up your account</h2>
        <p className="text-gray-600">Please wait while we check your account status...</p>
      </div>
    </div>
  )
}