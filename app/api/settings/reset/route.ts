import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../lib/settings/settings-service';
import { 
  SettingsCategory,
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

// POST /api/settings/reset - Reset user settings to defaults
async function resetSettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: { 
      category?: SettingsCategory; 
      confirmReset?: boolean;
      reason?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Body is optional, we can reset all settings
    }

    // Validate category if provided
    const validCategories: SettingsCategory[] = ['profile', 'notifications', 'display', 'privacy', 'accounts'];
    if (body.category !== undefined && !validCategories.includes(body.category)) {
      return createErrorResponse(
        `Invalid category. Must be one of: ${validCategories.join(', ')}`, 
        400, 
        'VALIDATION_ERROR'
      );
    }

    // Require confirmation for reset operations
    if (body.confirmReset !== true) {
      return createErrorResponse(
        'Reset operation requires explicit confirmation. Set confirmReset to true.', 
        400, 
        'CONFIRMATION_REQUIRED'
      );
    }

    // Optional reason validation
    if (body.reason !== undefined && typeof body.reason !== 'string') {
      return createErrorResponse('reason must be a string', 400, 'VALIDATION_ERROR');
    }

    const settingsService = getSettingsService();
    
    // Perform the reset
    await settingsService.resetUserSettings(user.id, body.category);

    // Log the reset operation for audit purposes
    console.log(`Settings reset by user ${user.id}`, {
      category: body.category || 'all',
      reason: body.reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });

    const resetScope = body.category ? `${body.category} settings` : 'all settings';
    
    return createSuccessResponse(
      { 
        userId: user.id,
        category: body.category || 'all',
        resetAt: new Date().toISOString(),
        success: true
      }, 
      `Successfully reset ${resetScope} to defaults`
    );

  } catch (error: any) {
    console.error('Reset settings error:', error);

    // Handle validation errors from service
    if (error.code === 'VALIDATION_ERROR') {
      const validationErrors = error.details?.validationErrors || [];
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.map((e: any) => e.message).join(', ')
        : error.message;
      return createErrorResponse(errorMessage, 400, 'VALIDATION_ERROR');
    }

    // Handle service-specific errors
    if (error.code === 'SETTINGS_RESET_FAILED') {
      return createErrorResponse('Failed to reset settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to reset settings', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const POST = withApiLogging(
  withApiAuth(resetSettingsHandler, { requireAuth: true, requireTenant: false }),
  'RESET_SETTINGS'
);