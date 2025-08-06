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

// POST /api/settings/accounts/disconnect - Disconnect a Plaid account
async function disconnectAccountHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: { itemId: string; reason?: string };

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Validate required fields
    if (!body.itemId || typeof body.itemId !== 'string') {
      return createErrorResponse('itemId is required and must be a string', 400, 'VALIDATION_ERROR');
    }

    // Optional reason validation
    if (body.reason !== undefined && typeof body.reason !== 'string') {
      return createErrorResponse('reason must be a string', 400, 'VALIDATION_ERROR');
    }

    const plaidService = getPlaidService();
    
    // Revoke access to the Plaid item
    await plaidService.revokeAccess(body.itemId, user.id);

    // Log the disconnection for audit purposes
    console.log(`User ${user.id} disconnected Plaid item ${body.itemId}`, {
      reason: body.reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });

    return createSuccessResponse(
      { 
        itemId: body.itemId,
        status: 'disconnected',
        disconnectedAt: new Date().toISOString()
      }, 
      'Account disconnected successfully'
    );

  } catch (error: any) {
    console.error('Disconnect account error:', error);

    // Handle Plaid-specific errors
    if (error.error_code) {
      return createErrorResponse(
        error.display_message || error.error_message || 'Failed to disconnect account',
        400,
        error.error_code
      );
    }

    // Handle connection not found
    if (error.message?.includes('Connection not found')) {
      return createErrorResponse('Account connection not found', 404, 'CONNECTION_NOT_FOUND');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to disconnect account', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const POST = withApiLogging(
  withApiAuth(disconnectAccountHandler, { requireAuth: true, requireTenant: false }),
  'DISCONNECT_ACCOUNT'
);