"use client"

import React from "react"

import { useState } from "react"
import { ArrowDown, ArrowUp, Bell, Plus, Search, TrendingUp, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { PieChart, Receipt, Target, Wallet } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { useRouter } from "next/navigation"
import CalendarComponent from "@/components/calandar-date-range"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {AppSidebar} from "@/components/app-sidebar" // Import AppSidebar component

export default function FinanceDashboard() {
  const [dateRange, setDateRange] = useState("03 Jul 2025 - 30 Jul 2025")
  const router = useRouter()
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

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

  const accounts = [
    {
      id: 1,
      name: "Checking Account",
      type: "Checking",
      balance: 45230,
      accountNumber: "**** 2368",
      fullAccountNumber: "1234 5678 9012 2368",
      routingNumber: "021000021",
      bank: "Fiscus Financial",
      openedDate: "January 15, 2020",
      interestRate: "0.05%",
      icon: Wallet,
      color: "bg-blue-500",
      gradient: "from-blue-50 to-blue-100",
      border: "border-blue-200",
    },
    {
      id: 2,
      name: "Savings Account",
      type: "Savings",
      balance: 52800,
      accountNumber: "**** 7891",
      fullAccountNumber: "1234 5678 9012 7891",
      routingNumber: "021000021",
      bank: "Fiscus Financial",
      openedDate: "March 22, 2020",
      interestRate: "2.15%",
      icon: Target,
      color: "bg-green-500",
      gradient: "from-green-50 to-green-100",
      border: "border-green-200",
    },
    {
      id: 3,
      name: "Investment Account",
      type: "Investment",
      balance: 27400,
      accountNumber: "**** 4567",
      fullAccountNumber: "1234 5678 9012 4567",
      routingNumber: "021000021",
      bank: "Fiscus Financial",
      openedDate: "June 10, 2021",
      interestRate: "Variable",
      icon: PieChart,
      color: "bg-purple-500",
      gradient: "from-purple-50 to-purple-100",
      border: "border-purple-200",
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

  const handleAccountClick = (account) => {
    setSelectedAccount(account)
    setIsAccountModalOpen(true)
  }

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
                    const heights = [45, 78, 23, 89, 56, 34, 67, 91, 12, 76, 43, 88, 29, 65, 82, 37, 71, 94, 18, 53]
                    return (
                      <div key={i} className="bg-gray-800 flex-1 rounded-sm" style={{ height: `${heights[i]}%` }} />
                    )
                  })}
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
                  <CardTitle>Account Balances</CardTitle>
                  <Button variant="ghost" size="icon">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-2xl font-bold mb-1">$125,430</div>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <ArrowUp className="h-3 w-3" />
                        <span>12.5% compared to last month</span>
                      </div>
                    </div>
                    <Button size="sm" className="bg-black text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {accounts.map((account) => {
                      const IconComponent = account.icon
                      return (
                        <div
                          key={account.id}
                          className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${account.gradient} border ${account.border} cursor-pointer hover:shadow-md transition-all duration-200 group`}
                          onClick={() => handleAccountClick(account)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 ${account.color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}
                            >
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{account.name}</div>
                              <div className="text-xs text-gray-500">{account.accountNumber}</div>
                            </div>
                          </div>
                          <span className="text-sm font-bold">${account.balance.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Total Portfolio Growth: +8.2%</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Your accounts are performing well this quarter.</div>
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
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedAccount && (
                <>
                  <div className={`w-10 h-10 ${selectedAccount.color} rounded-full flex items-center justify-center`}>
                    {React.createElement(selectedAccount.icon, { className: "w-5 h-5 text-white" })}
                  </div>
                  {selectedAccount.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-6">
              {/* Account Balance */}
              <div className="text-center p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Current Balance</div>
                <div className="text-3xl font-bold text-gray-900">${selectedAccount.balance.toLocaleString()}</div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Account Type</div>
                    <div className="text-sm text-gray-900">{selectedAccount.type}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Bank</div>
                    <div className="text-sm text-gray-900">{selectedAccount.bank}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Account Number</div>
                    <div className="text-sm text-gray-900 font-mono">{selectedAccount.fullAccountNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Routing Number</div>
                    <div className="text-sm text-gray-900 font-mono">{selectedAccount.routingNumber}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Opened Date</div>
                    <div className="text-sm text-gray-900">{selectedAccount.openedDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Interest Rate</div>
                    <div className="text-sm text-gray-900">{selectedAccount.interestRate}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button className="flex-1 bg-transparent" variant="outline">
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Transfer
                </Button>
                <Button className="flex-1 bg-transparent" variant="outline">
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Deposit
                </Button>
                <Button className="flex-1 bg-transparent" variant="outline">
                  <Receipt className="h-4 w-4 mr-2" />
                  Statements
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
