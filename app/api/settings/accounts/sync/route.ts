import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../../lib/auth/api-middleware';
import { getPlaidService } from '../../../../../lib/plaid/plaid-service';
import { 
  ApiResponse 
} from '../../../../../types';

// Create error response helper
function createErrorResponse(message: string, status: number = 400, code?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    } as ApiResponse,
    { status }
  );
}

// Create success response helper
function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  } as ApiResponse<T>);
}

// POST /api/settings/accounts/sync - Manually sync account data
async function syncAccountsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: { 
      accountIds?: string[]; 
      forceRefresh?: boolean;
      startDate?: string;
      endDate?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Body is optional for sync, so we'll use defaults
    }

    // Validate optional fields
    if (body.accountIds !== undefined && !Array.isArray(body.accountIds)) {
      return createErrorResponse('accountIds must be an array', 400, 'VALIDATION_ERROR');
    }

    if (body.forceRefresh !== undefined && typeof body.forceRefresh !== 'boolean') {
      return createErrorResponse('forceRefresh must be a boolean', 400, 'VALIDATION_ERROR');
    }

    // Validate date strings if provided
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (body.startDate) {
      startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return createErrorResponse('startDate must be a valid ISO date string', 400, 'VALIDATION_ERROR');
      }
    }

    if (body.endDate) {
      endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return createErrorResponse('endDate must be a valid ISO date string', 400, 'VALIDATION_ERROR');
      }
    }

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      return createErrorResponse('startDate must be before endDate', 400, 'VALIDATION_ERROR');
    }

    const plaidService = getPlaidService();
    
    // Perform the sync
    const syncResult = await plaidService.syncTransactions(user.id, {
      forceRefresh: body.forceRefresh || false,
      accountIds: body.accountIds,
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
      endDate: endDate || new Date()
    });

    // Log the sync operation
    console.log(`Manual sync initiated by user ${user.id}`, {
      accountIds: body.accountIds,
      forceRefresh: body.forceRefresh,
      result: {
        success: syncResult.success,
        accountsUpdated: syncResult.accountsUpdated,
        transactionsAdded: syncResult.transactionsAdded,
        transactionsUpdated: syncResult.transactionsUpdated,
        errorCount: syncResult.errors.length
      }
    });

    return createSuccessResponse(
      syncResult, 
      syncResult.success 
        ? 'Account data synchronized successfully' 
        : 'Account sync completed with some errors'
    );

  } catch (error: any) {
    console.error('Sync accounts error:', error);

    // Handle Plaid-specific errors
    if (error.error_code) {
      return createErrorResponse(
        error.display_message || error.error_message || 'Failed to sync account data',
        400,
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

// Apply middleware and export handlers
export const POST = withApiLogging(
  withApiAuth(syncAccountsHandler, { requireAuth: true, requireTenant: false }),
  'SYNC_ACCOUNTS'
);