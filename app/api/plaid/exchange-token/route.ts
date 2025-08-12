import { NextRequest, NextResponse } from 'next/server';
import { getPlaidService } from '../../../../lib/plaid/plaid-service';
import { withApiAuth, withApiLogging, withValidation } from '../../../../lib/auth/api-middleware';
import { PlaidExchangeTokenRequest, PlaidExchangeTokenResponse } from '../../../../types';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../../../../lib/subscription/subscription-service';
import { TierEnforcementService } from '../../../../lib/subscription/tier-enforcement-service';
import { TierLimitExceededError } from '../../../../lib/subscription/types';

// Validation for exchange token request
function validateExchangeTokenRequest(body: any): { isValid: boolean; errors: string[]; data?: PlaidExchangeTokenRequest } {
  const errors: string[] = [];

  if (!body.publicToken || typeof body.publicToken !== 'string') {
    errors.push('Public token is required and must be a string');
  } else if (body.publicToken.length < 10) {
    errors.push('Public token appears to be invalid');
  }

  const data: PlaidExchangeTokenRequest = {
    publicToken: body.publicToken,
    userId: body.userId || '' // Will be overridden by auth context
  };

  return {
    isValid: errors.length === 0,
    errors,
    data
  };
}

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

// Main handler for exchanging public token
async function exchangeTokenHandler(
  request: NextRequest,
  context: any,
  body: PlaidExchangeTokenRequest
): Promise<NextResponse> {
  try {
    const { user } = context;
    const plaidService = getPlaidService();

    // Check tier enforcement for account connection
    const prisma = new PrismaClient();
    const subscriptionService = new SubscriptionService(prisma);
    const tierEnforcementService = new TierEnforcementService(prisma, subscriptionService);

    try {
      await tierEnforcementService.checkAccountLimitWithThrow(user.id);
    } catch (error) {
      if (error instanceof TierLimitExceededError) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'ACCOUNT_LIMIT_EXCEEDED',
            message: error.message,
            limitType: error.limitType,
            currentValue: error.currentValue,
            limitValue: error.limitValue,
            requiredTier: error.requiredTier,
            upgradeRequired: true
          }
        }, { status: 403 });
      }
      throw error;
    }

    // Exchange public token for access token and store connection
    const connectionResult = await plaidService.exchangePublicToken(body.publicToken, user.id);

    // Track the new account connection in usage metrics
    await subscriptionService.trackUsage(user.id, 'connected_accounts', 1);

    // Automatically sync transactions for the new connection
    try {
      console.log(`Triggering initial transaction sync for user ${user.id}`);
      await plaidService.syncTransactions(user.id, {
        forceRefresh: true,
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        endDate: new Date()
      });
      console.log(`Initial transaction sync completed for user ${user.id}`);
    } catch (syncError) {
      console.error('Failed to sync transactions after account connection:', syncError);
      // Don't fail the connection if sync fails - user can manually sync later
    }

    const response: PlaidExchangeTokenResponse = {
      success: true,
      institutionName: connectionResult.institutionName,
      accountsCount: connectionResult.accounts.length
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: `Successfully connected to ${connectionResult.institutionName}`
    });

  } catch (error: any) {
    console.error('Exchange token error:', error);

    // Handle Plaid-specific errors
    if (error.error_code) {
      return createErrorResponse(
        error.display_message || error.error_message || 'Plaid API error',
        error.status || 400,
        error.error_code
      );
    }

    // Handle database errors
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return createErrorResponse(
        'This bank account is already connected',
        409,
        'ACCOUNT_ALREADY_CONNECTED'
      );
    }

    return createErrorResponse('Failed to connect bank account', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const POST = withApiLogging(
  withApiAuth(
    withValidation(exchangeTokenHandler, validateExchangeTokenRequest),
    { requireAuth: true, requireTenant: false }
  ),
  'EXCHANGE_PLAID_TOKEN'
);