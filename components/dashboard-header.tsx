"use client"

import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SearchTrigger } from "@/components/search/search-trigger"
import { useDashboard } from "@/contexts/dashboard-context"

interface DashboardHeaderProps {
  title: string
  children?: React.ReactNode
}

export function DashboardHeader({ title, children }: DashboardHeaderProps) {
  const { openSearch } = useDashboard()

  return (
    <header className="bg-white border-b px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-xl hidden lg:block font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <SearchTrigger 
              onOpen={openSearch}
              placeholder="Search..."
              className="w-64"
            />
          </div>

          {/* Mobile search trigger */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={openSearch}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              1
            </span>
          </Button>

          {children}
        </div>
      </div>
    </header>
  )
}