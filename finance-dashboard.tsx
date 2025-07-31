"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Bell, Calendar, Plus, Search, TrendingUp, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  BarChart3,
  CreditCard,
  DollarSign,
  Home,
  PieChart,
  Receipt,
  Settings,
  Target,
  Wallet,
  ChevronUp,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { useRouter } from "next/navigation"
import CalendarComponent from "@/components/calandar-date-range"

function AppSidebar() {
  const menuItems = [
    {
      title: "Overview",
      icon: Home,
      url: "#",
      isActive: true,
    },
    {
      title: "Analytics",
      icon: BarChart3,
      url: "#",
    },
    {
      title: "Transactions",
      icon: Receipt,
      url: "#",
    },
    {
      title: "Cards",
      icon: CreditCard,
      url: "#",
    },
    {
      title: "Wallet",
      icon: Wallet,
      url: "#",
    },
    {
      title: "Goals",
      icon: Target,
      url: "#",
    },
    {
      title: "Reports",
      icon: PieChart,
      url: "#",
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <DollarSign className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Wallet</span>
                  <span className="truncate text-xs">From Fisucs Financial</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#">
                    <Settings />
                    <span>Preferences</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User className="size-4" />
                  <span>John Doe</span>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem>
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default function FinanceDashboard() {
  const [dateRange, setDateRange] = useState("03 Jul 2025 - 30 Jul 2025")
  const router = useRouter()

  const handleTransactionClick = (transactionId: number) => {
    router.push(`/transactions?id=${transactionId}`)
  }

  const transactions = [
    {
      id: 1,
      name: "Samantha William",
      date: "30 April 2024, 10:15 AM",
      type: "Income",
      amount: 1640.2,
      color: "bg-pink-500",
    },
    {
      id: 2,
      name: "Grocery at Shop",
      date: "29 April 2024, 6:45 PM",
      type: "Expenses",
      amount: -172.64,
      color: "bg-green-500",
    },
    { id: 3, name: "Coffee", date: "21 April 2024, 8:30 AM", type: "Expenses", amount: -8.65, color: "bg-orange-500" },
    {
      id: 4,
      name: "Karen Smith",
      date: "10 April 2024, 3:50 PM",
      type: "Income",
      amount: 842.5,
      color: "bg-purple-500",
    },
    {
      id: 5,
      name: "Transportation",
      date: "2 April 2024, 5:20 PM",
      type: "Expenses",
      amount: -18.52,
      color: "bg-red-500",
    },
    {
      id: 6,
      name: "Online Course Purchase",
      date: "12 March 2024, 2:10 PM",
      type: "Expenses",
      amount: -120.0,
      color: "bg-blue-500",
    },
    {
      id: 7,
      name: "Freelance Project Payment",
      date: "5 March 2024, 11:00 AM",
      type: "Income",
      amount: 980.75,
      color: "bg-green-600",
    },
  ]

  const monthlyExpenses = [
    { month: "Jan", amount: 15000 },
    { month: "Feb", amount: 25000 },
    { month: "Mar", amount: 18000 },
    { month: "Apr", amount: 28000 },
    { month: "May", amount: 22000 },
    { month: "Jun", amount: 24000 },
  ]

  const maxExpense = Math.max(...monthlyExpenses.map((e) => e.amount))

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold">Finance Dashboard</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search..." className="pl-10 w-64" />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-1 rounded">
                  ⌘K
                </kbd>
              </div>

              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  1
                </span>
              </Button>

              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            
              <CalendarComponent dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">My Balance</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mb-1">$125,430</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  <span>12.5% compared to last month</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="bg-black text-white">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    Transfer
                  </Button>
                  <Button size="sm" variant="outline">
                    <ArrowDown className="h-3 w-3 mr-1" />
                    Request
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Net Profit</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mb-1">$38,700</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  <span>8.6% compared to last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Expenses</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mb-1">$26,450</div>
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <ArrowDown className="h-3 w-3" />
                  <span>5.6% compared to last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Pending Invoices</span>
                  <Badge variant="destructive" className="text-xs">
                    3 overdue invoices
                  </Badge>
                </div>
                <div className="text-2xl font-bold mb-1">$3,200</div>
                <div className="h-12 flex items-end gap-1 mt-4">
                  {Array.from({ length: 20 }, (_, i) => {
                    // Use deterministic heights based on index to avoid hydration mismatch
                    const heights = [45, 78, 23, 89, 56, 34, 67, 91, 12, 76, 43, 88, 29, 65, 82, 37, 71, 94, 18, 53];
                    return (
                      <div
                        key={i}
                        className="bg-gray-800 flex-1 rounded-sm"
                        style={{ height: `${heights[i]}%` }}
                      />
                    );
                  }
                )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Income Sources */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Income Sources</CardTitle>
                  <Button variant="ghost" size="icon">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">$92,000</div>
                  <div className="flex items-center gap-1 text-sm text-green-600 mb-6">
                    <ArrowUp className="h-3 w-3" />
                    <span>15.5% compared to last month</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-black rounded-full"></div>
                        <span className="text-sm">Rental</span>
                      </div>
                      <span className="text-sm font-medium">$35,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-black rounded-full"></div>
                        <span className="text-sm">Investments</span>
                      </div>
                      <span className="text-sm font-medium">$28,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm">Business</span>
                      </div>
                      <span className="text-sm font-medium">$18,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-sm">Freelance</span>
                      </div>
                      <span className="text-sm font-medium">$11,000</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>Passive income streams growing steadily.</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Automate your rental collection for better efficiency.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Transactions</CardTitle>
                  <Button variant="ghost" className="text-sm">
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => handleTransactionClick(transaction.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 group-hover:scale-105 transition-transform">
                            <AvatarFallback className={`${transaction.color} text-white text-xs`}>
                              {transaction.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm group-hover:text-primary transition-colors">
                              {transaction.name}
                            </div>
                            <div className="text-xs text-gray-500">{transaction.date}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{transaction.type}</div>
                          <div
                            className={`text-sm font-bold ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Monthly Expenses */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Monthly Expenses</CardTitle>
                    <p className="text-sm text-gray-600">Last 6 months</p>
                  </div>
                  <Button variant="ghost" className="text-sm">
                    View Report
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[180px] mb-4">
                    <ChartContainer
                      config={{
                        amount: {
                          label: "Amount",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyExpenses}
                          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                          barCategoryGap="20%"
                        >
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                          />
                          <YAxis hide />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            formatter={(value) => [`$${(value / 1000).toFixed(0)}k`, "Expenses"]}
                          />
                          <Bar dataKey="amount" fill="#1f2937" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span>Trending up by 5.2% this month</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Showing data from the last 6 months</div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Summary</CardTitle>
                  <Button variant="ghost" size="icon">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-600 mb-4">Data from 1-12 Apr, 2024</div>

                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#1f2937"
                        strokeWidth="8"
                        strokeDasharray="80 20"
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="8"
                        strokeDasharray="40 60"
                        strokeDashoffset="-80"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="8"
                        strokeDasharray="20 80"
                        strokeDashoffset="-120"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">$1,125</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-black rounded-full"></div>
                        <span>Food & Drinks</span>
                      </div>
                      <span>32%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                        <span>Shopping</span>
                      </div>
                      <span>13%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>Transport</span>
                      </div>
                      <span>7%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Saving Goal */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Saving Goal</CardTitle>
                  <Button variant="ghost" className="text-sm">
                    View Report
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 mb-2">75% Progress</div>
                  <div className="text-2xl font-bold mb-1">$1052.98</div>
                  <div className="text-sm text-gray-600 mb-4">of $1,200</div>
                  <Progress value={75} className="mb-4" />
                </CardContent>
              </Card>

              {/* My Wallet */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>My Wallet</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-600 mb-4">A total of 4 cards are listed</div>

                  <div className="space-y-4">
                    <div className="bg-green-500 text-white p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <div className="text-sm opacity-80">Credit Card</div>
                          <div className="text-lg font-bold">5375 **** **** 2368</div>
                        </div>
                        <div className="bg-white/20 px-2 py-1 rounded text-xs">VISA</div>
                      </div>
                      <div className="text-2xl font-bold">$5,325.57</div>
                    </div>

                    <div className="bg-blue-500 text-white p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <div className="text-sm opacity-80">Digital Card</div>
                          <div className="text-lg font-bold">5375 **** **** ****</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold">$10,892.43</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
