"use client"

import FinanceDashboard from "@/finance-dashboard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard"
import { PrivateRoute } from "@/components/protected-route"

export default function Page() {
  return (
    <PrivateRoute>
      <OnboardingGuard requiresAccounts={true}>
        <DashboardLayout>
          <FinanceDashboard />
        </DashboardLayout>
      </OnboardingGuard>
    </PrivateRoute>
  )
}
