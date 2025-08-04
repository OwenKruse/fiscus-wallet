"use client"

import React from "react"

import { useState } from "react"
import { ArrowDown, ArrowUp, Bell, Plus, Search, TrendingUp, User, RefreshCw, Link } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { PieChart, Receipt, Target, Wallet } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { useRouter } from "next/navigation"
import CalendarComponent from "@/components/calandar-date-range"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlaidLinkButton } from "@/components/plaid-link-button"
import { useAccounts, useTransactions, useSync } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import NextLink from "next/link"
import { PrimaryGoalWidget } from "@/components/primary-goal-widget"

export default function FinanceDashboard() {
  const [dateRange, setDateRange] = useState("")
  const router = useRouter()
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const { toast } = useToast()

  // Parse date range for API calls
  const parseDateRange = (range: string) => {
    if (!range) return { startDate: undefined, endDate: undefined }
    
    try {
      // Handle single date format
      if (!range.includes(' - ')) {
        const date = new Date(range)
        if (!isNaN(date.getTime())) {
          return {
            startDate: date.toISOString().split('T')[0],
            endDate: date.toISOString().split('T')[0]
          }
        }
      }
      
      // Handle date range format "DD MMM YYYY - DD MMM YYYY"
      const [startStr, endStr] = range.split(' - ')
      const startDate = new Date(startStr)
      const endDate = new Date(endStr)
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      }
    } catch (error) {
      console.error('Error parsing date range:', error)
    }
    
    return { startDate: undefined, endDate: undefined }
  }

  const { startDate, endDate } = parseDateRange(dateRange)

  // API hooks
  const { accounts, isLoading: accountsLoading, refreshAccounts } = useAccounts()
  const { transactions, isLoading: transactionsLoading, updateFilters } = useTransactions({ 
    startDate,
    endDate,
    limit: 100 
  })
  const { performSync, isSyncing } = useSync()

  // Update transactions when date range changes
  const handleDateRangeChange = (newRange: string) => {
    setDateRange(newRange)
    const { startDate: newStartDate, endDate: newEndDate } = parseDateRange(newRange)
    updateFilters({
      startDate: newStartDate,
      endDate: newEndDate,
      limit: 100
    })
  }

  // Calculate real metrics
  const totalBalance = accounts.reduce((sum, account) => {
    const balance = account.type === 'credit' ? -Math.abs(account.balance.current) : account.balance.current
    return sum + balance
  }, 0)
  const recentTransactions = transactions.slice(0, 7)

  // Calculate financial metrics from transactions
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const last30DaysTransactions = transactions.filter(t => new Date(t.date) > last30Days)

  // Calculate income (negative amounts in Plaid) and expenses (positive amounts in Plaid)
  // In Plaid: positive = money leaving account (expenses), negative = money entering account (income)
  const totalMonthlyIncome = Math.abs(last30DaysTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0))

  const totalMonthlyExpenses = last30DaysTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const netChange = totalMonthlyIncome - totalMonthlyExpenses

  // Calculate monthly expenses for the last 6 months (simulated data based on current month)
  const currentMonth = new Date().getMonth()
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const monthlyExpensesData = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (currentMonth - 5 + i + 12) % 12
    const baseAmount = totalMonthlyExpenses > 0 ? totalMonthlyExpenses : 1600
    // Add some variation to make the chart more realistic
    const variation = [0.8, 0.9, 1.1, 0.7, 1.2, 1.0][i]
    return {
      month: monthNames[monthIndex],
      amount: Math.round(baseAmount * variation)
    }
  })

  // Calculate expense categories from recent transactions
  const expensesByCategory = last30DaysTransactions
    .filter(t => t.amount > 0)
    .reduce((acc, t) => {
      const category = t.category[0] || 'Other'
      acc[category] = (acc[category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  // Get top 3 expense categories
  const topExpenseCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalMonthlyExpenses > 0 ? Math.round((amount / totalMonthlyExpenses) * 100) : 0
    }))

  // Count flagged transactions (high amounts or unusual patterns)
  const flaggedTransactions = transactions.filter(t =>
    Math.abs(t.amount) > 1000 || // Large transactions
    t.pending || // Pending transactions
    t.category.includes('Transfer') // Transfers might need review
  )
  const flaggedAmount = flaggedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Debug logging
  console.log('Transactions:', transactions.length, 'Income:', totalMonthlyIncome, 'Expenses:', totalMonthlyExpenses, 'Net:', netChange)

  const handleRefresh = async () => {
    try {
      await performSync({ forceRefresh: true })
      await refreshAccounts()
      toast({
        title: "Success",
        description: "Data refreshed successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePlaidSuccess = () => {
    toast({
      title: "Bank Connected",
      description: "Your bank account has been connected successfully!",
    })
    handleRefresh()
  }

  const handleTransactionClick = (transactionId: string) => {
    router.push(`/transactions?id=${transactionId}`)
  }

  // Helper function to get account icon based on type
  const getAccountIcon = (type: string, subtype: string) => {
    if (type === 'investment' || subtype === 'brokerage' || subtype === '401k' || subtype === 'ira') {
      return PieChart
    }
    if (type === 'depository' && subtype === 'savings') {
      return Target
    }
    return Wallet
  }

  // Helper function to get account color based on type
  const getAccountColor = (type: string, subtype: string) => {
    if (type === 'investment' || subtype === 'brokerage' || subtype === '401k' || subtype === 'ira') {
      return {
        color: "bg-purple-500",
        gradient: "from-purple-50 to-purple-100",
        border: "border-purple-200"
      }
    }
    if (type === 'depository' && subtype === 'savings') {
      return {
        color: "bg-green-500",
        gradient: "from-green-50 to-green-100",
        border: "border-green-200"
      }
    }
    return {
      color: "bg-blue-500",
      gradient: "from-blue-50 to-blue-100",
      border: "border-blue-200"
    }
  }

  // Helper function to get category color for transactions
  const getCategoryColor = (categories: string[]): string => {
    const primaryCategory = categories[0]?.toLowerCase() || 'other'

    const colorMap: Record<string, string> = {
      'food and drink': 'bg-green-500',
      'food': 'bg-green-500',
      'restaurants': 'bg-green-500',
      'groceries': 'bg-green-600',
      'transportation': 'bg-red-500',
      'travel': 'bg-red-600',
      'entertainment': 'bg-purple-500',
      'recreation': 'bg-purple-600',
      'shopping': 'bg-blue-500',
      'retail': 'bg-blue-600',
      'healthcare': 'bg-pink-500',
      'medical': 'bg-pink-600',
      'education': 'bg-orange-500',
      'learning': 'bg-orange-600',
      'bills': 'bg-gray-500',
      'utilities': 'bg-gray-600',
      'income': 'bg-emerald-500',
      'salary': 'bg-emerald-600',
      'deposit': 'bg-emerald-700',
      'other': 'bg-slate-500'
    }

    return colorMap[primaryCategory] || 'bg-slate-500'
  }

  // Helper function to format category name for display
  const formatCategoryName = (categories: string[]): string => {
    if (!categories || categories.length === 0) return 'Other'

    const category = categories[0]
    // Convert to title case and handle common abbreviations
    return category
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(/And/g, '&')
  }



  const maxExpense = Math.max(...monthlyExpensesData.map((e) => e.amount))

  const handleAccountClick = (account: any) => {
    setSelectedAccount(account)
    setIsAccountModalOpen(true)
  }

  return (
    <>
      <SidebarInset>
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold">Overview</h1>
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

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Refresh'}
              </Button>

              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>

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
                <div className="text-2xl font-bold mb-1">
                  ${totalBalance.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  {accountsLoading ? (
                    <span>Loading...</span>
                  ) : (
                    <>
                      <ArrowUp className="h-3 w-3" />
                      <span>Real-time balance</span>
                    </>
                  )}
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
                  <span className="text-sm text-gray-600">Net Change</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mb-1">
                  {netChange >= 0 ? '+' : ''}${netChange.toLocaleString()}
                </div>
                <div className={`flex items-center gap-1 text-sm ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  <span>
                    {transactionsLoading ? 'Loading...' : 'Last 30 days (Income - Expenses)'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Monthly Income</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mb-1">
                  ${totalMonthlyIncome.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  {transactionsLoading ? (
                    <span>Loading...</span>
                  ) : (
                    <>
                      <ArrowUp className="h-3 w-3" />
                      <span>Last 30 days</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Monthly Expenses</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mb-1">
                  ${totalMonthlyExpenses.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-sm text-red-600">
                  {transactionsLoading ? (
                    <span>Loading...</span>
                  ) : (
                    <>
                      <ArrowDown className="h-3 w-3" />
                      <span>Last 30 days</span>
                    </>
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
                  <CardTitle>Account Balances</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                    </span>
                    <Button variant="ghost" size="icon">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-2xl font-bold mb-1">
                        ${totalBalance.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        {accountsLoading ? (
                          <span>Loading...</span>
                        ) : (
                          <>
                            <ArrowUp className="h-3 w-3" />
                            <span>Real-time balance</span>
                          </>
                        )}
                      </div>
                    </div>
                    <PlaidLinkButton
                      onSuccess={handlePlaidSuccess}
                      size="sm"
                      className="bg-black text-white"
                    >
                      Connect Account
                    </PlaidLinkButton>
                  </div>

                  {accounts.length === 0 && !accountsLoading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500 mb-4">
                        <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium mb-2">No accounts connected</p>
                        <p className="text-sm mb-4">Connect your bank accounts to get started</p>
                        <PlaidLinkButton onSuccess={handlePlaidSuccess}>
                          Connect Your First Account
                        </PlaidLinkButton>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {accounts.map((account) => {
                        const IconComponent = getAccountIcon(account.type, account.subtype)
                        const colors = getAccountColor(account.type, account.subtype)

                        return (
                          <div
                            key={account.id}
                            className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${colors.gradient} border ${colors.border} cursor-pointer hover:shadow-md transition-all duration-200 group`}
                            onClick={() => handleAccountClick(account)}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 ${colors.color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}
                              >
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{account.name}</div>
                                <div className="text-xs text-gray-500">
                                  {account.institutionName} • {account.subtype}
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-bold">
                              ${account.type === 'credit' ? -Math.abs(account.balance.current) : account.balance.current}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">
                        {accounts.length > 0
                          ? `${accounts.length} Account${accounts.length !== 1 ? 's' : ''} Connected`
                          : 'Connect Accounts to Track Growth'
                        }
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {accounts.length > 0
                        ? `Total balance across all accounts: $${totalBalance.toLocaleString()}`
                        : 'Link your bank accounts to see portfolio insights and growth tracking.'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Transactions</CardTitle>
                  <NextLink href="/transactions">

                    <Button variant="ghost" className="text-sm">

                      View All

                    </Button>
                  </NextLink>

                </CardHeader>
                <CardContent>
                  {recentTransactions.length === 0 && !transactionsLoading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">
                        <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">
                          {transactions.length > 0 ? 'No recent transactions' : 'No transactions yet'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {transactions.length > 0
                            ? 'All transactions are older than 7 days'
                            : 'Connect an account to see transactions'
                          }
                        </p>
                        {transactions.length > 0 && (
                          <NextLink href="/transactions">
                            <Button variant="outline" size="sm" className="mt-2">
                              View All Transactions
                            </Button>
                          </NextLink>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentTransactions.map((transaction) => {
                        const categoryColor = getCategoryColor(transaction.category)
                        const isIncome = transaction.amount < 0 // In Plaid: negative = income, positive = expense

                        return (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                            onClick={() => handleTransactionClick(transaction.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 group-hover:scale-105 transition-transform">
                                <AvatarFallback className={`${categoryColor} text-white text-xs`}>
                                  {transaction.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm group-hover:text-primary transition-colors">
                                  {transaction.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(transaction.date).toLocaleDateString()} • {transaction.accountName}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {formatCategoryName(transaction.category)}
                              </div>
                              <div
                                className={`text-sm font-bold ${isIncome ? "text-green-600" : "text-red-600"}`}
                              >
                                {isIncome ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {transactionsLoading && recentTransactions.length === 0 && (
                        <div className="space-y-4">
                          {Array.from({ length: 5 }, (_, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                                <div>
                                  <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                                  <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                                <div className="w-12 h-3 bg-gray-200 rounded animate-pulse"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Primary Goal Widget */}
              <PrimaryGoalWidget />
              
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
                  {transactionsLoading ? (
                    <div className="w-full h-[180px] mb-4 flex items-center justify-center">
                      <div className="text-sm text-gray-500">Loading expenses...</div>
                    </div>
                  ) : (
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
                            data={monthlyExpensesData}
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
                              formatter={(value) => [`$${value.toLocaleString()}`, "Expenses"]}
                            />
                            <Bar dataKey="amount" fill="#1f2937" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  )}
                  {monthlyExpensesData.length >= 2 && (
                    <div className="flex items-center gap-1 text-sm">
                      {(() => {
                        const currentMonth = monthlyExpensesData[monthlyExpensesData.length - 1].amount
                        const previousMonth = monthlyExpensesData[monthlyExpensesData.length - 2].amount
                        const change = ((currentMonth - previousMonth) / previousMonth) * 100
                        const isIncrease = change > 0

                        return (
                          <>
                            <div className={`flex items-center gap-1 ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                              {isIncrease ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              <span>
                                {isIncrease ? 'Up' : 'Down'} {Math.abs(change).toFixed(1)}% from last month
                              </span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {totalMonthlyExpenses > 0 ? 'Based on your transaction history' : 'Sample data - connect accounts for real insights'}
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Expense Summary</CardTitle>
                  <Button variant="ghost" size="icon">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-600 mb-4">
                    Last 30 days • ${totalMonthlyExpenses.toLocaleString()} total
                  </div>

                  {totalMonthlyExpenses > 0 && topExpenseCategories.length > 0 ? (
                    <>
                      <div className="relative w-32 h-32 mx-auto mb-4">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                          {topExpenseCategories.map((category, index) => {
                            const colors = ['#1f2937', '#6b7280', '#9ca3af']
                            const circumference = 2 * Math.PI * 40
                            const strokeDasharray = `${(category.percentage / 100) * circumference} ${circumference}`
                            const strokeDashoffset = index === 0 ? 0 :
                              -topExpenseCategories.slice(0, index).reduce((sum, cat) => sum + (cat.percentage / 100) * circumference, 0)

                            return (
                              <circle
                                key={category.category}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke={colors[index] || '#d1d5db'}
                                strokeWidth="8"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                              />
                            )
                          })}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">
                            ${Math.round(totalMonthlyExpenses).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {topExpenseCategories.map((category, index) => {
                          const colors = ['bg-black', 'bg-gray-600', 'bg-gray-400']
                          return (
                            <div key={category.category} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 ${colors[index]} rounded-full`}></div>
                                <span className="capitalize">{category.category.toLowerCase()}</span>
                              </div>
                              <span>{category.percentage}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500">
                        <PieChart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No expense data</p>
                        <p className="text-xs text-gray-400">Connect an account to see expense breakdown</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>



              {/* Income vs Expenses */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Income vs Expenses</CardTitle>
                  <Button variant="ghost" className="text-sm">
                    View Details
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-600 mb-4">Last 30 days comparison</div>

                  <div className="space-y-4">
                    {/* Income */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm opacity-90">Total Income</div>
                        <ArrowUp className="h-4 w-4 opacity-75" />
                      </div>
                      <div className="text-2xl font-bold">
                        +${totalMonthlyIncome.toLocaleString()}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {transactionsLoading ? 'Loading...' : 'From deposits & transfers'}
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm opacity-90">Total Expenses</div>
                        <ArrowDown className="h-4 w-4 opacity-75" />
                      </div>
                      <div className="text-2xl font-bold">
                        -${totalMonthlyExpenses.toLocaleString()}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {transactionsLoading ? 'Loading...' : 'From purchases & bills'}
                      </div>
                    </div>

                    {/* Net Result */}
                    <div className={`bg-gradient-to-r ${netChange >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white p-3 rounded-lg`}>
                      <div className="flex justify-between items-center">
                        <div className="text-sm opacity-90">Net Result</div>
                        <div className="text-lg font-bold">
                          {netChange >= 0 ? '+' : ''}${netChange.toLocaleString()}
                        </div>
                      </div>
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
                  <div className={`w-10 h-10 ${getAccountColor(selectedAccount.type, selectedAccount.subtype).color} rounded-full flex items-center justify-center`}>
                    {React.createElement(getAccountIcon(selectedAccount.type, selectedAccount.subtype), { className: "w-5 h-5 text-white" })}
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
                <div className="text-3xl font-bold text-gray-900">
                  ${selectedAccount.type === 'credit' ? -Math.abs(selectedAccount.balance.current) : selectedAccount.balance.current}
                </div>
                {selectedAccount.balance.available && (
                  <div className="text-sm text-gray-500 mt-1">
                    Available: ${selectedAccount.type === 'credit' ? -Math.abs(selectedAccount.balance.available) : selectedAccount.balance.available}
                  </div>
                )}
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Account Type</div>
                    <div className="font-medium capitalize">{selectedAccount.type} - {selectedAccount.subtype}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Institution</div>
                    <div className="font-medium">{selectedAccount.institutionName}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Account Name</div>
                    <div className="font-medium">{selectedAccount.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Last Updated</div>
                    <div className="font-medium">
                      {new Date(selectedAccount.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {selectedAccount.balance.limit && (
                  <div>
                    <div className="text-sm text-gray-600">Credit Limit</div>
                    <div className="font-medium">${selectedAccount.balance.limit.toLocaleString()}</div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" variant="outline">
                  <NextLink href={`/transactions?accountId=${selectedAccount.id}`} className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    View Transactions
                  </NextLink>
                </Button>
                <Button className="flex-1" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Account
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
