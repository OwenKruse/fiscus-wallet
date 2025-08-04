"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import FinanceDashboard from "../../finance-dashboard"

// Temporary bypass page to access the dashboard without onboarding checks
export default function BypassPage() {
  return (
    <DashboardLayout>
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
        <p className="text-yellow-800 text-sm">
          <strong>Bypass Mode:</strong> This page bypasses onboarding checks for development purposes.
        </p>
      </div>
      <FinanceDashboard />
    </DashboardLayout>
  )
}