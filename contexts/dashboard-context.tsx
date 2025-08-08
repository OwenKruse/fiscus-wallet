"use client"

import { createContext, useContext } from "react"

interface DashboardContextType {
  openSearch: () => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

interface DashboardProviderProps {
  children: React.ReactNode
  openSearch: () => void
}

export function DashboardProvider({ children, openSearch }: DashboardProviderProps) {
  return (
    <DashboardContext.Provider value={{ openSearch }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}