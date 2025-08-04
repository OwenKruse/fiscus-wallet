import { NextRequest, NextResponse } from 'next/server';
import { getPlaidService } from '../../../../lib/plaid/plaid-service';
import { withApiAuth, withApiLogging, withValidation } from '../../../../lib/auth/api-middleware';

// Request interface for disconnect
interface PlaidDisconnectRequest {
  itemId: string;
}

// Validation for disconnect request
function validateDisconnectRequest(body: any): { isValid: boolean; errors: string[]; data?: PlaidDisconnectRequest } {
  const errors: string[] = [];

  if (!body.itemId || typeof body.itemId !== 'string') {
    errors.push('Item ID is required and must be a string');
  } else if (body.itemId.length < 5) {
    errors.push('Item ID appears to be invalid');
  }

  const data: PlaidDisconnectRequest = {
    itemId: body.itemId
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

// Main handler for disconnecting Plaid account
async function disconnectHandler(
  request: NextRequest,
  context: any,
  body: PlaidDisconnectRequest
): Promise<NextResponse> {
  try {
    const { user } = context;
    const plaidService = getPlaidService();

    // Revoke access and remove data
    await plaidService.revokeAccess(body.itemId, user.id);

    return NextResponse.json({
      success: true,
      message: 'Bank account disconnected successfully'
    });

  } catch (error: any) {
    console.error('Disconnect account error:', error);

    // Handle specific error cases
    if (error.message?.includes('Connection not found')) {
      return createErrorResponse(
        'Bank connection not found or already disconnected',
        404,
        'CONNECTION_NOT_FOUND'
      );
    }

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

    return createErrorResponse('Failed to disconnect bank account', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const POST = withApiLogging(
  withApiAuth(
    withValidation(disconnectHandler, validateDisconnectRequest),
    { requireAuth: true, requireTenant: false }
  ),
  'DISCONNECT_PLAID_ACCOUNT'
);