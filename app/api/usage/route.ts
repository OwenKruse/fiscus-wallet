import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, withApiLogging } from '../../../lib/auth/api-middleware'
import { SubscriptionService } from '../../../lib/subscription/subscription-service'
import { UsageTrackingService } from '../../../lib/subscription/usage-tracking-service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const subscriptionService = new SubscriptionService(prisma)
const usageTrackingService = new UsageTrackingService(prisma)

// GET /api/usage - Get current usage metrics
async function handleGetUsage(request: NextRequest, context: any) {
  try {
    const url = new URL(request.url)
    const includeStatus = url.searchParams.get('includeStatus') === 'true'
    
    if (includeStatus) {
      // Get usage status with limits and percentages
      const usageStatus = await usageTrackingService.getUsageLimitStatus(context.user.id)
      
      return NextResponse.json({
        success: true,
        data: {
          usage: usageStatus,
          timestamp: new Date().toISOString()
        }
      })
    } else {
      // Get raw usage metrics
      const usage = await usageTrackingService.getCurrentUsage(context.user.id)
      
      return NextResponse.json({
        success: true,
        data: {
          usage,
          timestamp: new Date().toISOString()
        }
      })
    }
  } catch (error) {
    console.error('Get usage error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'USAGE_FETCH_ERROR',
        message: 'Failed to fetch usage metrics'
      }
    }, { status: 500 })
  }
}

// Route handlers
export const GET = withApiLogging(
  withApiAuth(handleGetUsage),
  'get-usage'
)