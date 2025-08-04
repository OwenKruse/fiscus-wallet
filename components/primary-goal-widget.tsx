"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Target, Calendar, TrendingUp, Plus } from "lucide-react"
import { Goal } from "@/types"
import { usePrimaryGoal } from "@/hooks/use-api"
import NextLink from "next/link"

interface PrimaryGoalWidgetProps {
  className?: string;
}

export function PrimaryGoalWidget({ className }: PrimaryGoalWidgetProps) {
  const { primaryGoal, loading, error } = usePrimaryGoal()

  // Debug logging to help identify issues
  console.log('PrimaryGoalWidget Debug:', {
    primaryGoal,
    loading,
    error,
    hasTitle: primaryGoal?.title,
    hasTargetAmount: typeof primaryGoal?.targetAmount === 'number',
    hasCurrentAmount: typeof primaryGoal?.currentAmount === 'number'
  })

  // Calculate progress percentage with null checks
  const progressPercentage = primaryGoal && 
    typeof primaryGoal.currentAmount === 'number' && 
    typeof primaryGoal.targetAmount === 'number' && 
    primaryGoal.targetAmount > 0
    ? Math.min(Math.round((primaryGoal.currentAmount / primaryGoal.targetAmount) * 100), 100)
    : 0

  // Calculate days remaining with null checks
  const daysRemaining = primaryGoal && primaryGoal.targetDate
    ? Math.max(0, Math.ceil((new Date(primaryGoal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  // Format currency with null checks
  const formatCurrency = (amount: number | null | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get goal type display info
  const getGoalTypeInfo = (goalType: Goal['goalType'] | undefined) => {
    if (!goalType) {
      return { label: 'Unknown', color: 'bg-gray-500' }
    }
    const typeMap = {
      savings: { label: 'Savings', color: 'bg-green-500' },
      debt_reduction: { label: 'Debt Reduction', color: 'bg-red-500' },
      investment: { label: 'Investment', color: 'bg-purple-500' },
      purchase: { label: 'Purchase', color: 'bg-blue-500' },
      education: { label: 'Education', color: 'bg-orange-500' },
      travel: { label: 'Travel', color: 'bg-pink-500' },
    }
    return typeMap[goalType] || { label: goalType, color: 'bg-gray-500' }
  }

  // Get priority color
  const getPriorityColor = (priority: Goal['priority'] | undefined) => {
    const priorityMap = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200',
    }
    return priorityMap[priority || 'medium'] || priorityMap.medium
  }

  // Show no goals state immediately, with subtle loading indicator if still loading
  if (!primaryGoal && !error) {
    const isLoading = loading === 'loading'
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Primary Goal</CardTitle>
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              )}
              <Target className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {isLoading ? 'Loading goals...' : 'No Goals Created Yet'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {isLoading 
                ? 'Checking for your financial goals...' 
                : 'Create your first financial goal to start tracking your progress'
              }
            </p>
            <NextLink href="/goals">
              <Button size="sm" className="bg-black text-white" disabled={isLoading}>
                <Plus className="h-3 w-3 mr-1" />
                {isLoading ? 'Loading...' : 'Create Your First Goal'}
              </Button>
            </NextLink>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Primary Goal</CardTitle>
            <Target className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">Failed to load primary goal</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }



  // Ensure primaryGoal has required fields before rendering
  if (!primaryGoal || !primaryGoal.title || typeof primaryGoal.targetAmount !== 'number') {
    const isLoading = loading === 'loading'
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Primary Goal</CardTitle>
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              )}
              <Target className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {isLoading ? 'Loading goals...' : 'No Goals Created Yet'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {isLoading 
                ? 'Checking for your financial goals...' 
                : 'Create your first financial goal to start tracking your progress'
              }
            </p>
            <NextLink href="/goals">
              <Button size="sm" className="bg-black text-white" disabled={isLoading}>
                <Plus className="h-3 w-3 mr-1" />
                {isLoading ? 'Loading...' : 'Create Your First Goal'}
              </Button>
            </NextLink>
          </div>
        </CardContent>
      </Card>
    )
  }

  const goalTypeInfo = getGoalTypeInfo(primaryGoal?.goalType)
  const isOverdue = daysRemaining === 0 && progressPercentage < 100
  const isCompleted = progressPercentage >= 100

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Primary Goal</CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${getPriorityColor(primaryGoal?.priority)}`}
            >
              {primaryGoal?.priority || 'medium'}
            </Badge>
            <div className={`w-3 h-3 ${goalTypeInfo.color} rounded-full`}></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal Title and Type */}
        <div>
          <h3 className="font-semibold text-base text-gray-900 mb-1">
            {primaryGoal?.title || 'Untitled Goal'}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{goalTypeInfo.label}</span>
            {primaryGoal?.category && (
              <>
                <span>•</span>
                <span>{primaryGoal.category}</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">
              {progressPercentage}%
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
            // Add different colors based on status
            style={{
              '--progress-background': isCompleted 
                ? '#10b981' 
                : isOverdue 
                  ? '#ef4444' 
                  : '#3b82f6'
            } as React.CSSProperties}
          />
        </div>

        {/* Amount Progress */}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-600">Current: </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(primaryGoal?.currentAmount)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Target: </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(primaryGoal?.targetAmount)}
            </span>
          </div>
        </div>

        {/* Days Remaining and Status */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className={`font-medium ${
              isCompleted 
                ? 'text-green-600' 
                : isOverdue 
                  ? 'text-red-600' 
                  : daysRemaining <= 30 
                    ? 'text-orange-600' 
                    : 'text-gray-600'
            }`}>
              {isCompleted 
                ? 'Completed!' 
                : isOverdue 
                  ? 'Overdue' 
                  : `${daysRemaining} days left`
              }
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {formatCurrency((primaryGoal?.targetAmount || 0) - (primaryGoal?.currentAmount || 0))} to go
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <NextLink href="/goals">
            <Button variant="outline" size="sm" className="w-full">
              View All Goals
            </Button>
          </NextLink>
        </div>
      </CardContent>
    </Card>
  )
}