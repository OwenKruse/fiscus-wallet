import { NextRequest, NextResponse } from 'next/server';
import { getCacheService } from '../../../lib/cache/cache-service';
import { withApiAuth, withApiLogging } from '../../../lib/auth/api-middleware';
import { TransactionsRequest, TransactionsResponse } from '../../../types';

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

// Validate and parse query parameters
function parseTransactionFilters(request: NextRequest): TransactionsRequest {
  const searchParams = request.nextUrl.searchParams;

  const filters: TransactionsRequest = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100), // Max 100 per page
  };

  // Parse account IDs
  const accountIds = searchParams.get('accountIds');
  if (accountIds) {
    filters.accountIds = accountIds.split(',').filter(id => id.trim());
  }

  // Parse date range
  const startDate = searchParams.get('startDate');
  if (startDate) {
    const parsed = new Date(startDate);
    if (!isNaN(parsed.getTime())) {
      filters.startDate = startDate;
    }
  }

  const endDate = searchParams.get('endDate');
  if (endDate) {
    const parsed = new Date(endDate);
    if (!isNaN(parsed.getTime())) {
      filters.endDate = endDate;
    }
  }

  // Parse amount filters
  const minAmount = searchParams.get('minAmount');
  if (minAmount) {
    const parsed = parseFloat(minAmount);
    if (!isNaN(parsed)) {
      filters.minAmount = parsed;
    }
  }

  const maxAmount = searchParams.get('maxAmount');
  if (maxAmount) {
    const parsed = parseFloat(maxAmount);
    if (!isNaN(parsed)) {
      filters.maxAmount = parsed;
    }
  }

  // Parse categories
  const categories = searchParams.get('categories');
  if (categories) {
    filters.categories = categories.split(',').filter(cat => cat.trim());
  }

  // Parse pending filter
  const pending = searchParams.get('pending');
  if (pending !== null) {
    filters.pending = pending === 'true';
  }

  // Parse search term
  const search = searchParams.get('search');
  if (search) {
    filters.search = search.trim();
  }

  return filters;
}

// Main handler for fetching transactions
async function getTransactionsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const cacheService = getCacheService();

    // Parse and validate filters
    const filters = parseTransactionFilters(request);

    // Validate pagination
    if ((filters.page ?? 1) < 1) {
      return createErrorResponse('Page number must be greater than 0', 400, 'INVALID_PAGE');
    }

    if ((filters.limit ?? 50) < 1 || (filters.limit ?? 50) > 100) {
      return createErrorResponse('Limit must be between 1 and 100', 400, 'INVALID_LIMIT');
    }

    // Validate date range if both dates are provided
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      if (start > end) {
        return createErrorResponse('Start date must be before end date', 400, 'INVALID_DATE_RANGE');
      }
    }

    // Get transactions from cache service
    const transactionsResponse = await cacheService.getTransactions(user.id, {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: transactionsResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Get transactions error:', error);

    // Handle specific error types
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    if (error.message?.includes('validation')) {
      return createErrorResponse('Invalid request parameters', 400, 'VALIDATION_ERROR');
    }

    return createErrorResponse('Failed to fetch transactions', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(getTransactionsHandler, { requireAuth: true, requireTenant: false }),
  'GET_TRANSACTIONS'
); 