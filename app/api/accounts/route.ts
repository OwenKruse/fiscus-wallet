import { NextRequest, NextResponse } from 'next/server';
import { getCacheService } from '../../../lib/cache/cache-service';
import { withApiAuth, withApiLogging } from '../../../lib/auth/api-middleware';
import { AccountsResponse } from '../../../types';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../../../lib/subscription/subscription-service';
import { TierEnforcementService } from '../../../lib/subscription/tier-enforcement-service';

// Create error response
function createErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Main handler for fetching user accounts
async function getAccountsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const cacheService = getCacheService();

    // Get accounts from cache service
    const accountsResponse = await cacheService.getAccounts(user.id);

    // Check tier enforcement for balance limits
    const prisma = new PrismaClient();
    const subscriptionService = new SubscriptionService(prisma);
    const tierEnforcementService = new TierEnforcementService(prisma, subscriptionService);

    // Calculate total balance and check against tier limits
    const totalBalance = accountsResponse.accounts?.reduce((sum, account) => {
      return sum + (account.balances?.current || 0);
    }, 0) || 0;

    const userTier = await subscriptionService.getUserTier(user.id);
    const canTrackBalance = await tierEnforcementService.enforceBalanceLimit(user.id, totalBalance);

    // Track current balance usage
    await subscriptionService.trackUsage(user.id, 'total_balance', totalBalance);

    // Add tier information to response
    const tierLimits = await tierEnforcementService.getUserTierLimits(user.id);
    const usageSummary = await tierEnforcementService.getUsageSummary(user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...accountsResponse,
        tierInfo: {
          currentTier: userTier,
          balanceLimit: tierLimits.balanceLimit,
          totalBalance,
          canTrackBalance,
          usage: usageSummary.usage
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Get accounts error:', error);

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle cache errors
    if (error.message?.includes('cache')) {
      return createErrorResponse('Cache service error', 503, 'CACHE_ERROR');
    }

    return createErrorResponse('Failed to fetch accounts', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(getAccountsHandler, { requireAuth: true, requireTenant: false }),
  'GET_ACCOUNTS'
); 