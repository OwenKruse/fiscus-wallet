import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../../lib/auth/api-middleware';
import { getNileClient } from '../../../../../lib/database/nile-client';
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

// GET /api/settings/accounts/connections - Get user's Plaid connections
async function getConnectionsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const dbClient = getNileClient();

    // Get user's Plaid connections with status information
    const connections = await dbClient.query(`
      SELECT 
        id,
        user_id as "userId",
        item_id as "itemId",
        institution_id as "institutionId",
        institution_name as "institutionName",
        accounts,
        status,
        last_sync as "lastSync",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM plaid_connections 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [user.id]);

    // Get account counts for each connection
    const connectionsWithCounts = await Promise.all(
      connections.map(async (connection: any) => {
        const accountCount = await dbClient.queryOne<{ count: number }>(`
          SELECT COUNT(*) as count
          FROM accounts 
          WHERE connection_id = $1
        `, [connection.id]);

        return {
          ...connection,
          accountCount: accountCount?.count || 0,
        };
      })
    );

    return createSuccessResponse({
      connections: connectionsWithCounts,
    });

  } catch (error: any) {
    console.error('Get connections error:', error);

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch connections', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getConnectionsHandler, { requireAuth: true, requireTenant: false }),
  'GET_ACCOUNT_CONNECTIONS'
);