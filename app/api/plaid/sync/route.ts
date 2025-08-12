import { NextRequest, NextResponse } from 'next/server';
import { getPlaidService } from '../../../../lib/plaid/plaid-service';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { SyncRequest, SyncResponse } from '../../../../types';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../../../../lib/subscription/subscription-service';
import { TierEnforcementService } from '../../../../lib/subscription/tier-enforcement-service';
import { TierLimitExceededError } from '../../../../lib/subscription/types';

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

// Main handler for syncing Plaid data
async function syncHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: SyncRequest = {};

    // Parse request body if present
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        // If JSON parsing fails, use empty body (defaults will be used)
      }
    }

    const plaidService = getPlaidService();

    // Check tier enforcement before syncing
    const prisma = new PrismaClient();
    const subscriptionService = new SubscriptionService(prisma);
    const tierEnforcementService = new TierEnforcementService(prisma, subscriptionService);

    // Get current account balances to check against limits
    try {
      const accounts = await plaidService.getAccountsWithInstitution(user.id);
      const totalBalance = accounts.reduce((sum, account) => {
        return sum + (account.balance?.current || 0);
      }, 0);

      // Check if the total balance exceeds tier limits
      await tierEnforcementService.checkBalanceLimitWithThrow(user.id, totalBalance);
    } catch (error) {
      if (error instanceof TierLimitExceededError) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'BALANCE_LIMIT_EXCEEDED',
            message: error.message,
            limitType: error.limitType,
            currentValue: error.currentValue,
            limitValue: error.limitValue,
            requiredTier: error.requiredTier,
            upgradeRequired: true
          }
        }, { status: 403 });
      }
      // Log but don't fail sync for other errors
      console.warn('Tier enforcement check failed during sync:', error);
    }

    // Sync transactions with the provided options
    const syncResult = await plaidService.syncTransactions(user.id, {
      forceRefresh: body.forceRefresh || false,
      accountIds: body.accountIds,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });

    // Update usage metrics after successful sync
    try {
      const accounts = await plaidService.getAccountsWithInstitution(user.id);
      const totalBalance = accounts.reduce((sum, account) => {
        return sum + (account.balance?.current || 0);
      }, 0);
      
      await subscriptionService.trackUsage(user.id, 'total_balance', totalBalance);
      await subscriptionService.trackUsage(user.id, 'sync_requests', 1);
    } catch (usageError) {
      console.warn('Failed to update usage metrics after sync:', usageError);
      // Don't fail the sync if usage tracking fails
    }

    const response: SyncResponse = {
      success: syncResult.success,
      accountsUpdated: syncResult.accountsUpdated,
      transactionsAdded: syncResult.transactionsAdded,
      transactionsUpdated: syncResult.transactionsUpdated,
      errors: syncResult.errors,
      lastSyncTime: syncResult.lastSyncTime.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error: any) {
    console.error('Sync error:', error);

    // Handle Plaid-specific errors
    if (error.error_code) {
      return createErrorResponse(
        error.display_message || error.error_message || 'Plaid API error',
        error.status || 400,
        error.error_code
      );
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to sync account data', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const POST = withApiLogging(
  withApiAuth(syncHandler, { requireAuth: true, requireTenant: false }),
  'SYNC_PLAID_DATA'
);