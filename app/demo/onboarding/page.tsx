"use client"

import { useState } from "react"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"

export default function OnboardingDemoPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const router = useRouter()

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    setShowBanner(false)
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Onboarding Demo</h1>
            <p className="text-gray-600">Preview the onboarding experience</p>
          </div>
        </div>

        {/* Demo Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Demo Controls</CardTitle>
            <CardDescription>
              Test different onboarding scenarios and components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowOnboarding(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Full Onboarding Flow
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowBanner(!showBanner)}
              >
                {showBanner ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showBanner ? 'Hide' : 'Show'} Banner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Banner Demo */}
        {showBanner && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Onboarding Banner</h2>
            <OnboardingBanner />
          </div>
        )}

        {/* Feature Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Multi-step flow</span>
                  <Badge variant="default">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progress tracking</span>
                  <Badge variant="default">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Plaid integration</span>
                  <Badge variant="default">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Responsive design</span>
                  <Badge variant="default">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Error handling</span>
                  <Badge variant="default">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Middleware routing</span>
                  <Badge variant="default">✓</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Implementation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Components:</strong>
                  <ul className="mt-1 ml-4 list-disc text-gray-600">
                    <li>OnboardingFlow - Main flow component</li>
                    <li>OnboardingGuard - Route protection</li>
                    <li>OnboardingBanner - Inline promotion</li>
                  </ul>
                </div>
                <div>
                  <strong>Middleware:</strong>
                  <ul className="mt-1 ml-4 list-disc text-gray-600">
                    <li>Automatic routing based on account status</li>
                    <li>Skip paths for auth and API routes</li>
                  </ul>
                </div>
                <div>
                  <strong>API Integration:</strong>
                  <ul className="mt-1 ml-4 list-disc text-gray-600">
                    <li>Real-time account status checking</li>
                    <li>Plaid Link integration</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Examples */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
            <CardDescription>
              How the onboarding system works in different scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">New User (No Accounts)</h4>
                <p className="text-sm text-blue-800">
                  User is automatically redirected to /onboarding when accessing any protected route.
                  They must complete the flow to access the main application.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Existing User (Has Accounts)</h4>
                <p className="text-sm text-green-800">
                  User can access all routes normally. If they visit /onboarding, they're redirected to the dashboard.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Investment Page (Optional Accounts)</h4>
                <p className="text-sm text-yellow-800">
                  Shows onboarding banner if no accounts are connected, but doesn't force the flow.
                  Users can still browse the page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}