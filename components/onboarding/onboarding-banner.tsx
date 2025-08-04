"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Wallet, ArrowRight } from "lucide-react"
import { PlaidLinkButton } from "@/components/plaid-link-button"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useToast } from "@/hooks/use-toast"

interface OnboardingBannerProps {
  className?: string
  dismissible?: boolean
}

export function OnboardingBanner({ className = "", dismissible = true }: OnboardingBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const { needsOnboarding, accountCount, startOnboarding } = useOnboarding()
  const { toast } = useToast()

  const handlePlaidSuccess = () => {
    toast({
      title: "Account Connected!",
      description: "Your bank account has been successfully connected.",
    })
    setIsDismissed(true)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  // Don't show banner if dismissed or user doesn't need onboarding
  if (isDismissed || !needsOnboarding) {
    return null
  }

  return (
    <Card className={`border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Get Started with Fiscus</h3>
              <p className="text-sm text-blue-700">
                Connect your bank account to start tracking your finances and get personalized insights.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startOnboarding}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            
            <PlaidLinkButton
              onSuccess={handlePlaidSuccess}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Connect Account
            </PlaidLinkButton>
            
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-blue-600 hover:bg-blue-100"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}