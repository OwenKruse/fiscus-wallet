"use client"

import { useState } from "react"
import {
    ArrowDown,
    ArrowUp,
    Bell,
    Search,
    TrendingUp,
    User,
    DollarSign,
    Target,
    CreditCard,
    PieChart,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart"
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    LineChart,
    Line,
    PieChart as RechartsPieChart,
    Cell,
    AreaChart,
    Area,
    Pie,
} from "recharts"
import CalendarComponent from "@/components/calandar-date-range"
import { AppSidebar } from "@/components/app-sidebar"

export default function AnalyticsPage() {
    const [dateRange, setDateRange] = useState("03 Jul 2025 - 30 Jul 2025")
    const [timeframe, setTimeframe] = useState("6months")

    // Sample data for charts with improved structure
    const monthlyData = [
        { month: "Jan", income: 45000, expenses: 32000, savings: 13000 },
        { month: "Feb", income: 52000, expenses: 38000, savings: 14000 },
        { month: "Mar", income: 48000, expenses: 35000, savings: 13000 },
        { month: "Apr", income: 61000, expenses: 42000, savings: 19000 },
        { month: "May", income: 55000, expenses: 39000, savings: 16000 },
        { month: "Jun", income: 58000, expenses: 41000, savings: 17000 },
    ]

    const categoryData = [
        { name: "Food & Dining", value: 2840, color: "#3b82f6", percentage: 32.1 },
        { name: "Shopping", value: 1920, color: "#10b981", percentage: 21.7 },
        { name: "Transportation", value: 1200, color: "#f59e0b", percentage: 13.6 },
        { name: "Entertainment", value: 980, color: "#ef4444", percentage: 11.1 },
        { name: "Bills & Utilities", value: 1560, color: "#8b5cf6", percentage: 17.6 },
        { name: "Healthcare", value: 720, color: "#06b6d4", percentage: 8.1 },
    ]

    const dailySpendingData = [
        { day: "Mon", amount: 245 },
        { day: "Tue", amount: 180 },
        { day: "Wed", amount: 320 },
        { day: "Thu", amount: 290 },
        { day: "Fri", amount: 410 },
        { day: "Sat", amount: 380 },
        { day: "Sun", amount: 220 },
    ]

    const balanceOverTime = [
        { date: "Jan 1", balance: 125430 },
        { date: "Jan 15", balance: 128900 },
        { date: "Feb 1", balance: 132100 },
        { date: "Feb 15", balance: 129800 },
        { date: "Mar 1", balance: 135200 },
        { date: "Mar 15", balance: 138600 },
        { date: "Apr 1", balance: 142300 },
    ]

    const budgetData = [
        { category: "Food", budgeted: 3000, spent: 2840, remaining: 160 },
        { category: "Shopping", budgeted: 2000, spent: 1920, remaining: 80 },
        { category: "Transport", budgeted: 1500, spent: 1200, remaining: 300 },
        { category: "Entertainment", budgeted: 1000, spent: 980, remaining: 20 },
        { category: "Bills", budgeted: 1800, spent: 1560, remaining: 240 },
    ]

    const incomeSourceData = [
        { name: "Salary", value: 45000, color: "#3b82f6" },
        { name: "Freelance", value: 8000, color: "#10b981" },
        { name: "Investments", value: 3500, color: "#8b5cf6" },
        { name: "Other", value: 1500, color: "#f59e0b" },
    ]

    // Custom label function for pie charts
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const RADIAN = Math.PI / 180
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5
        const x = cx + radius * Math.cos(-midAngle * RADIAN)
        const y = cy + radius * Math.sin(-midAngle * RADIAN)

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? "start" : "end"}
                dominantBaseline="central"
                fontSize="12"
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        )
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
                            <h1 className="text-xl font-semibold">Analytics</h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input placeholder="Search..." className="pl-10 w-64" />
                            </div>

                            <Select value={timeframe} onValueChange={setTimeframe}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1month">1 Month</SelectItem>
                                    <SelectItem value="3months">3 Months</SelectItem>
                                    <SelectItem value="6months">6 Months</SelectItem>
                                    <SelectItem value="1year">1 Year</SelectItem>
                                </SelectContent>
                            </Select>

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
                <div className="p-6 bg-gray-50 min-h-screen">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-blue-100">Total Balance</span>
                                    <DollarSign className="h-4 w-4 text-blue-200" />
                                </div>
                                <div className="text-2xl font-bold mb-1">$142,300</div>
                                <div className="flex items-center gap-1 text-sm text-blue-100">
                                    <ArrowUp className="h-3 w-3" />
                                    <span>13.4% from last month</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-green-100">Monthly Income</span>
                                    <TrendingUp className="h-4 w-4 text-green-200" />
                                </div>
                                <div className="text-2xl font-bold mb-1">$58,000</div>
                                <div className="flex items-center gap-1 text-sm text-green-100">
                                    <ArrowUp className="h-3 w-3" />
                                    <span>5.4% from last month</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-red-100">Monthly Expenses</span>
                                    <ArrowDown className="h-4 w-4 text-red-200" />
                                </div>
                                <div className="text-2xl font-bold mb-1">$41,000</div>
                                <div className="flex items-center gap-1 text-sm text-red-100">
                                    <ArrowUp className="h-3 w-3" />
                                    <span>2.1% from last month</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-purple-100">Savings Rate</span>
                                    <Target className="h-4 w-4 text-purple-200" />
                                </div>
                                <div className="text-2xl font-bold mb-1">29.3%</div>
                                <div className="flex items-center gap-1 text-sm text-purple-100">
                                    <ArrowUp className="h-3 w-3" />
                                    <span>1.2% from last month</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-4 bg-white">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="spending">Spending</TabsTrigger>
                            <TabsTrigger value="income">Income</TabsTrigger>
                            <TabsTrigger value="budget">Budget</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Income vs Expenses */}
                                <Card className="shadow-lg">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold">Income vs Expenses</CardTitle>
                                        <p className="text-sm text-gray-600">Monthly comparison over time</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer
                                            config={{
                                                income: {
                                                    label: "Income",
                                                    color: "#10b981",
                                                },
                                                expenses: {
                                                    label: "Expenses",
                                                    color: "#ef4444",
                                                },
                                            }}
                                            className="h-[300px]"
                                        >
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <XAxis
                                                        dataKey="month"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                                    />
                                                    <ChartTooltip
                                                        content={<ChartTooltipContent />}
                                                        formatter={(value: any) => [`$${value.toLocaleString()}`, ""]}
                                                    />
                                                    <ChartLegend content={<ChartLegendContent />} />
                                                    <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                {/* Balance Over Time */}
                                <Card className="shadow-lg">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold">Balance Trend</CardTitle>
                                        <p className="text-sm text-gray-600">Account balance over time</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer
                                            config={{
                                                balance: {
                                                    label: "Balance",
                                                    color: "#3b82f6",
                                                },
                                            }}
                                            className="h-[300px]"
                                        >
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={balanceOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <defs>
                                                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="date"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                                    />
                                                    <ChartTooltip
                                                        content={<ChartTooltipContent />}
                                                        formatter={(value: any) => [`$${value.toLocaleString()}`, "Balance"]}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="balance"
                                                        stroke="#3b82f6"
                                                        strokeWidth={3}
                                                        fill="url(#colorBalance)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Savings Progress */}
                            <Card className="shadow-lg">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg font-semibold">Monthly Savings</CardTitle>
                                    <p className="text-sm text-gray-600">Savings accumulation over time</p>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer
                                        config={{
                                            savings: {
                                                label: "Savings",
                                                color: "#10b981",
                                            },
                                        }}
                                        className="h-[250px]"
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <XAxis
                                                    dataKey="month"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                                />
                                                <ChartTooltip
                                                    content={<ChartTooltipContent />}
                                                    formatter={(value: any) => [`$${value.toLocaleString()}`, "Savings"]}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="savings"
                                                    stroke="#10b981"
                                                    strokeWidth={4}
                                                    dot={{ fill: "#10b981", strokeWidth: 2, r: 6 }}
                                                    activeDot={{ r: 8, stroke: "#10b981", strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="spending" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Spending by Category */}
                                <Card className="shadow-lg">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold">Spending by Category</CardTitle>
                                        <p className="text-sm text-gray-600">This month's expense breakdown</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer
                                            config={{
                                                food: { label: "Food & Dining", color: "#3b82f6" },
                                                shopping: { label: "Shopping", color: "#10b981" },
                                                transport: { label: "Transportation", color: "#f59e0b" },
                                                entertainment: { label: "Entertainment", color: "#ef4444" },
                                                bills: { label: "Bills & Utilities", color: "#8b5cf6" },
                                                healthcare: { label: "Healthcare", color: "#06b6d4" },
                                            }}
                                            className="h-[300px]"
                                        >
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie
                                                        data={categoryData}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        label={renderCustomizedLabel}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                    >
                                                        {categoryData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <ChartTooltip
                                                        content={<ChartTooltipContent />}
                                                        formatter={(value: any) => [`$${value.toLocaleString()}`, "Amount"]}
                                                    />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                        <div className="grid grid-cols-2 gap-3 mt-6">
                                            {categoryData.map((item, index) => (
                                                <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{item.name}</div>
                                                        <div className="text-xs text-gray-500">${item.value.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Daily Spending Pattern */}
                                <Card className="shadow-lg">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold">Daily Spending Pattern</CardTitle>
                                        <p className="text-sm text-gray-600">Average spending by day of week</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer
                                            config={{
                                                amount: {
                                                    label: "Amount",
                                                    color: "#8b5cf6",
                                                },
                                            }}
                                            className="h-[300px]"
                                        >
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={dailySpendingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <defs>
                                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="day"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                                        tickFormatter={(value) => `$${value}`}
                                                    />
                                                    <ChartTooltip
                                                        content={<ChartTooltipContent />}
                                                        formatter={(value: any) => [`$${value}`, "Spent"]}
                                                    />
                                                    <Bar dataKey="amount" fill="url(#colorAmount)" radius={[8, 8, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Top Spending Categories */}
                            <Card className="shadow-lg">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg font-semibold">Top Spending Categories</CardTitle>
                                    <p className="text-sm text-gray-600">Your highest expense categories this month</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {categoryData.slice(0, 5).map((category, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                                                        style={{ backgroundColor: category.color }}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{category.name}</div>
                                                        <div className="text-sm text-gray-500">{category.percentage}% of total</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-gray-900">${category.value.toLocaleString()}</div>
                                                    <div className="text-sm text-gray-500">this month</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="income" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Income Trend */}
                                <Card className="shadow-lg">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold">Income Trend</CardTitle>
                                        <p className="text-sm text-gray-600">Monthly income over time</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer
                                            config={{
                                                income: {
                                                    label: "Income",
                                                    color: "#10b981",
                                                },
                                            }}
                                            className="h-[300px]"
                                        >
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <defs>
                                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="month"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                                    />
                                                    <ChartTooltip
                                                        content={<ChartTooltipContent />}
                                                        formatter={(value: any) => [`$${value.toLocaleString()}`, "Income"]}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="income"
                                                        stroke="#10b981"
                                                        strokeWidth={3}
                                                        fill="url(#colorIncome)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                {/* Income Sources */}
                                <Card className="shadow-lg">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold">Income Sources</CardTitle>
                                        <p className="text-sm text-gray-600">Breakdown of income streams</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer
                                            config={{
                                                salary: { label: "Salary", color: "#3b82f6" },
                                                freelance: { label: "Freelance", color: "#10b981" },
                                                investments: { label: "Investments", color: "#8b5cf6" },
                                                other: { label: "Other", color: "#f59e0b" },
                                            }}
                                            className="h-[250px]"
                                        >
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie
                                                        data={incomeSourceData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {incomeSourceData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <ChartTooltip
                                                        content={<ChartTooltipContent />}
                                                        formatter={(value: any) => [`$${value.toLocaleString()}`, "Amount"]}
                                                    />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                        <div className="space-y-3 mt-4">
                                            {incomeSourceData.map((item, index) => {
                                                const total = incomeSourceData.reduce((sum, source) => sum + source.value, 0)
                                                const percentage = ((item.value / total) * 100).toFixed(1)
                                                return (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                            <span className="font-medium">{item.name}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold">${item.value.toLocaleString()}</div>
                                                            <div className="text-sm text-gray-500">{percentage}%</div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="budget" className="space-y-6">
                            {/* Budget Overview */}
                            <Card className="shadow-lg">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg font-semibold">Budget vs Actual Spending</CardTitle>
                                    <p className="text-sm text-gray-600">How you're tracking against your budget</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {budgetData.map((item, index) => {
                                            const percentage = (item.spent / item.budgeted) * 100
                                            const isOverBudget = item.spent > item.budgeted
                                            return (
                                                <div key={index} className="space-y-3 p-4 rounded-lg bg-gray-50">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-gray-900">{item.category}</span>
                                                        <span className="text-sm text-gray-600">
                                                            ${item.spent.toLocaleString()} / ${item.budgeted.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                        <div
                                                            className={`h-3 rounded-full transition-all duration-300 ${isOverBudget
                                                                ? "bg-gradient-to-r from-red-400 to-red-600"
                                                                : "bg-gradient-to-r from-green-400 to-green-600"
                                                                }`}
                                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className={isOverBudget ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                                            {isOverBudget
                                                                ? `$${Math.abs(item.remaining).toLocaleString()} over budget`
                                                                : `$${item.remaining.toLocaleString()} remaining`}
                                                        </span>
                                                        <span className="text-gray-500 font-medium">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Budget Performance */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-blue-100">Total Budget</span>
                                            <Target className="h-4 w-4 text-blue-200" />
                                        </div>
                                        <div className="text-2xl font-bold mb-1">$9,300</div>
                                        <div className="text-sm text-blue-100">This month</div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-green-100">Total Spent</span>
                                            <ArrowDown className="h-4 w-4 text-green-200" />
                                        </div>
                                        <div className="text-2xl font-bold mb-1">$8,500</div>
                                        <div className="flex items-center gap-1 text-sm text-green-100">
                                            <span>$800 under budget</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-purple-100">Budget Efficiency</span>
                                            <TrendingUp className="h-4 w-4 text-purple-200" />
                                        </div>
                                        <div className="text-2xl font-bold mb-1">91.4%</div>
                                        <div className="text-sm text-purple-100">Excellent control</div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
