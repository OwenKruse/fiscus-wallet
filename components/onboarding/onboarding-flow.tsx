"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, ArrowRight, Wallet, Shield, Zap, TrendingUp } from "lucide-react"
import { PlaidLinkButton } from "@/components/plaid-link-button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface OnboardingFlowProps {
  onComplete?: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const { toast } = useToast()
  const router = useRouter()

  const steps = [
    {
      id: 1,
      title: "Welcome to Fiscus",
      description: "Let's get your financial dashboard set up in just a few steps",
      component: WelcomeStep
    },
    {
      id: 2,
      title: "Connect Your Bank Account",
      description: "Securely link your bank account to start tracking your finances",
      component: ConnectAccountStep
    },
    {
      id: 3,
      title: "You're All Set!",
      description: "Your account is connected and ready to use",
      component: CompletionStep
    }
  ]

  const currentStepData = steps.find(step => step.id === currentStep)
  const progress = (currentStep / steps.length) * 100

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCompletedSteps(prev => [...prev, currentStep])
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePlaidSuccess = () => {
    toast({
      title: "Account Connected!",
      description: "Your bank account has been successfully connected.",
    })
    handleNext()
  }

  const handleComplete = () => {
    onComplete?.()
    router.push("/")
  }

  if (!currentStepData) return null

  const StepComponent = currentStepData.component

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Fiscus</h1>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Step {currentStep} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
            <CardDescription className="text-lg">
              {currentStepData.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StepComponent
              onNext={handleNext}
              onPlaidSuccess={handlePlaidSuccess}
              onComplete={handleComplete}
              isCompleted={completedSteps.includes(currentStep)}
            />
          </CardContent>
        </Card>

        {/* Step Indicators */}
        <div className="flex justify-center mt-8 space-x-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${completedSteps.includes(step.id)
                ? "bg-green-500 border-green-500 text-white"
                : step.id === currentStep
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-400"
                }`}
            >
              {completedSteps.includes(step.id) ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="text-sm font-medium">{step.id}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const features = [
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "Your data is protected with 256-bit encryption and never stored on our servers"
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Get instant notifications and updates on your account balances and transactions"
    },
    {
      icon: TrendingUp,
      title: "Smart Analytics",
      description: "Understand your spending patterns with intelligent categorization and insights"
    }
  ]

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Take Control of Your Finances</h3>
        <p className="text-gray-600">
          Fiscus helps you track, analyze, and optimize your financial health with powerful tools and insights.
        </p>
      </div>

      <div className="grid gap-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <feature.icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{feature.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4">
        <Button onClick={onNext} size="lg" className="w-full">
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

function ConnectAccountStep({ onPlaidSuccess }: { onPlaidSuccess: () => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Connect Your Bank Account</h3>
        <p className="text-gray-600">
          We use Plaid's secure technology to connect to your bank. Your login credentials are never stored or shared.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">What happens next:</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            You'll be redirected to your bank's secure login page
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            Enter your online banking credentials
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            Select which accounts you'd like to connect
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            Your transactions and balances will sync automatically
          </li>
        </ul>
      </div>

      <div className="text-center">
        <PlaidLinkButton
          onSuccess={onPlaidSuccess}
          size="lg"
          className="w-full"
        >
          Connect Bank Account Securely
        </PlaidLinkButton>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Powered by Plaid • Used by millions of people • Bank-level security
        </p>
      </div>
    </div>
  )
}

function CompletionStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-8 text-center">
      <div>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">You're All Set!</h3>
        <p className="text-gray-600">
          Your bank account has been successfully connected. You can now start tracking your finances.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h4 className="font-semibold text-green-900 mb-3">What you can do now:</h4>
        <ul className="space-y-2 text-sm text-green-800">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            View your account balances and transaction history
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Analyze your spending patterns and trends
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Set up budgets and financial goals
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Connect additional accounts anytime
          </li>
        </ul>
      </div>

      <Button onClick={onComplete} size="lg" className="w-full">
        Go to Dashboard
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )
}