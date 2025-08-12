import { NextRequest, NextResponse } from 'next/server';
import { getCacheService } from '../../../../lib/cache/cache-service';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../../../../lib/subscription/subscription-service';
import { TierEnforcementService } from '../../../../lib/subscription/tier-enforcement-service';
import { FeatureNotAvailableError } from '../../../../lib/subscription/types';

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

// Convert transactions to CSV format
function convertToCSV(transactions: any[]): string {
  if (!transactions || transactions.length === 0) {
    return 'Date,Description,Amount,Category,Account\n';
  }

  const headers = 'Date,Description,Amount,Category,Account\n';
  const rows = transactions.map(transaction => {
    const date = new Date(transaction.date).toLocaleDateString();
    const description = `"${transaction.name || transaction.description || ''}"`;
    const amount = transaction.amount || 0;
    const category = `"${transaction.category?.join(', ') || ''}"`;
    const account = `"${transaction.account?.name || ''}"`;
    
    return `${date},${description},${amount},${category},${account}`;
  }).join('\n');

  return headers + rows;
}

// Main handler for exporting transactions as CSV
async function exportTransactionsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;

    // Check tier enforcement for CSV export feature
    const prisma = new PrismaClient();
    const subscriptionService = new SubscriptionService(prisma);
    const tierEnforcementService = new TierEnforcementService(prisma, subscriptionService);

    try {
      await tierEnforcementService.checkFeatureAccessWithThrow(user.id, 'csv_export');
    } catch (error) {
      if (error instanceof FeatureNotAvailableError) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: error.message,
            feature: error.feature,
            requiredTier: error.requiredTier,
            upgradeRequired: true
          }
        }, { status: 403 });
      }
      throw error;
    }

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountIds = searchParams.get('accountIds')?.split(',').filter(id => id.trim());

    // Apply transaction history limits based on tier
    const transactionHistoryMonths = await tierEnforcementService.enforceTransactionHistory(user.id);
    let effectiveStartDate = startDate ? new Date(startDate) : undefined;
    
    if (transactionHistoryMonths !== -1) { // -1 means unlimited
      const limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() - transactionHistoryMonths);
      
      // If user requested data older than their tier allows, limit it
      if (!effectiveStartDate || effectiveStartDate < limitDate) {
        effectiveStartDate = limitDate;
      }
    }

    // Get transactions from cache service
    const cacheService = getCacheService();
    const transactionsResponse = await cacheService.getTransactions(user.id, {
      startDate: effectiveStartDate,
      endDate: endDate ? new Date(endDate) : undefined,
      accountIds,
      limit: 10000, // Large limit for export
    });

    // Track usage for export feature
    await subscriptionService.trackUsage(user.id, 'transaction_exports', 1);

    // Convert to CSV
    const csvData = convertToCSV(transactionsResponse.transactions || []);

    // Create filename with date range
    const fromDate = effectiveStartDate ? effectiveStartDate.toISOString().split('T')[0] : 'all';
    const toDate = endDate ? new Date(endDate).toISOString().split('T')[0] : 'latest';
    const filename = `transactions_${fromDate}_to_${toDate}.csv`;

    // Return CSV file
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('Export transactions error:', error);

    // Handle specific error types
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    if (error.message?.includes('validation')) {
      return createErrorResponse('Invalid request parameters', 400, 'VALIDATION_ERROR');
    }

    return createErrorResponse('Failed to export transactions', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(exportTransactionsHandler, { requireAuth: true, requireTenant: false }),
  'EXPORT_TRANSACTIONS'
);