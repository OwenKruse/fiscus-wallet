import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../../lib/settings/settings-service';
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

// GET /api/settings/privacy/two-factor - Get two-factor authentication status
async function getTwoFactorStatusHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    
    const settingsService = getSettingsService();
    const userSettings = await settingsService.getUserSettings(user.id);
    
    return createSuccessResponse({
      enabled: userSettings.privacy.twoFactorEnabled,
      // In a real implementation, you might also return:
      // - backup codes count
      // - last used date
      // - setup date
    });

  } catch (error: any) {
    console.error('Get two-factor status error:', error);

    // Handle service-specific errors
    if (error.code === 'SETTINGS_FETCH_FAILED') {
      return createErrorResponse('Failed to fetch two-factor authentication status', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch two-factor authentication status', 500, 'INTERNAL_ERROR');
  }
}

// POST /api/settings/privacy/two-factor - Setup or enable two-factor authentication
async function setupTwoFactorHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: { action: 'setup' | 'enable' | 'disable'; verificationCode?: string };

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    if (!body.action || !['setup', 'enable', 'disable'].includes(body.action)) {
      return createErrorResponse('Action must be one of: setup, enable, disable', 400, 'VALIDATION_ERROR');
    }

    if ((body.action === 'enable' || body.action === 'setup') && !body.verificationCode) {
      return createErrorResponse('Verification code is required for setup/enable', 400, 'VALIDATION_ERROR');
    }

    // TODO: Implement actual two-factor authentication logic
    // This is a placeholder implementation
    console.log(`Two-factor authentication ${body.action} requested for user ${user.id}`);
    
    // In a real implementation, this would:
    // 1. For 'setup': Generate QR code and secret key
    // 2. For 'enable': Verify the code and enable 2FA
    // 3. For 'disable': Verify current password and disable 2FA
    // 4. Generate backup codes
    // 5. Send confirmation email

    const settingsService = getSettingsService();
    
    if (body.action === 'setup') {
      // Generate setup data (placeholder)
      const setupData = {
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/FinanceApp:${user.email}?secret=PLACEHOLDER&issuer=FinanceApp`,
        secret: 'PLACEHOLDER_SECRET_KEY',
        backupCodes: [
          'BACKUP1', 'BACKUP2', 'BACKUP3', 'BACKUP4', 'BACKUP5'
        ]
      };

      return createSuccessResponse(
        setupData,
        'Two-factor authentication setup initiated. Please scan the QR code with your authenticator app.'
      );
    }

    if (body.action === 'enable') {
      // Verify code and enable (placeholder)
      await settingsService.updatePrivacySettings(user.id, { twoFactorEnabled: true });
      
      console.log(`Two-factor authentication enabled for user ${user.id}`);
      
      return createSuccessResponse(
        { enabled: true },
        'Two-factor authentication enabled successfully'
      );
    }

    if (body.action === 'disable') {
      // Disable 2FA (placeholder)
      await settingsService.updatePrivacySettings(user.id, { twoFactorEnabled: false });
      
      console.log(`Two-factor authentication disabled for user ${user.id}`);
      
      return createSuccessResponse(
        { enabled: false },
        'Two-factor authentication disabled successfully'
      );
    }

    return createErrorResponse('Invalid action', 400, 'VALIDATION_ERROR');

  } catch (error: any) {
    console.error('Two-factor authentication setup error:', error);

    // Handle validation errors from service
    if (error.code === 'VALIDATION_ERROR') {
      const validationErrors = error.details?.validationErrors || [];
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.map((e: any) => e.message).join(', ')
        : error.message;
      return createErrorResponse(errorMessage, 400, 'VALIDATION_ERROR');
    }

    // Handle invalid verification code
    if (error.code === 'INVALID_VERIFICATION_CODE') {
      return createErrorResponse('Invalid verification code', 400, 'INVALID_VERIFICATION_CODE');
    }

    // Handle service-specific errors
    if (error.code === 'TWO_FACTOR_SETUP_FAILED') {
      return createErrorResponse('Failed to setup two-factor authentication', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to setup two-factor authentication', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getTwoFactorStatusHandler, { requireAuth: true, requireTenant: false }),
  'GET_TWO_FACTOR_STATUS'
);

export const POST = withApiLogging(
  withApiAuth(setupTwoFactorHandler, { requireAuth: true, requireTenant: false }),
  'SETUP_TWO_FACTOR'
);