"use client"

import { useState } from "react"
import { AppSidebar } from "./app-sidebar"
import { PrivateRoute } from "./protected-route"
import { SidebarProvider } from "@/components/ui/sidebar"
import { SearchProvider } from "@/contexts/search-context"
import { GlobalSearchCommand } from "@/components/search/global-search-command"
import { DashboardProvider } from "@/contexts/dashboard-context"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  const openSearch = () => setSearchOpen(true)

  return (
    <PrivateRoute>
      <SearchProvider>
        <SidebarProvider>
          <DashboardProvider openSearch={openSearch}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
              <GlobalSearchCommand 
                open={searchOpen} 
                onOpenChange={setSearchOpen} 
              />
            </div>
          </DashboardProvider>
        </SidebarProvider>
      </SearchProvider>
    </PrivateRoute>
  )
} 