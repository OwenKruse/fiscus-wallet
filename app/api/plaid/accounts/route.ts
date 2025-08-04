import { NextRequest, NextResponse } from 'next/server';
import { getPlaidService } from '../../../../lib/plaid/plaid-service';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { AccountsResponse } from '../../../../types';

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
    const plaidService = getPlaidService();

    // Get accounts with institution information from database
    const accounts = await plaidService.getAccountsWithInstitution(user.id);

    // Transform accounts to match API response format
    const transformedAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      officialName: account.officialName || undefined,
      type: account.type,
      subtype: account.subtype,
      balance: {
        available: account.balance.available || undefined,
        current: account.balance.current,
        limit: account.balance.limit || undefined
      },
      institutionName: account.institutionName || 'Unknown Bank',
      lastUpdated: account.lastUpdated.toISOString()
    }));

    const response: AccountsResponse = {
      accounts: transformedAccounts
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error: any) {
    console.error('Get accounts error:', error);

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch accounts', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(getAccountsHandler, { requireAuth: true, requireTenant: false }),
  'GET_PLAID_ACCOUNTS'
);