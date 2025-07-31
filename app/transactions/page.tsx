"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, SortAsc, SortDesc } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

interface Transaction {
  id: number
  name: string
  date: string
  type: "Income" | "Expenses"
  amount: number
  color: string
  category: string
  description: string
  reference: string
}

const allTransactions: Transaction[] = [
  {
    id: 1,
    name: "Samantha William",
    date: "30 April 2024, 10:15 AM",
    type: "Income",
    amount: 1640.2,
    color: "bg-pink-500",
    category: "Freelance",
    description: "Web design project payment",
    reference: "INV-2024-001",
  },
  {
    id: 2,
    name: "Grocery at Shop",
    date: "29 April 2024, 6:45 PM",
    type: "Expenses",
    amount: -172.64,
    color: "bg-green-500",
    category: "Food & Drinks",
    description: "Weekly grocery shopping",
    reference: "TXN-2024-002",
  },
  {
    id: 3,
    name: "Coffee",
    date: "21 April 2024, 8:30 AM",
    type: "Expenses",
    amount: -8.65,
    color: "bg-orange-500",
    category: "Food & Drinks",
    description: "Morning coffee at Starbucks",
    reference: "TXN-2024-003",
  },
  {
    id: 4,
    name: "Karen Smith",
    date: "10 April 2024, 3:50 PM",
    type: "Income",
    amount: 842.5,
    color: "bg-purple-500",
    category: "Consulting",
    description: "Business consultation fee",
    reference: "INV-2024-004",
  },
  {
    id: 5,
    name: "Transportation",
    date: "2 April 2024, 5:20 PM",
    type: "Expenses",
    amount: -18.52,
    color: "bg-red-500",
    category: "Transport",
    description: "Uber ride to downtown",
    reference: "TXN-2024-005",
  },
  {
    id: 6,
    name: "Online Course Purchase",
    date: "12 March 2024, 2:10 PM",
    type: "Expenses",
    amount: -120.0,
    color: "bg-blue-500",
    category: "Education",
    description: "React Advanced Course",
    reference: "TXN-2024-006",
  },
  {
    id: 7,
    name: "Freelance Project Payment",
    date: "5 March 2024, 11:00 AM",
    type: "Income",
    amount: 980.75,
    color: "bg-green-600",
    category: "Freelance",
    description: "Mobile app development",
    reference: "INV-2024-007",
  },
  {
    id: 8,
    name: "Netflix Subscription",
    date: "1 March 2024, 9:00 AM",
    type: "Expenses",
    amount: -15.99,
    color: "bg-red-600",
    category: "Entertainment",
    description: "Monthly streaming subscription",
    reference: "TXN-2024-008",
  },
  {
    id: 9,
    name: "Salary Deposit",
    date: "28 February 2024, 12:00 PM",
    type: "Income",
    amount: 3500.0,
    color: "bg-blue-600",
    category: "Salary",
    description: "Monthly salary payment",
    reference: "SAL-2024-002",
  },
  {
    id: 10,
    name: "Gas Station",
    date: "25 February 2024, 4:30 PM",
    type: "Expenses",
    amount: -45.2,
    color: "bg-yellow-500",
    category: "Transport",
    description: "Fuel for car",
    reference: "TXN-2024-010",
  },
]

function TransactionDetail({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className={`${transaction.color} text-white`}>{transaction.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-lg">{transaction.name}</h3>
          <p className="text-sm text-gray-500">{transaction.date}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Amount</label>
          <p className={`text-2xl font-bold ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}>
            {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Type</label>
          <Badge variant={transaction.type === "Income" ? "default" : "secondary"} className="mt-1">
            {transaction.type}
          </Badge>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">Category</label>
        <p className="text-sm mt-1">{transaction.category}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">Description</label>
        <p className="text-sm mt-1">{transaction.description}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500">Reference</label>
        <p className="text-sm mt-1 font-mono">{transaction.reference}</p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1 bg-transparent">
          Edit Transaction
        </Button>
        <Button variant="destructive" className="flex-1">
          Delete
        </Button>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  const [transactions, setTransactions] = useState<Transaction[]>(allTransactions)
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(allTransactions)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterType, setFilterType] = useState<"all" | "Income" | "Expenses">("all")
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Handle URL parameter for opening specific transaction
  useEffect(() => {
    const transactionId = searchParams.get("id")
    if (transactionId) {
      const transaction = allTransactions.find((t) => t.id === Number.parseInt(transactionId))
      if (transaction) {
        setSelectedTransaction(transaction)
        setIsDetailOpen(true)
      }
    }
  }, [searchParams])

  // Filter and sort transactions
  useEffect(() => {
    const filtered = transactions.filter((transaction) => {
      const matchesSearch =
        transaction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === "all" || transaction.type === filterType
      return matchesSearch && matchesType
    })

    filtered.sort((a, b) => {
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

    setFilteredTransactions(filtered)
  }, [transactions, searchQuery, sortBy, sortOrder, filterType])

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold">Transactions</h1>
            </div>
          </div>
        </header>

        <div className="p-6 bg-gray-50 min-h-screen">
          {/* Filters and Search */}
          <Card className="mb-6">
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

                <Select value={filterType} onValueChange={(value: "all" | "Income" | "Expenses") => setFilterType(value)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Income">Income</SelectItem>
                    <SelectItem value="Expenses">Expenses</SelectItem>
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
              <CardTitle>All Transactions ({filteredTransactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group border border-transparent hover:border-gray-200"
                    onClick={() => handleTransactionClick(transaction)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 group-hover:scale-105 transition-transform">
                        <AvatarFallback className={`${transaction.color} text-white`}>
                          {transaction.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium group-hover:text-primary transition-colors">{transaction.name}</div>
                        <div className="text-sm text-gray-500">{transaction.category}</div>
                        <div className="text-xs text-gray-400">{transaction.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                        {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                      <Badge variant={transaction.type === "Income" ? "default" : "secondary"} className="text-xs">
                        {transaction.type}
                      </Badge>
                    </div>
                  </div>
                ))}

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No transactions found matching your criteria.</div>
                )}
              </div>
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
    </SidebarProvider>
  )
}
