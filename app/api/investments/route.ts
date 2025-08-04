import { NextRequest, NextResponse } from 'next/server';
import { getPlaidService } from '@/lib/plaid/plaid-service';
import { withApiAuth, withApiLogging } from '@/lib/auth/api-middleware';
import { ApiResponse } from '@/types';

export interface InvestmentHolding {
  id: string;
  accountId: string;
  securityId: string;
  institutionValue: number;
  institutionPrice: number;
  quantity: number;
  costBasis?: number;
  security: {
    securityId: string;
    name: string;
    tickerSymbol?: string;
    type: string;
    closePrice?: number;
    closePriceAsOf?: string;
  };
}

export interface InvestmentTransaction {
  id: string;
  accountId: string;
  securityId?: string;
  type: string;
  subtype: string;
  quantity?: number;
  price?: number;
  fees?: number;
  amount: number;
  date: string;
  name: string;
  security?: {
    securityId: string;
    name: string;
    tickerSymbol?: string;
    type: string;
  };
}

export interface InvestmentsResponse {
  holdings: InvestmentHolding[];
  transactions: InvestmentTransaction[];
  accounts: {
    id: string;
    name: string;
    type: string;
    subtype: string;
    balance: {
      available?: number;
      current: number;
      limit?: number;
    };
    institutionName: string;
  }[];
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

// Main handler for fetching investment data
async function getInvestmentsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const plaidService = getPlaidService();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const accountIds = searchParams.get('accountIds')?.split(',').filter(Boolean);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
      // Get investment accounts
      const accounts = await plaidService.getAccountsWithInstitution(user.id);
      const investmentAccounts = accounts.filter(account => 
        account.type === 'investment' || 
        account.subtype === 'brokerage' ||
        account.subtype === '401k' ||
        account.subtype === 'ira' ||
        account.subtype === 'roth'
      );

      // Filter by requested account IDs if provided
      const filteredAccounts = accountIds 
        ? investmentAccounts.filter(account => accountIds.includes(account.id))
        : investmentAccounts;

      // For now, return the investment accounts with mock holdings and transactions
      // In a real implementation, you would call Plaid's investments endpoints
      // TODO: Implement actual Plaid investments API calls when available
      const response: InvestmentsResponse = {
        holdings: [],
        transactions: [],
        accounts: filteredAccounts.map(account => ({
          id: account.id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          balance: account.balance,
          institutionName: account.institutionName,
        })),
      };

      return NextResponse.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      } as ApiResponse<InvestmentsResponse>);

    } catch (plaidError) {
      console.error('Plaid service error:', plaidError);
      
      // Return empty data instead of failing completely
      const response: InvestmentsResponse = {
        holdings: [],
        transactions: [],
        accounts: [],
      };

      return NextResponse.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      } as ApiResponse<InvestmentsResponse>);
    }

  } catch (error: any) {
    console.error('Get investments error:', error);

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle Plaid errors
    if (error.message?.includes('plaid')) {
      return createErrorResponse('Investment data service error', 503, 'PLAID_ERROR');
    }

    return createErrorResponse('Failed to fetch investments', 500, 'GET_INVESTMENTS_FAILED');
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(getInvestmentsHandler, { requireAuth: true, requireTenant: false }),
  'GET_INVESTMENTS'
);