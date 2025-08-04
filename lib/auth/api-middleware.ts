// API Middleware Utilities for Authentication and Session Management

import { NextRequest, NextResponse } from 'next/server';
import { getNileAuthService } from './nile-auth-service';
import { NileUser } from '../../types/nile';

export interface ApiAuthContext {
  user: NileUser;
  token: string;
  tenantId: string;
}

export interface ApiMiddlewareOptions {
  requireAuth?: boolean;
  requireTenant?: boolean;
  allowedMethods?: string[];
}

// Extract token from various sources
function extractToken(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie (for browser requests)
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Check X-Auth-Token header
  const headerToken = request.headers.get('x-auth-token');
  if (headerToken) {
    return headerToken;
  }

  return null;
}

// Create standardized error response
function createApiErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'ERROR'),
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Main API authentication middleware
export function withApiAuth(
  handler: (request: NextRequest, context: ApiAuthContext & { params?: any }) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { 
        requireAuth = true, 
        requireTenant = true, 
        allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] 
      } = options;

      // Check if method is allowed
      if (!allowedMethods.includes(request.method)) {
        return createApiErrorResponse(`Method ${request.method} not allowed`, 405, 'METHOD_NOT_ALLOWED');
      }

      // Extract route parameters from URL path
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const params: any = {};
      
      // Extract dynamic route parameters based on common patterns
      // This is a simplified approach - in a real app, you might want a more robust solution
      if (pathSegments.includes('goals') && pathSegments.length > 2) {
        const goalIndex = pathSegments.indexOf('goals');
        if (goalIndex !== -1 && pathSegments[goalIndex + 1]) {
          params.id = pathSegments[goalIndex + 1];
        }
      }

      // Extract token from request
      const token = extractToken(request);

      if (!token) {
        if (requireAuth) {
          return createApiErrorResponse('Authentication token required', 401, 'TOKEN_MISSING');
        }
        // If auth not required, continue without user context
        return handler(request, { params } as ApiAuthContext & { params: any });
      }

      // Validate token and get user
      const authService = getNileAuthService();
      const user = await authService.getCurrentUser(token);

      if (!user) {
        return createApiErrorResponse('Invalid or expired token', 401, 'TOKEN_INVALID');
      }

      // Validate session
      const isValidSession = await authService.validateSession(token);
      if (!isValidSession) {
        return createApiErrorResponse('Session expired', 401, 'SESSION_EXPIRED');
      }

      // Check tenant requirement
      if (requireTenant && !user.tenantId) {
        return createApiErrorResponse('Tenant context required', 403, 'TENANT_REQUIRED');
      }

      // Create auth context with params
      const authContext: ApiAuthContext & { params?: any } = {
        user,
        token,
        tenantId: user.tenantId,
        params
      };

      // Call the handler with auth context
      return handler(request, authContext);

    } catch (error) {
      console.error('API auth middleware error:', error);
      return createApiErrorResponse('Authentication error', 500, 'INTERNAL_ERROR');
    }
  };
}

// Optional authentication middleware (doesn't require auth)
export function withOptionalApiAuth(
  handler: (request: NextRequest, context: Partial<ApiAuthContext> & { params?: any }) => Promise<NextResponse>
) {
  return withApiAuth(handler as any, { requireAuth: false, requireTenant: false });
}

// Middleware for API routes that need tenant isolation
export function withTenantApiAuth(
  handler: (request: NextRequest, context: ApiAuthContext & { params?: any }) => Promise<NextResponse>
) {
  return withApiAuth(handler, { requireAuth: true, requireTenant: true });
}

// Utility function to get auth context from request (for use in API routes)
export async function getApiAuthContext(request: NextRequest): Promise<ApiAuthContext | null> {
  try {
    const token = extractToken(request);
    if (!token) {
      return null;
    }

    const authService = getNileAuthService();
    const user = await authService.getCurrentUser(token);
    
    if (!user) {
      return null;
    }

    const isValidSession = await authService.validateSession(token);
    if (!isValidSession) {
      return null;
    }

    return {
      user,
      token,
      tenantId: user.tenantId
    };

  } catch (error) {
    console.error('Get API auth context error:', error);
    return null;
  }
}

// Middleware for handling CORS
export function withCORS(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const {
      origin = '*',
      methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      headers = ['Content-Type', 'Authorization', 'X-Auth-Token'],
      credentials = true
    } = options;

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': Array.isArray(origin) ? origin.join(', ') : origin,
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': headers.join(', '),
          'Access-Control-Allow-Credentials': credentials.toString(),
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Call the handler
    const response = await handler(request, context);

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(', ') : origin);
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', headers.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', credentials.toString());

    return response;
  };
}

// Rate limiting middleware for API routes
const apiRateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withApiRateLimit(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: { maxRequests: number; windowMs: number } = { maxRequests: 100, windowMs: 60000 }
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const key = context?.user?.id || request.ip || 'anonymous';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const [k, v] of apiRateLimitMap.entries()) {
      if (v.resetTime < windowStart) {
        apiRateLimitMap.delete(k);
      }
    }

    // Check current rate limit
    const current = apiRateLimitMap.get(key);
    if (current && current.count >= options.maxRequests && current.resetTime > windowStart) {
      return createApiErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Update rate limit
    if (current && current.resetTime > windowStart) {
      current.count++;
    } else {
      apiRateLimitMap.set(key, { count: 1, resetTime: now });
    }

    return handler(request, context);
  };
}

// Validation middleware for request body
export function withValidation<T>(
  handler: (request: NextRequest, context: any, body: T) => Promise<NextResponse>,
  validator: (body: any) => { isValid: boolean; errors: string[]; data?: T }
) {
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    try {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return createApiErrorResponse('Invalid JSON in request body', 400, 'INVALID_JSON');
      }

      const validation = validator(body);
      if (!validation.isValid) {
        return createApiErrorResponse(validation.errors.join(', '), 400, 'VALIDATION_ERROR');
      }

      return handler(request, context, validation.data || body);

    } catch (error) {
      console.error('Validation middleware error:', error);
      return createApiErrorResponse('Validation error', 500, 'INTERNAL_ERROR');
    }
  };
}

// Logging middleware for API routes
export function withApiLogging(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  action: string
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // Log request start
      console.log(`API Request: ${action}`, {
        requestId,
        method: request.method,
        url: request.url,
        userId: context?.user?.id,
        tenantId: context?.tenantId,
        timestamp: new Date().toISOString(),
        ip: request.ip || 'unknown'
      });

      const response = await handler(request, context);
      
      // Log successful response
      console.log(`API Response: ${action}`, {
        requestId,
        status: response.status,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      return response;

    } catch (error) {
      // Log error
      console.error(`API Error: ${action}`, {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  };
}

// Compose multiple middleware functions
export function composeMiddleware<T extends any[]>(
  ...middlewares: Array<(handler: any) => any>
) {
  return (handler: (...args: T) => Promise<NextResponse>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}