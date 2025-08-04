"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { useAccounts } from "@/hooks/use-api"
import { Loader2 } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const { accounts, loading } = useAccounts()
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false)

  useEffect(() => {
    // If we have accounts, redirect to dashboard
    if (!loading && accounts.length > 0) {
      router.replace("/")
      return
    }

    // If no accounts and not loading, show onboarding
    if (!loading && accounts.length === 0) {
      setShouldShowOnboarding(true)
    }
  }, [accounts, loading, router])

  const handleOnboardingComplete = () => {
    router.push("/")
  }

  // Show loading while checking account status
  if (loading || !shouldShowOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    )
  }

  return <OnboardingFlow onComplete={handleOnboardingComplete} />
}