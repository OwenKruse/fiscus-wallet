import { NextRequest, NextResponse } from 'next/server'
import { BillingHistoryService } from '../../../../lib/subscription/billing-history-service'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../../../../lib/auth/auth-middleware'

const prisma = new PrismaClient()
const billingHistoryService = new BillingHistoryService(prisma)

export async function GET(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    const userId = authResult.userId!
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 records
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const subscriptionId = searchParams.get('subscriptionId')

    let billingHistory
    
    if (subscriptionId) {
      // Verify user owns the subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId
        }
      })

      if (!subscription) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: 'Subscription not found or access denied'
          }
        }, { status: 404 })
      }

      billingHistory = await billingHistoryService.getBillingHistoryBySubscription(subscriptionId, limit, offset)
    } else {
      billingHistory = await billingHistoryService.getBillingHistory(userId, limit, offset)
    }

    // Get total count for pagination
    const totalCount = await prisma.billingHistory.count({
      where: subscriptionId ? { subscriptionId } : { userId }
    })

    // Calculate total billing amount for the user
    const totalAmount = await billingHistoryService.getTotalBillingAmount(userId)

    return NextResponse.json({
      success: true,
      data: {
        billingHistory,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount
        },
        summary: {
          totalAmount,
          currency: billingHistory[0]?.currency || 'usd'
        }
      }
    })

  } catch (error) {
    console.error('Error fetching billing history:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch billing history'
      }
    }, { status: 500 })
  }
}