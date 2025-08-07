import { NextRequest, NextResponse } from 'next/server';
import { getPlaidService } from '../../../../lib/plaid/plaid-service';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { SyncRequest, SyncResponse } from '../../../../types';

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

    // Sync transactions with the provided options
    const syncResult = await plaidService.syncTransactions(user.id, {
      forceRefresh: body.forceRefresh || false,
      accountIds: body.accountIds,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });

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