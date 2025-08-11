"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, SortAsc, SortDesc, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardHeader } from "@/components/dashboard-header"
import { PlaidLinkButton } from "@/components/plaid-link-button"
import { useTransactions, useAccounts, useSync } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"

interface Transaction {
  id: string
  accountId: string
  amount: number
  date: string
  name: string
  merchantName?: string
  category: string[]
  subcategory?: string
  pending: boolean
  accountName: string
}

// Helper function to get category color
function getCategoryColor(categories: string[]): string {
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

// Helper function to format transaction date
function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function TransactionDetail({ transaction }: { transaction: Transaction; onClose: () => void }) {
  const categoryColor = getCategoryColor(transaction.category)
  const isIncome = transaction.amount < 0 // In Plaid: negative = income, positive = expense
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className={`${categoryColor} text-white`}>
            {transaction.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-lg">{transaction.name}</h3>
          <p className="text-sm text-gray-500">{formatTransactionDate(transaction.date)}</p>
          {transaction.merchantName && (
            <p className="text-xs text-gray-400">{transaction.merchantName}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Amount</label>
          <p className={`text-2xl font-bold ${isIncome ? "text-green-600" : "text-red-600"}`}>
            {isIncome ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Status</label>
          <Badge variant={transaction.pending ? "secondary" : "default"} className="mt-1">
            {transaction.pending ? "Pending" : "Completed"}
          </Badge>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">Account</label>
        <p className="text-sm mt-1">{transaction.accountName}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">Category</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {transaction.category.map((cat, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {transaction.subcategory && (
        <div>
          <label className="text-sm font-medium text-gray-500">Subcategory</label>
          <p className="text-sm mt-1">{transaction.subcategory}</p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-500">Transaction ID</label>
        <p className="text-sm mt-1 font-mono text-gray-600">{transaction.id}</p>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const { toast } = useToast()

  // API hooks
  const { 
    transactions, 
    isLoading: transactionsLoading, 
    error: transactionsError,
    updateFilters,
    loadMore,
    hasMore,
    pagination
  } = useTransactions()
  
  const { accounts } = useAccounts()
  const { performSync, isSyncing } = useSync()

  // Local state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterType, setFilterType] = useState<"all" | "income" | "expenses">("all")
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Infinite scroll refs
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Handle URL parameter for opening specific transaction
  useEffect(() => {
    const transactionId = searchParams.get("id")
    if (transactionId) {
      const transaction = transactions.find((t) => t.id === transactionId)
      if (transaction) {
        setSelectedTransaction(transaction)
        setIsDetailOpen(true)
      }
    }
  }, [searchParams, transactions])

  // Memoize filters to prevent unnecessary re-renders
  const currentFilters = useMemo(() => {
    const filters: any = {}
    
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim()
    }
    
    if (selectedAccount !== "all") {
      filters.accountIds = [selectedAccount]
    }
    
    if (filterType === "income") {
      filters.maxAmount = -0.01 // In Plaid: negative amounts are income
    } else if (filterType === "expenses") {
      filters.minAmount = 0.01 // In Plaid: positive amounts are expenses
    }
    
    return filters
  }, [searchQuery, selectedAccount, filterType])

  // Update filters when they change
  useEffect(() => {
    console.log('Updating filters:', currentFilters) // Debug log
    updateFilters(currentFilters)
  }, [currentFilters, updateFilters])

  // Infinite scroll setup
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !transactionsLoading) {
          console.log('Intersection detected, loading more transactions...') // Debug log
          loadMore()
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    )

    observerRef.current = observer

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, transactionsLoading, loadMore]) // Remove currentFilters from dependencies

  // Sort transactions locally (since API doesn't support all sort options)
  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case "date":
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
      case "amount":
        comparison = Math.abs(a.amount) - Math.abs(b.amount)
        break
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
    }
    return sortOrder === "asc" ? comparison : -comparison
  })

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setSelectedTransaction(null)
    // Remove transaction ID from URL
    router.push("/transactions")
  }

  const toggleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const handleRefresh = async () => {
    try {
      await performSync({ forceRefresh: true })
      toast({
        title: "Success",
        description: "Transactions refreshed successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh transactions. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePlaidSuccess = () => {
    toast({
      title: "Bank Connected",
      description: "Your bank account has been connected successfully!",
    })
    // Refresh transactions after successful connection
    handleRefresh()
  }

  return (
      <DashboardLayout>
        <SidebarInset className="flex flex-col h-full w-full">
        {/* Header */}
        <DashboardHeader title="Transactions">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4  ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          <PlaidLinkButton 
            onSuccess={handlePlaidSuccess}
            variant="default"
            size="sm"
          >
            Connect
          </PlaidLinkButton>
        </DashboardHeader>

        <div className="flex-1 p-4 sm:p-6 bg-gray-50 overflow-auto">
          {/* Filters and Search */}
          <Card className="mb-6 w-full">
            <CardHeader>
              <CardTitle>Filter & Sort</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={(value: "all" | "income" | "expenses") => setFilterType(value)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expenses">Expenses</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: "date" | "amount" | "name") => setSortBy(value)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={toggleSort} className="w-full md:w-auto bg-transparent">
                  {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  <span className="ml-2">{sortOrder === "asc" ? "Ascending" : "Descending"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle>
                All Transactions ({pagination?.total || sortedTransactions.length})
                {transactionsLoading && <span className="text-sm font-normal text-gray-500 ml-2">Loading...</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{transactionsError}</p>
                </div>
              )}
              
              {sortedTransactions.length === 0 && !transactionsLoading ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">
                    {accounts.length === 0 ? (
                      <>
                        <p className="text-lg font-medium mb-2">No bank accounts connected</p>
                        <p className="text-sm mb-4">Connect your bank account to start tracking transactions</p>
                        <PlaidLinkButton onSuccess={handlePlaidSuccess}>
                          Connect Your First Bank Account
                        </PlaidLinkButton>
                      </>
                    ) : (
                      <p>No transactions found matching your criteria.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto overflow-x-hidden">
                  {sortedTransactions.map((transaction) => {
                    const categoryColor = getCategoryColor(transaction.category)
                    const isIncome = transaction.amount < 0 // In Plaid: negative = income, positive = expense
                    
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group border border-transparent hover:border-gray-200"
                        onClick={() => handleTransactionClick(transaction)}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          <Avatar className="h-10 w-10 group-hover:scale-105 transition-transform flex-shrink-0">
                            <AvatarFallback className={`${categoryColor} text-white`}>
                              {transaction.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium group-hover:text-primary transition-colors truncate">
                              {transaction.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {transaction.category[0] || 'Other'} • {transaction.accountName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatTransactionDate(transaction.date)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-lg font-bold ${isIncome ? "text-green-600" : "text-red-600"}`}>
                            {isIncome ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <Badge variant={transaction.pending ? "secondary" : "default"} className="text-xs">
                              {transaction.pending ? "Pending" : "Completed"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Infinite scroll trigger */}
                  {hasMore && (
                    <div 
                      ref={loadMoreRef}
                      className="flex justify-center py-4"
                    >
                      {transactionsLoading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Loading more transactions...</span>
                        </div>
                      ) : (
                        <div className="h-4" /> // Invisible trigger element
                      )}
                    </div>
                  )}
                  
                  {/* End of transactions indicator */}
                  {!hasMore && sortedTransactions.length > 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      You've reached the end of your transactions
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Mobile Modal */}
      {isMobile && (
        <Dialog open={isDetailOpen} onOpenChange={handleCloseDetail}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            {selectedTransaction && <TransactionDetail transaction={selectedTransaction} onClose={handleCloseDetail} />}
          </DialogContent>
        </Dialog>
      )}

      {/* Desktop Sheet */}
      {!isMobile && (
        <Sheet open={isDetailOpen} onOpenChange={handleCloseDetail}>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Transaction Details</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {selectedTransaction && (
                <TransactionDetail transaction={selectedTransaction} onClose={handleCloseDetail} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </DashboardLayout>
  )
}
