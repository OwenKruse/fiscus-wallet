"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Target,
    PiggyBank,
    TrendingUp,
    Car,
    GraduationCap,
    Plane,
    Plus,
    Calendar,
    DollarSign,
    CheckCircle,
    Clock,
    AlertCircle,
    Search,
    Bell,
    User,
} from "lucide-react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import CalendarComponent from "@/components/calandar-date-range"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardHeader } from "@/components/dashboard-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useGoals, useAccounts, usePrimaryGoal, useGoal, useGoalsSync } from "@/hooks/use-api"
import { Goal, GoalsFilters } from "@/types"
import { useToast } from "@/hooks/use-toast"

// Map goal types to display categories for backward compatibility
const goalTypeToCategory = {
    'savings': 'savings',
    'debt_reduction': 'debt',
    'investment': 'investment',
    'purchase': 'purchase',
    'education': 'education',
    'travel': 'travel'
} as const

const categoryIcons = {
    savings: PiggyBank,
    debt_reduction: TrendingUp,
    debt: TrendingUp,
    investment: TrendingUp,
    purchase: Car,
    education: GraduationCap,
    travel: Plane,
}

const categoryColors = {
    savings: "bg-green-500",
    debt_reduction: "bg-red-500",
    debt: "bg-red-500",
    investment: "bg-blue-500",
    purchase: "bg-purple-500",
    education: "bg-orange-500",
    travel: "bg-pink-500",
}

const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
}

const statusColors = {
    active: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    paused: "bg-gray-100 text-gray-800",
}

export default function GoalsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
    const [isAddGoalOpen, setIsAddGoalOpen] = useState(false)
    const [isEditGoalOpen, setIsEditGoalOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
    const [activeTab, setActiveTab] = useState("all")
    const [dateRange, setDateRange] = useState("03 Jul 2025 - 30 Jul 2025")

    // Form state for create/edit goal
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        goalType: 'savings' as Goal['goalType'],
        category: '',
        targetAmount: '',
        targetDate: '',
        priority: 'medium' as Goal['priority'],
        trackingMethod: 'manual' as Goal['trackingMethod'],
        trackingAccountIds: [] as string[],
        trackingCategories: [] as string[],
        trackingConfig: {
            accountIds: [] as string[],
            categoryFilters: [] as string[],
            transactionTypes: [] as string[]
        }
    })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Manual progress entry state
    const [isAddProgressOpen, setIsAddProgressOpen] = useState(false)
    const [progressFormData, setProgressFormData] = useState({
        amount: '',
        progressType: 'manual_add' as 'manual_add' | 'manual_subtract' | 'adjustment',
        description: ''
    })
    const [progressFormErrors, setProgressFormErrors] = useState<Record<string, string>>({})
    const [isSubmittingProgress, setIsSubmittingProgress] = useState(false)
    const [isRecalculatingProgress, setIsRecalculatingProgress] = useState(false)

    // Use real API data
    const {
        goals,
        loading: goalsLoading,
        error: goalsError,
        refreshGoals,
        updateFilters,
        createGoal,
        updateGoal,
        deleteGoal,
        createState,
        updateState,
        deleteState
    } = useGoals()

    const { accounts } = useAccounts()
    const { toast } = useToast()

    // Primary goal functionality
    const {
        primaryGoal,
        setPrimaryGoal,
        loading: primaryLoading,
        setPrimaryState
    } = usePrimaryGoal()

    // Individual goal hook for manual progress
    const {
        addProgress,
        addProgressState
    } = useGoal(selectedGoal?.id || '')

    // Goals sync hook for manual progress sync
    const {
        syncAllGoals,
        loading: syncLoading,
        isLoading: isSyncLoading
    } = useGoalsSync()

    // Handle URL parameter for focusing on specific goal from search
    useEffect(() => {
        const focusId = searchParams.get("focus")
        if (focusId && goals.length > 0) {
            const goal = goals.find((g) => g.id === focusId)
            if (goal) {
                // Set the goal as selected to show details
                setSelectedGoal(goal)
                
                // Switch to the appropriate tab based on goal type/status
                const category = goalTypeToCategory[goal.goalType] || goal.goalType
                if (goal.status === "active") {
                    setActiveTab("active")
                } else if (goal.status === "completed") {
                    setActiveTab("completed")
                } else {
                    setActiveTab(category)
                }
                
                // Clear the URL parameter after focusing
                router.replace("/goals")
            }
        }
    }, [searchParams, goals, router])

    const formatCurrency = (amount: number | null | undefined) => {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return '$0'
        }
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const calculateProgress = (current: number | null | undefined, target: number | null | undefined) => {
        if (typeof current !== 'number' || typeof target !== 'number' || target <= 0 || isNaN(current) || isNaN(target)) {
            return 0
        }
        return Math.min((current / target) * 100, 100)
    }

    const getDaysRemaining = (targetDate: string | null | undefined) => {
        if (!targetDate) {
            return 0
        }
        const today = new Date()
        const target = new Date(targetDate)
        if (isNaN(target.getTime())) {
            return 0
        }
        const diffTime = target.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    const filteredGoals = goals.filter((goal) => {
        if (activeTab === "all") return true
        if (activeTab === "active") return goal.status === "active"
        if (activeTab === "completed") return goal.status === "completed"
        // Map goal type to category for filtering
        const category = goalTypeToCategory[goal.goalType] || goal.goalType
        return category === activeTab
    })

    const totalGoalsValue = goals.reduce((sum, goal) => {
        const amount = typeof goal.targetAmount === 'number' ? goal.targetAmount : 0
        return sum + amount
    }, 0)
    const totalSaved = goals.reduce((sum, goal) => {
        const amount = typeof goal.currentAmount === 'number' ? goal.currentAmount : 0
        return sum + amount
    }, 0)
    const completedGoals = goals.filter((goal) => goal.status === "completed").length
    const activeGoals = goals.filter((goal) => goal.status === "active").length

    // Form validation
    const validateForm = () => {
        const errors: Record<string, string> = {}

        if (!formData.title.trim()) {
            errors.title = 'Title is required'
        } else if (formData.title.length > 255) {
            errors.title = 'Title must be less than 255 characters'
        }

        if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
            errors.targetAmount = 'Target amount must be greater than 0'
        } else if (parseFloat(formData.targetAmount) > 999999999999) {
            errors.targetAmount = 'Target amount is too large'
        }

        if (!formData.targetDate) {
            errors.targetDate = 'Target date is required'
        } else {
            const targetDate = new Date(formData.targetDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (targetDate <= today) {
                errors.targetDate = 'Target date must be in the future'
            }
        }

        if (!formData.goalType) {
            errors.goalType = 'Goal type is required'
        }

        // Validate tracking configuration
        if (formData.trackingMethod === 'account_balance' && formData.trackingConfig.accountIds.length === 0) {
            errors.trackingMethod = 'Please select at least one account for balance tracking'
        }

        if (formData.trackingMethod === 'transaction_category' && formData.trackingConfig.categoryFilters.length === 0) {
            errors.trackingMethod = 'Please specify at least one category for transaction tracking'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Check if form is ready to submit
    const isFormReady = () => {
        // Check required fields
        if (!formData.title.trim()) return false
        if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) return false
        if (!formData.targetDate) return false
        if (!formData.goalType) return false

        // Check target date is in future
        const targetDate = new Date(formData.targetDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (targetDate <= today) return false

        // Check tracking method requirements
        if (formData.trackingMethod === 'account_balance' && formData.trackingConfig.accountIds.length === 0) return false
        if (formData.trackingMethod === 'transaction_category' && formData.trackingConfig.categoryFilters.length === 0) return false

        return true
    }

    // Get missing fields for user feedback
    const getMissingFields = () => {
        const missing: string[] = []

        if (!formData.title.trim()) missing.push('Title')
        if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) missing.push('Target Amount')
        if (!formData.targetDate) missing.push('Target Date')
        if (!formData.goalType) missing.push('Goal Type')

        // Check target date validity
        if (formData.targetDate) {
            const targetDate = new Date(formData.targetDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (targetDate <= today) missing.push('Future Target Date')
        }

        // Check tracking method requirements
        if (formData.trackingMethod === 'account_balance' && formData.trackingConfig.accountIds.length === 0) {
            missing.push('Account Selection')
        }
        if (formData.trackingMethod === 'transaction_category' && formData.trackingConfig.categoryFilters.length === 0) {
            missing.push('Category Filters')
        }

        return missing
    }

    // Reset form
    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            goalType: 'savings',
            category: '',
            targetAmount: '',
            targetDate: '',
            priority: 'medium',
            trackingMethod: 'manual',
            trackingAccountIds: [],
            trackingCategories: [],
            trackingConfig: {
                accountIds: [],
                categoryFilters: [],
                transactionTypes: []
            }
        })
        setFormErrors({})
        setEditingGoal(null)
    }

    // Reset progress form
    const resetProgressForm = () => {
        setProgressFormData({
            amount: '',
            progressType: 'manual_add',
            description: ''
        })
        setProgressFormErrors({})
    }

    // Validate progress form
    const validateProgressForm = () => {
        const errors: Record<string, string> = {}

        if (!progressFormData.amount || parseFloat(progressFormData.amount) <= 0) {
            errors.amount = 'Amount must be greater than 0'
        } else if (parseFloat(progressFormData.amount) > 999999999999) {
            errors.amount = 'Amount is too large'
        }

        if (!progressFormData.progressType) {
            errors.progressType = 'Progress type is required'
        }

        setProgressFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Handle form submission for create/edit
    const handleSubmitGoal = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)

        try {
            const goalData = {
                title: formData.title.trim(),
                description: formData.description.trim() || undefined,
                goalType: formData.goalType,
                category: formData.category.trim() || undefined,
                targetAmount: parseFloat(formData.targetAmount),
                targetDate: formData.targetDate,
                priority: formData.priority,
                trackingMethod: formData.trackingMethod,
                trackingConfig: formData.trackingMethod !== 'manual' ? {
                    accountIds: formData.trackingConfig.accountIds,
                    categoryFilters: formData.trackingConfig.categoryFilters,
                    transactionTypes: formData.trackingConfig.transactionTypes
                } : undefined
            }

            if (editingGoal) {
                await updateGoal(editingGoal.id, goalData)
                setIsEditGoalOpen(false)
                toast({
                    title: "Goal updated",
                    description: "Your goal has been successfully updated.",
                })
            } else {
                await createGoal(goalData)
                setIsAddGoalOpen(false)
                toast({
                    title: "Goal created",
                    description: "Your new goal has been successfully created.",
                })
            }

            resetForm()
        } catch (error) {
            console.error('Failed to save goal:', error)
            toast({
                title: "Error",
                description: editingGoal ? "Failed to update goal. Please try again." : "Failed to create goal. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle edit goal
    const handleEditGoal = (goal: Goal) => {
        setEditingGoal(goal)
        setFormData({
            title: goal.title,
            description: goal.description || '',
            goalType: goal.goalType,
            category: goal.category || '',
            targetAmount: goal.targetAmount.toString(),
            targetDate: goal.targetDate,
            priority: goal.priority,
            trackingMethod: goal.trackingMethod,
            trackingAccountIds: goal.trackingAccountIds || [],
            trackingCategories: [],
            trackingConfig: {
                accountIds: goal.trackingConfig?.accountIds || [],
                categoryFilters: goal.trackingConfig?.categoryFilters || [],
                transactionTypes: goal.trackingConfig?.transactionTypes || []
            }
        })
        setFormErrors({})
        setSelectedGoal(null)
        setIsEditGoalOpen(true)
    }

    // Handle delete goal
    const handleDeleteGoal = async (goalId: string) => {
        if (window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
            try {
                await deleteGoal(goalId)
                setSelectedGoal(null)
                toast({
                    title: "Goal deleted",
                    description: "Your goal has been successfully deleted.",
                })
            } catch (error) {
                console.error('Failed to delete goal:', error)
                toast({
                    title: "Error",
                    description: "Failed to delete goal. Please try again.",
                    variant: "destructive",
                })
            }
        }
    }

    // Handle set primary goal
    const handleSetPrimaryGoal = async (goalId: string) => {
        try {
            await setPrimaryGoal(goalId)
            toast({
                title: "Primary goal set",
                description: "This goal has been set as your primary goal.",
            })
        } catch (error) {
            console.error('Failed to set primary goal:', error)
            toast({
                title: "Error",
                description: "Failed to set primary goal. Please try again.",
                variant: "destructive",
            })
        }
    }

    // Handle form input changes
    const handleInputChange = (field: string, value: string) => {
        if (field === 'trackingMethod') {
            // Reset tracking config when method changes
            setFormData(prev => ({
                ...prev,
                [field]: value,
                trackingConfig: {
                    accountIds: [],
                    categoryFilters: [],
                    transactionTypes: []
                }
            }))
        } else {
            setFormData(prev => ({ ...prev, [field]: value }))
        }
        // Clear error when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    // Handle progress form input changes
    const handleProgressInputChange = (field: string, value: string) => {
        setProgressFormData(prev => ({ ...prev, [field]: value }))
        // Clear error when user starts typing
        if (progressFormErrors[field]) {
            setProgressFormErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    // Handle manual progress submission
    const handleSubmitProgress = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateProgressForm() || !selectedGoal) {
            return
        }

        setIsSubmittingProgress(true)

        try {
            const progressData = {
                amount: parseFloat(progressFormData.amount),
                progressType: progressFormData.progressType,
                description: progressFormData.description.trim() || undefined
            }

            await addProgress(progressData)

            // Refresh goals to get updated progress
            await refreshGoals()

            setIsAddProgressOpen(false)
            resetProgressForm()

            toast({
                title: "Progress added",
                description: "Your progress has been successfully recorded.",
            })
        } catch (error) {
            console.error('Failed to add progress:', error)
            toast({
                title: "Error",
                description: "Failed to add progress. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmittingProgress(false)
        }
    }

    // Handle recalculate progress
    const handleRecalculateProgress = async (goalId: string) => {
        setIsRecalculatingProgress(true)

        try {
            // Use the API client directly since we don't have a hook for this
            const response = await fetch(`/api/goals/${goalId}/calculate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error('Failed to recalculate progress')
            }

            // Refresh goals to get updated progress
            await refreshGoals()

            toast({
                title: "Progress recalculated",
                description: "Your goal progress has been updated based on your latest financial data.",
            })
        } catch (error) {
            console.error('Failed to recalculate progress:', error)
            toast({
                title: "Error",
                description: "Failed to recalculate progress. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsRecalculatingProgress(false)
        }
    }

    // Handle sync all goals progress
    const handleSyncAllGoalsProgress = async () => {
        try {
            const result = await syncAllGoals()
            
            toast({
                title: "Goals progress synced",
                description: `Successfully updated progress for ${result.goalsUpdated} goals.`,
            })

            // Refresh goals to show updated progress
            await refreshGoals()
        } catch (error) {
            console.error('Failed to sync goals progress:', error)
            toast({
                title: "Error",
                description: "Failed to sync goals progress. Please try again.",
                variant: "destructive",
            })
        }
    }

    return (
        <DashboardLayout>
            <SidebarInset className="flex flex-col h-full">
                {/* Header */}
                <DashboardHeader title="Financial Goals" >
                    
                </DashboardHeader>

                {/* Main Content */}
                <div className="flex-1 p-6 bg-gray-50 overflow-auto">
                    <div className="flex items-center justify-between space-y-2 mb-6">
                            <Dialog open={isAddGoalOpen} onOpenChange={(open) => {
                                setIsAddGoalOpen(open)
                                if (!open) resetForm()
                            }}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Goal
                                    </Button>
                                </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] overflow-y-scroll max-h-screen">
                                <DialogHeader>
                                    <DialogTitle>Add New Goal</DialogTitle>
                                    <DialogDescription>Create a new financial goal to track your progress.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmitGoal}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="title" className="text-right">
                                                Title *
                                            </Label>
                                            <div className="col-span-3">
                                                <Input
                                                    id="title"
                                                    value={formData.title}
                                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                                    className={formErrors.title ? 'border-red-500' : ''}
                                                />
                                                {formErrors.title && (
                                                    <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="goalType" className="text-right">
                                                Type *
                                            </Label>
                                            <div className="col-span-3">
                                                <Select
                                                    value={formData.goalType}
                                                    onValueChange={(value) => handleInputChange('goalType', value)}
                                                >
                                                    <SelectTrigger className={formErrors.goalType ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Select goal type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="savings">Savings</SelectItem>
                                                        <SelectItem value="debt_reduction">Debt Payoff</SelectItem>
                                                        <SelectItem value="investment">Investment</SelectItem>
                                                        <SelectItem value="purchase">Purchase</SelectItem>
                                                        <SelectItem value="education">Education</SelectItem>
                                                        <SelectItem value="travel">Travel</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {formErrors.goalType && (
                                                    <p className="text-sm text-red-500 mt-1">{formErrors.goalType}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="targetAmount" className="text-right">
                                                Target Amount *
                                            </Label>
                                            <div className="col-span-3">
                                                <Input
                                                    id="targetAmount"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={formData.targetAmount}
                                                    onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                                                    className={formErrors.targetAmount ? 'border-red-500' : ''}
                                                    placeholder="0.00"
                                                />
                                                {formErrors.targetAmount && (
                                                    <p className="text-sm text-red-500 mt-1">{formErrors.targetAmount}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="targetDate" className="text-right">
                                                Target Date *
                                            </Label>
                                            <div className="col-span-3">
                                                <Input
                                                    id="targetDate"
                                                    type="date"
                                                    value={formData.targetDate}
                                                    onChange={(e) => handleInputChange('targetDate', e.target.value)}
                                                    className={formErrors.targetDate ? 'border-red-500' : ''}
                                                />
                                                {formErrors.targetDate && (
                                                    <p className="text-sm text-red-500 mt-1">{formErrors.targetDate}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="priority" className="text-right">
                                                Priority
                                            </Label>
                                            <Select
                                                value={formData.priority}
                                                onValueChange={(value) => handleInputChange('priority', value)}
                                            >
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="low">Low</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="category" className="text-right">
                                                Category
                                            </Label>
                                            <Input
                                                id="category"
                                                className="col-span-3"
                                                value={formData.category}
                                                onChange={(e) => handleInputChange('category', e.target.value)}
                                                placeholder="Optional category"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="description" className="text-right">
                                                Description
                                            </Label>
                                            <Textarea
                                                id="description"
                                                className="col-span-3"
                                                value={formData.description}
                                                onChange={(e) => handleInputChange('description', e.target.value)}
                                                placeholder="Optional description"
                                            />
                                        </div>

                                        {/* Tracking Method Selection */}
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="trackingMethod" className="text-right">
                                                Progress Tracking
                                            </Label>
                                            <div className="col-span-3">
                                                <Select
                                                    value={formData.trackingMethod}
                                                    onValueChange={(value) => handleInputChange('trackingMethod', value)}
                                                >
                                                    <SelectTrigger className={formErrors.trackingMethod ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Select tracking method" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="manual">Manual Entry</SelectItem>
                                                        <SelectItem value="account_balance">Account Balance Tracking</SelectItem>
                                                        <SelectItem value="transaction_category">Transaction Category Tracking</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {formErrors.trackingMethod ? (
                                                    <p className="text-sm text-red-500 mt-1">{formErrors.trackingMethod}</p>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formData.trackingMethod === 'manual' && 'You will manually add progress entries'}
                                                        {formData.trackingMethod === 'account_balance' && 'Progress tracked from selected account balances'}
                                                        {formData.trackingMethod === 'transaction_category' && 'Progress tracked from transaction categories'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Account Selection for Automatic Tracking */}
                                        {formData.trackingMethod === 'account_balance' && (
                                            <div className="grid grid-cols-4 items-start gap-4">
                                                <Label className="text-right pt-2">
                                                    Select Accounts
                                                </Label>
                                                <div className="col-span-3 space-y-2">
                                                    {accounts && accounts.length > 0 ? (
                                                        <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                                                            {accounts.map((account) => (
                                                                <div key={account.id} className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`account-${account.id}`}
                                                                        checked={formData.trackingConfig.accountIds.includes(account.id)}
                                                                        onChange={(e) => {
                                                                            const accountIds = e.target.checked
                                                                                ? [...formData.trackingConfig.accountIds, account.id]
                                                                                : formData.trackingConfig.accountIds.filter(id => id !== account.id)
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                trackingConfig: {
                                                                                    ...prev.trackingConfig,
                                                                                    accountIds
                                                                                }
                                                                            }))
                                                                        }}
                                                                        className="rounded border-gray-300"
                                                                    />
                                                                    <label htmlFor={`account-${account.id}`} className="text-sm flex-1">
                                                                        <div className="font-medium">{account.name}</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {account.institutionName} • {account.type} • {formatCurrency(account.balance.current)}
                                                                        </div>
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground p-2 border rounded-md">
                                                            No accounts available. Connect your bank accounts first.
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        Select accounts to track for automatic progress calculation
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Transaction Category Filters */}
                                        {formData.trackingMethod === 'transaction_category' && (
                                            <div className="grid grid-cols-4 items-start gap-4">
                                                <Label className="text-right pt-2">
                                                    Category Filters
                                                </Label>
                                                <div className="col-span-3 space-y-2">
                                                    <Input
                                                        placeholder="Enter categories (comma-separated)"
                                                        value={formData.trackingConfig.categoryFilters.join(', ')}
                                                        onChange={(e) => {
                                                            const categories = e.target.value
                                                                .split(',')
                                                                .map(cat => cat.trim())
                                                                .filter(cat => cat.length > 0)
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                trackingConfig: {
                                                                    ...prev.trackingConfig,
                                                                    categoryFilters: categories
                                                                }
                                                            }))
                                                        }}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Examples: Food and Drink, Shopping, Transportation
                                                    </p>

                                                    <div className="space-y-2">
                                                        <Label className="text-sm">Transaction Types</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['income', 'expense'].map((type) => (
                                                                <div key={type} className="flex items-center space-x-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`type-${type}`}
                                                                        checked={formData.trackingConfig.transactionTypes.includes(type)}
                                                                        onChange={(e) => {
                                                                            const types = e.target.checked
                                                                                ? [...formData.trackingConfig.transactionTypes, type]
                                                                                : formData.trackingConfig.transactionTypes.filter(t => t !== type)
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                trackingConfig: {
                                                                                    ...prev.trackingConfig,
                                                                                    transactionTypes: types
                                                                                }
                                                                            }))
                                                                        }}
                                                                        className="rounded border-gray-300"
                                                                    />
                                                                    <label htmlFor={`type-${type}`} className="text-sm capitalize">
                                                                        {type}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Select whether to track income or expense transactions
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col space-y-2">
                                        {!isFormReady() && (
                                            <div className="text-sm text-muted-foreground">
                                                <span className="font-medium">Still needed:</span> {getMissingFields().join(', ')}
                                            </div>
                                        )}
                                        <div className="flex justify-end space-x-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsAddGoalOpen(false)
                                                    resetForm()
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting || createState.isLoading || !isFormReady()}
                                            >
                                                {isSubmitting || createState.isLoading ? 'Creating...' : 'Create Goal'}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Summary Cards */}
                    {goalsLoading === 'loading' ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {[...Array(4)].map((_, i) => (
                                <Card key={i}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-4" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-8 w-20 mb-2" />
                                        <Skeleton className="h-3 w-16" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : goalsError ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Failed to load goals summary. {goalsError}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Goals Value</CardTitle>
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(totalGoalsValue)}</div>
                                    <p className="text-xs text-muted-foreground">Across {goals.length} goals</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(totalSaved)}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {totalGoalsValue > 0 ? ((totalSaved / totalGoalsValue) * 100).toFixed(1) : '0'}% of total goals
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{activeGoals}</div>
                                    <p className="text-xs text-muted-foreground">Currently tracking</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Completed Goals</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{completedGoals}</div>
                                    <p className="text-xs text-muted-foreground">Successfully achieved</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Edit Goal Dialog */}
                    <Dialog open={isEditGoalOpen} onOpenChange={(open) => {
                        setIsEditGoalOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogContent className="sm:max-w-[425px] max-h-screen overflow-y-scroll">
                            <DialogHeader>
                                <DialogTitle>Edit Goal</DialogTitle>
                                <DialogDescription>Update your financial goal details.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmitGoal}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-title" className="text-right">
                                            Title *
                                        </Label>
                                        <div className="col-span-3">
                                            <Input
                                                id="edit-title"
                                                value={formData.title}
                                                onChange={(e) => handleInputChange('title', e.target.value)}
                                                className={formErrors.title ? 'border-red-500' : ''}
                                            />
                                            {formErrors.title && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-goalType" className="text-right">
                                            Type *
                                        </Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={formData.goalType}
                                                onValueChange={(value) => handleInputChange('goalType', value)}
                                            >
                                                <SelectTrigger className={formErrors.goalType ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Select goal type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="savings">Savings</SelectItem>
                                                    <SelectItem value="debt_reduction">Debt Payoff</SelectItem>
                                                    <SelectItem value="investment">Investment</SelectItem>
                                                    <SelectItem value="purchase">Purchase</SelectItem>
                                                    <SelectItem value="education">Education</SelectItem>
                                                    <SelectItem value="travel">Travel</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {formErrors.goalType && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.goalType}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-targetAmount" className="text-right">
                                            Target Amount *
                                        </Label>
                                        <div className="col-span-3">
                                            <Input
                                                id="edit-targetAmount"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.targetAmount}
                                                onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                                                className={formErrors.targetAmount ? 'border-red-500' : ''}
                                                placeholder="0.00"
                                            />
                                            {formErrors.targetAmount && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.targetAmount}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-targetDate" className="text-right">
                                            Target Date *
                                        </Label>
                                        <div className="col-span-3">
                                            <Input
                                                id="edit-targetDate"
                                                type="date"
                                                value={formData.targetDate}
                                                onChange={(e) => handleInputChange('targetDate', e.target.value)}
                                                className={formErrors.targetDate ? 'border-red-500' : ''}
                                            />
                                            {formErrors.targetDate && (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.targetDate}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-priority" className="text-right">
                                            Priority
                                        </Label>
                                        <Select
                                            value={formData.priority}
                                            onValueChange={(value) => handleInputChange('priority', value)}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="low">Low</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-category" className="text-right">
                                            Category
                                        </Label>
                                        <Input
                                            id="edit-category"
                                            className="col-span-3"
                                            value={formData.category}
                                            onChange={(e) => handleInputChange('category', e.target.value)}
                                            placeholder="Optional category"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-description" className="text-right">
                                            Description
                                        </Label>
                                        <Textarea
                                            id="edit-description"
                                            className="col-span-3"
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder="Optional description"
                                        />
                                    </div>

                                    {/* Tracking Method Selection */}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-trackingMethod" className="text-right">
                                            Progress Tracking
                                        </Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={formData.trackingMethod}
                                                onValueChange={(value) => handleInputChange('trackingMethod', value)}
                                            >
                                                <SelectTrigger className={formErrors.trackingMethod ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Select tracking method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="manual">Manual Entry</SelectItem>
                                                    <SelectItem value="account_balance">Account Balance Tracking</SelectItem>
                                                    <SelectItem value="transaction_category">Transaction Category Tracking</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {formErrors.trackingMethod ? (
                                                <p className="text-sm text-red-500 mt-1">{formErrors.trackingMethod}</p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formData.trackingMethod === 'manual' && 'You will manually add progress entries'}
                                                    {formData.trackingMethod === 'account_balance' && 'Progress tracked from selected account balances'}
                                                    {formData.trackingMethod === 'transaction_category' && 'Progress tracked from transaction categories'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Account Selection for Automatic Tracking */}
                                    {formData.trackingMethod === 'account_balance' && (
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label className="text-right pt-2">
                                                Select Accounts
                                            </Label>
                                            <div className="col-span-3 space-y-2">
                                                {accounts && accounts.length > 0 ? (
                                                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                                                        {accounts.map((account) => (
                                                            <div key={account.id} className="flex items-center space-x-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`edit-account-${account.id}`}
                                                                    checked={formData.trackingConfig.accountIds.includes(account.id)}
                                                                    onChange={(e) => {
                                                                        const accountIds = e.target.checked
                                                                            ? [...formData.trackingConfig.accountIds, account.id]
                                                                            : formData.trackingConfig.accountIds.filter(id => id !== account.id)
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            trackingConfig: {
                                                                                ...prev.trackingConfig,
                                                                                accountIds
                                                                            }
                                                                        }))
                                                                    }}
                                                                    className="rounded border-gray-300"
                                                                />
                                                                <label htmlFor={`edit-account-${account.id}`} className="text-sm flex-1">
                                                                    <div className="font-medium">{account.name}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {account.institutionName} • {account.type} • {formatCurrency(account.balance.current)}
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground p-2 border rounded-md">
                                                        No accounts available. Connect your bank accounts first.
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Select accounts to track for automatic progress calculation
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Transaction Category Filters */}
                                    {formData.trackingMethod === 'transaction_category' && (
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label className="text-right pt-2">
                                                Category Filters
                                            </Label>
                                            <div className="col-span-3 space-y-2">
                                                <Input
                                                    placeholder="Enter categories (comma-separated)"
                                                    value={formData.trackingConfig.categoryFilters.join(', ')}
                                                    onChange={(e) => {
                                                        const categories = e.target.value
                                                            .split(',')
                                                            .map(cat => cat.trim())
                                                            .filter(cat => cat.length > 0)
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            trackingConfig: {
                                                                ...prev.trackingConfig,
                                                                categoryFilters: categories
                                                            }
                                                        }))
                                                    }}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Examples: Food and Drink, Shopping, Transportation
                                                </p>

                                                <div className="space-y-2">
                                                    <Label className="text-sm">Transaction Types</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['income', 'expense'].map((type) => (
                                                            <div key={type} className="flex items-center space-x-1">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`edit-type-${type}`}
                                                                    checked={formData.trackingConfig.transactionTypes.includes(type)}
                                                                    onChange={(e) => {
                                                                        const types = e.target.checked
                                                                            ? [...formData.trackingConfig.transactionTypes, type]
                                                                            : formData.trackingConfig.transactionTypes.filter(t => t !== type)
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            trackingConfig: {
                                                                                ...prev.trackingConfig,
                                                                                transactionTypes: types
                                                                            }
                                                                        }))
                                                                    }}
                                                                    className="rounded border-gray-300"
                                                                />
                                                                <label htmlFor={`edit-type-${type}`} className="text-sm capitalize">
                                                                    {type}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Select whether to track income or expense transactions
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col space-y-2">
                                    {!isFormReady() && (
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-medium">Still needed:</span> {getMissingFields().join(', ')}
                                        </div>
                                    )}
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsEditGoalOpen(false)
                                                resetForm()
                                            }}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || updateState.isLoading || !isFormReady()}
                                        >
                                            {isSubmitting || updateState.isLoading ? 'Updating...' : 'Update Goal'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Goals Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 py-2">
                        <TabsList className="max-w-screen overflow-x-scroll w-full lg:w-fit flex lg:block">
                            <TabsTrigger value="all">All Goals</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="completed">Completed</TabsTrigger>
                            <TabsTrigger value="savings">Savings</TabsTrigger>
                            <TabsTrigger value="investment">Investment</TabsTrigger>
                            <TabsTrigger value="purchase">Purchase</TabsTrigger>
                            <TabsTrigger value="debt">Debt</TabsTrigger>
                            <TabsTrigger value="education">Education</TabsTrigger>
                            <TabsTrigger value="travel">Travel</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="space-y-4">
                            {goalsLoading === 'loading' ? (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {[...Array(6)].map((_, i) => (
                                        <Card key={i}>
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center space-x-2">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-32" />
                                                        <Skeleton className="h-3 w-48" />
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2 mt-2">
                                                    <Skeleton className="h-5 w-16" />
                                                    <Skeleton className="h-5 w-16" />
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <Skeleton className="h-3 w-16" />
                                                        <Skeleton className="h-3 w-12" />
                                                    </div>
                                                    <Skeleton className="h-2 w-full" />
                                                    <div className="flex justify-between">
                                                        <Skeleton className="h-3 w-16" />
                                                        <Skeleton className="h-3 w-16" />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between">
                                                    <Skeleton className="h-3 w-20" />
                                                    <Skeleton className="h-4 w-4" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : goalsError ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Failed to load goals. {goalsError}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="ml-2"
                                            onClick={refreshGoals}
                                        >
                                            Retry
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            ) : filteredGoals.length === 0 ? (
                                <div className="text-center py-12">
                                    <Target className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No goals found</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {activeTab === "all"
                                            ? "Get started by creating your first financial goal."
                                            : `No ${activeTab} goals found. Try a different filter.`
                                        }
                                    </p>
                                    {activeTab === "all" && (
                                        <div className="mt-6">
                                            <Button onClick={() => setIsAddGoalOpen(true)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Goal
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredGoals.map((goal) => {
                                        const category = goalTypeToCategory[goal.goalType] || goal.goalType
                                        const IconComponent = categoryIcons[category] || Target
                                        const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
                                        const daysRemaining = getDaysRemaining(goal.targetDate)

                                        return (
                                            <Card
                                                key={goal.id}
                                                className={`cursor-pointer hover:shadow-lg transition-shadow ${goal.isPrimary
                                                    ? 'ring-2 ring-yellow-400 bg-yellow-50/50'
                                                    : ''
                                                    }`}
                                                onClick={() => setSelectedGoal(goal)}
                                            >
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className={`p-2 rounded-full ${categoryColors[category] || 'bg-gray-500'}`}>
                                                                <IconComponent className="h-4 w-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <CardTitle className="text-lg">{goal.title}</CardTitle>
                                                                <CardDescription className="text-sm">{goal.description}</CardDescription>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <Badge className={priorityColors[goal.priority]}>{goal.priority}</Badge>
                                                        <Badge className={statusColors[goal.status]}>{goal.status}</Badge>
                                                        {goal.isPrimary && (
                                                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                                                ⭐ Primary
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span>Progress</span>
                                                            <span>{progress.toFixed(1)}%</span>
                                                        </div>
                                                        <Progress value={progress} className="h-2" />
                                                        <div className="flex justify-between text-sm text-muted-foreground">
                                                            <span>{formatCurrency(goal.currentAmount)}</span>
                                                            <span>{formatCurrency(goal.targetAmount)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center space-x-1">
                                                            <Calendar className="h-4 w-4" />
                                                            <span>{daysRemaining > 0 ? `${daysRemaining} days left` : "Overdue"}</span>
                                                        </div>
                                                        {daysRemaining < 30 && daysRemaining > 0 && <AlertCircle className="h-4 w-4 text-orange-500" />}
                                                    </div>

                                                    {/* Primary Goal Button */}
                                                    <div className="flex justify-between items-center pt-2">
                                                        {!goal.isPrimary ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleSetPrimaryGoal(goal.id)
                                                                }}
                                                                disabled={setPrimaryState.isLoading}
                                                                className="text-xs"
                                                            >
                                                                {setPrimaryState.isLoading ? 'Setting...' : 'Set as Primary'}
                                                            </Button>
                                                        ) : (
                                                            <Badge variant="outline" className="border-yellow-500 text-yellow-700 text-xs">
                                                                Primary Goal
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    {/* Goal Details Modal */}
                    <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
                        <DialogContent className="sm:max-w-[500px] overflow-y-scroll max-h-screen">
                            {selectedGoal && (
                                <>
                                    <DialogHeader>
                                        <div className="flex items-center space-x-3">
                                            {(() => {
                                                const category = goalTypeToCategory[selectedGoal.goalType] || selectedGoal.goalType
                                                const IconComponent = categoryIcons[category] || Target
                                                return (
                                                    <div className={`p-3 rounded-full ${categoryColors[category] || 'bg-gray-500'}`}>
                                                        <IconComponent className="h-6 w-6 text-white" />
                                                    </div>
                                                )
                                            })()}
                                            <div>
                                                <DialogTitle className="text-xl">{selectedGoal.title}</DialogTitle>
                                                <DialogDescription>{selectedGoal.description}</DialogDescription>
                                            </div>
                                        </div>
                                    </DialogHeader>

                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Progress</span>
                                                <span className="text-2xl font-bold">
                                                    {calculateProgress(selectedGoal.currentAmount, selectedGoal.targetAmount).toFixed(1)}%
                                                </span>
                                            </div>
                                            <Progress
                                                value={calculateProgress(selectedGoal.currentAmount, selectedGoal.targetAmount)}
                                                className="h-3"
                                            />
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>{formatCurrency(selectedGoal.currentAmount)} saved</span>
                                                <span>{formatCurrency(selectedGoal.targetAmount)} target</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Remaining Amount</Label>
                                                <p className="text-lg font-semibold">
                                                    {formatCurrency((selectedGoal?.targetAmount || 0) - (selectedGoal?.currentAmount || 0))}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Days Remaining</Label>
                                                <p className="text-lg font-semibold">{getDaysRemaining(selectedGoal.targetDate)} days</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Target Date</Label>
                                                <p className="text-sm">{new Date(selectedGoal.targetDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Created</Label>
                                                <p className="text-sm">{new Date(selectedGoal.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <Badge className={priorityColors[selectedGoal.priority]}>{selectedGoal.priority} priority</Badge>
                                            <Badge className={statusColors[selectedGoal.status]}>{selectedGoal.status}</Badge>
                                            {selectedGoal.isPrimary && (
                                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                                    ⭐ Primary Goal
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex space-x-2">
                                            {selectedGoal.trackingMethod === 'manual' ? (
                                                <Button
                                                    className="flex-1"
                                                    onClick={() => setIsAddProgressOpen(true)}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add Progress
                                                </Button>
                                            ) : (
                                                <Button
                                                    className="flex-1"
                                                    onClick={() => handleRecalculateProgress(selectedGoal.id)}
                                                    disabled={isRecalculatingProgress || selectedGoal.trackingMethod === 'manual'}
                                                    title={selectedGoal.trackingMethod === 'manual' ? 'This goal uses manual tracking' : 'Recalculate progress from your latest financial data'}
                                                >
                                                    <TrendingUp className="mr-2 h-4 w-4" />
                                                    {isRecalculatingProgress ? 'Calculating...' : 'Recalculate'}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                className={selectedGoal.trackingMethod === 'manual' ? '' : 'flex-1 bg-transparent'}
                                                onClick={() => handleEditGoal(selectedGoal)}
                                            >
                                                Edit Goal
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteGoal(selectedGoal.id)}
                                                disabled={deleteState.isLoading}
                                            >
                                                {deleteState.isLoading ? 'Deleting...' : 'Delete'}
                                            </Button>
                                        </div>

                                        {/* Primary Goal Button */}
                                        {!selectedGoal.isPrimary && (
                                            <div className="pt-2">
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => handleSetPrimaryGoal(selectedGoal.id)}
                                                    disabled={setPrimaryState.isLoading}
                                                >
                                                    {setPrimaryState.isLoading ? 'Setting as Primary...' : 'Set as Primary Goal'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Manual Progress Entry Dialog */}
                    <Dialog open={isAddProgressOpen} onOpenChange={(open) => {
                        setIsAddProgressOpen(open)
                        if (!open) resetProgressForm()
                    }}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add Progress</DialogTitle>
                                <DialogDescription>
                                    Record progress for "{selectedGoal?.title}"
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmitProgress}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="progressType" className="text-right">
                                            Type *
                                        </Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={progressFormData.progressType}
                                                onValueChange={(value) => handleProgressInputChange('progressType', value)}
                                            >
                                                <SelectTrigger className={progressFormErrors.progressType ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Select progress type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="manual_add">Add Money</SelectItem>
                                                    <SelectItem value="manual_subtract">Subtract Money</SelectItem>
                                                    <SelectItem value="adjustment">Set Total Amount</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {progressFormErrors.progressType && (
                                                <p className="text-sm text-red-500 mt-1">{progressFormErrors.progressType}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="progressAmount" className="text-right">
                                            Amount *
                                        </Label>
                                        <div className="col-span-3">
                                            <Input
                                                id="progressAmount"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={progressFormData.amount}
                                                onChange={(e) => handleProgressInputChange('amount', e.target.value)}
                                                className={progressFormErrors.amount ? 'border-red-500' : ''}
                                                placeholder="0.00"
                                            />
                                            {progressFormErrors.amount && (
                                                <p className="text-sm text-red-500 mt-1">{progressFormErrors.amount}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {progressFormData.progressType === 'manual_add' && 'Amount to add to your goal'}
                                                {progressFormData.progressType === 'manual_subtract' && 'Amount to subtract from your goal'}
                                                {progressFormData.progressType === 'adjustment' && 'Set your total saved amount to this value'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="progressDescription" className="text-right">
                                            Description
                                        </Label>
                                        <Textarea
                                            id="progressDescription"
                                            className="col-span-3"
                                            value={progressFormData.description}
                                            onChange={(e) => handleProgressInputChange('description', e.target.value)}
                                            placeholder="Optional note about this progress entry"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsAddProgressOpen(false)}
                                        disabled={isSubmittingProgress}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmittingProgress || !progressFormData.amount || parseFloat(progressFormData.amount) <= 0}
                                    >
                                        {isSubmittingProgress ? 'Adding...' : 'Add Progress'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </SidebarInset>
        </DashboardLayout>
    )
}
