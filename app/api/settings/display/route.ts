import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../lib/settings/settings-service';
import { 
  DisplaySettings,
  UpdateDisplaySettingsRequest,
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

// Validation helpers
const VALID_THEMES = ['light', 'dark', 'system'];
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
const VALID_DATE_FORMATS = ['MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MMM dd, yyyy'];
const VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'];

// GET /api/settings/display - Get user display settings
async function getDisplaySettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    
    const settingsService = getSettingsService();
    const userSettings = await settingsService.getUserSettings(user.id);
    
    return createSuccessResponse(userSettings.display);

  } catch (error: any) {
    console.error('Get display settings error:', error);

    // Handle service-specific errors
    if (error.code === 'SETTINGS_FETCH_FAILED') {
      return createErrorResponse('Failed to fetch display settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch display settings', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/settings/display - Update user display settings
async function updateDisplaySettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: UpdateDisplaySettingsRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Validate theme
    if (body.theme !== undefined && !VALID_THEMES.includes(body.theme)) {
      return createErrorResponse(
        `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}`, 
        400, 
        'VALIDATION_ERROR'
      );
    }

    // Validate currency format
    if (body.currencyFormat !== undefined && !VALID_CURRENCIES.includes(body.currencyFormat)) {
      return createErrorResponse(
        `Invalid currency format. Must be one of: ${VALID_CURRENCIES.join(', ')}`, 
        400, 
        'VALIDATION_ERROR'
      );
    }

    // Validate date format
    if (body.dateFormat !== undefined && !VALID_DATE_FORMATS.includes(body.dateFormat)) {
      return createErrorResponse(
        `Invalid date format. Must be one of: ${VALID_DATE_FORMATS.join(', ')}`, 
        400, 
        'VALIDATION_ERROR'
      );
    }

    // Validate timezone (basic validation - just check if it's a string)
    if (body.timezone !== undefined && typeof body.timezone !== 'string') {
      return createErrorResponse('Timezone must be a string', 400, 'VALIDATION_ERROR');
    }

    // Validate language
    if (body.language !== undefined && !VALID_LANGUAGES.includes(body.language)) {
      return createErrorResponse(
        `Invalid language. Must be one of: ${VALID_LANGUAGES.join(', ')}`, 
        400, 
        'VALIDATION_ERROR'
      );
    }

    const settingsService = getSettingsService();
    const updatedDisplay = await settingsService.updateDisplaySettings(user.id, body);

    // Log theme changes for analytics (optional)
    if (body.theme !== undefined) {
      console.log(`User ${user.id} changed theme to: ${body.theme}`);
    }

    // Log currency changes for analytics (optional)
    if (body.currencyFormat !== undefined) {
      console.log(`User ${user.id} changed currency format to: ${body.currencyFormat}`);
    }

    return createSuccessResponse(
      updatedDisplay, 
      'Display settings updated successfully'
    );

  } catch (error: any) {
    console.error('Update display settings error:', error);

    // Handle validation errors from service
    if (error.code === 'VALIDATION_ERROR') {
      const validationErrors = error.details?.validationErrors || [];
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.map((e: any) => e.message).join(', ')
        : error.message;
      return createErrorResponse(errorMessage, 400, 'VALIDATION_ERROR');
    }

    // Handle service-specific errors
    if (error.code === 'DISPLAY_UPDATE_FAILED') {
      return createErrorResponse('Failed to update display settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to update display settings', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getDisplaySettingsHandler, { requireAuth: true, requireTenant: false }),
  'GET_DISPLAY_SETTINGS'
);

export const PUT = withApiLogging(
  withApiAuth(updateDisplaySettingsHandler, { requireAuth: true, requireTenant: false }),
  'UPDATE_DISPLAY_SETTINGS'
);