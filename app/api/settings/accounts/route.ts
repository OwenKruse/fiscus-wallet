import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../lib/settings/settings-service';
import { getPlaidService } from '../../../../lib/plaid/plaid-service';
import { 
  AccountSettings,
  UpdateAccountSettingsRequest,
  ApiResponse 
} from '../../../../types';

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

// GET /api/settings/accounts - Get user account settings with connected accounts
async function getAccountSettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    
    const settingsService = getSettingsService();
    const plaidService = getPlaidService();
    
    // Get account settings from user preferences
    const userSettings = await settingsService.getUserSettings(user.id);
    
    // Get connected accounts from Plaid service
    const connectedAccounts = await plaidService.getAccountsWithInstitution(user.id);
    
    // Combine settings with connected accounts information
    const accountSettings = {
      ...userSettings.accounts,
      connectedAccounts: connectedAccounts.map(account => ({
        id: account.id,
        plaidAccountId: account.plaidAccountId,
        connectionId: account.connectionId,
        name: account.name,
        officialName: account.officialName,
        type: account.type,
        subtype: account.subtype,
        balance: account.balance,
        institutionName: account.institutionName,
        lastUpdated: account.lastUpdated,
        status: 'active' // TODO: Get actual status from connection
      }))
    };
    
    return createSuccessResponse(accountSettings);

  } catch (error: any) {
    console.error('Get account settings error:', error);

    // Handle service-specific errors
    if (error.code === 'SETTINGS_FETCH_FAILED') {
      return createErrorResponse('Failed to fetch account settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch account settings', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/settings/accounts - Update user account settings
async function updateAccountSettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: UpdateAccountSettingsRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Validate autoSyncEnabled
    if (body.autoSyncEnabled !== undefined && typeof body.autoSyncEnabled !== 'boolean') {
      return createErrorResponse('autoSyncEnabled must be a boolean value', 400, 'VALIDATION_ERROR');
    }

    // Validate syncFrequency
    const validSyncFrequencies = ['realtime', 'hourly', 'daily'];
    if (body.syncFrequency !== undefined && !validSyncFrequencies.includes(body.syncFrequency)) {
      return createErrorResponse(
        `syncFrequency must be one of: ${validSyncFrequencies.join(', ')}`, 
        400, 
        'VALIDATION_ERROR'
      );
    }

    const settingsService = getSettingsService();
    const updatedAccounts = await settingsService.updateAccountSettings(user.id, body);

    // Log sync frequency changes for analytics
    if (body.syncFrequency !== undefined) {
      console.log(`User ${user.id} changed sync frequency to: ${body.syncFrequency}`);
    }

    if (body.autoSyncEnabled !== undefined) {
      console.log(`User ${user.id} ${body.autoSyncEnabled ? 'enabled' : 'disabled'} auto sync`);
    }

    return createSuccessResponse(
      updatedAccounts, 
      'Account settings updated successfully'
    );

  } catch (error: any) {
    console.error('Update account settings error:', error);

    // Handle validation errors from service
    if (error.code === 'VALIDATION_ERROR') {
      const validationErrors = error.details?.validationErrors || [];
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.map((e: any) => e.message).join(', ')
        : error.message;
      return createErrorResponse(errorMessage, 400, 'VALIDATION_ERROR');
    }

    // Handle service-specific errors
    if (error.code === 'ACCOUNTS_UPDATE_FAILED') {
      return createErrorResponse('Failed to update account settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to update account settings', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getAccountSettingsHandler, { requireAuth: true, requireTenant: false }),
  'GET_ACCOUNT_SETTINGS'
);

export const PUT = withApiLogging(
  withApiAuth(updateAccountSettingsHandler, { requireAuth: true, requireTenant: false }),
  'UPDATE_ACCOUNT_SETTINGS'
);