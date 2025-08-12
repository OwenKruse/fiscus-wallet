import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, withApiLogging, withValidation } from '../../../../lib/auth/api-middleware'
import { UsageTrackingService } from '../../../../lib/subscription/usage-tracking-service'
import { PrismaClient } from '@prisma/client'
import { UsageMetricType } from '../../../../lib/subscription/types'

const prisma = new PrismaClient()
const usageTrackingService = new UsageTrackingService(prisma)

// Validation schema for tracking usage
function validateTrackUsage(body: any): { isValid: boolean; errors: string[]; data?: { metricType: UsageMetricType; increment: number; metadata?: any } } {
  const errors: string[] = []
  
  if (!body.metricType || !Object.values(UsageMetricType).includes(body.metricType)) {
    errors.push('Valid metricType is required (connected_accounts, total_balance, transaction_exports, api_calls, sync_requests)')
  }
  
  if (body.increment !== undefined) {
    if (typeof body.increment !== 'number' || body.increment < 0) {
      errors.push('increment must be a positive number')
    }
  }
  
  // Optional metadata validation
  if (body.metadata !== undefined && typeof body.metadata !== 'object') {
    errors.push('metadata must be an object')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      metricType: body.metricType,
      increment: body.increment || 1,
      metadata: body.metadata
    } : undefined
  }
}

// POST /api/usage/track - Track usage event
async function handleTrackUsage(request: NextRequest, context: any, body: { metricType: UsageMetricType; increment: number; metadata?: any }) {
  try {
    // Check if user can perform this action (enforce limits)
    await usageTrackingService.enforceUsageLimit(context.user.id, body.metricType, body.increment)
    
    // Track the usage
    await usageTrackingService.trackUsage(context.user.id, body.metricType, body.increment)
    
    // Get updated usage status for this specific metric
    const updatedMetric = await usageTrackingService.getUsageMetric(context.user.id, body.metricType)
    
    // Get overall usage status to provide context
    const usageStatus = await usageTrackingService.getUsageLimitStatus(context.user.id)
    const metricStatus = usageStatus[body.metricType]
    
    return NextResponse.json({
      success: true,
      data: {
        metric: updatedMetric,
        status: metricStatus,
        message: `Successfully tracked ${body.increment} ${body.metricType} usage`,
        metadata: body.metadata
      }
    })
  } catch (error) {
    console.error('Track usage error:', error)
    
    // Handle tier limit exceeded errors specifically
    if (error instanceof Error && error.name === 'TierLimitExceededError') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TIER_LIMIT_EXCEEDED',
          message: error.message,
          details: {
            metricType: body.metricType,
            requestedIncrement: body.increment,
            metadata: body.metadata
          }
        }
      }, { status: 403 })
    }
    
    // Handle subscription not found errors
    if (error instanceof Error && error.name === 'SubscriptionNotFoundError') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'User subscription not found. Please ensure user has a valid subscription.',
          details: {
            metricType: body.metricType,
            userId: context.user.id
          }
        }
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'USAGE_TRACK_ERROR',
        message: 'Failed to track usage',
        details: {
          metricType: body.metricType,
          increment: body.increment
        }
      }
    }, { status: 500 })
  }
}

// Route handlers
export const POST = withApiLogging(
  withApiAuth(
    withValidation(handleTrackUsage, validateTrackUsage)
  ),
  'track-usage'
)