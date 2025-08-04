import { NextRequest, NextResponse } from 'next/server';
import { getPlaidService } from '../../../../lib/plaid/plaid-service';
import { withApiAuth, withApiLogging, withValidation } from '../../../../lib/auth/api-middleware';
import { PlaidLinkTokenRequest, PlaidLinkTokenResponse } from '../../../../types';

// Validation for create link token request
function validateLinkTokenRequest(body: any): { isValid: boolean; errors: string[]; data?: PlaidLinkTokenRequest } {
  const errors: string[] = [];

  // Validate products array if provided
  if (body.products && !Array.isArray(body.products)) {
    errors.push('Products must be an array');
  }

  if (body.products && body.products.length > 0) {
    const validProducts = ['transactions', 'assets'];
    const invalidProducts = body.products.filter((p: string) => !validProducts.includes(p));
    if (invalidProducts.length > 0) {
      errors.push(`Invalid products: ${invalidProducts.join(', ')}`);
    }
  }

  // userId is optional in request body since it comes from auth context
  const data: PlaidLinkTokenRequest = {
    userId: body.userId || '', // Will be overridden by auth context
    products: body.products || undefined
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

// Main handler for creating Plaid Link token
async function createLinkTokenHandler(
  request: NextRequest,
  context: any,
  body: PlaidLinkTokenRequest
): Promise<NextResponse> {
  try {
    const { user } = context;
    const plaidService = getPlaidService();

    // Create link token using user ID from auth context and optional products
    const linkToken = await plaidService.createLinkToken(user.id, body.products);

    const response: PlaidLinkTokenResponse = {
      linkToken,
      expiration: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours from now
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error: any) {
    console.error('Create link token error:', error);

    // Handle Plaid-specific errors
    if (error.error_code) {
      return createErrorResponse(
        error.display_message || error.error_message || 'Plaid API error',
        error.status || 400,
        error.error_code
      );
    }

    return createErrorResponse('Failed to create link token', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const POST = withApiLogging(
  withApiAuth(
    withValidation(createLinkTokenHandler, validateLinkTokenRequest),
    { requireAuth: true, requireTenant: false }
  ),
  'CREATE_PLAID_LINK_TOKEN'
);