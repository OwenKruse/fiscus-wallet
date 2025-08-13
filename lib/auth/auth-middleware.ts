// Authentication Middleware for API Route Protection

import { NextRequest, NextResponse } from 'next/server';
import { getNileAuthService } from './nile-auth-service';
import { NileUser, JWTPayload } from '../../types/nile';

export interface AuthenticatedRequest extends NextRequest {
  user?: NileUser;
  token?: string;
  tenantId?: string;
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireTenant?: boolean;
  roles?: string[];
}

export interface AuthContext {
  user: NileUser;
  token: string;
  tenantId: string;
}

// Extract token from request headers
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

// Create error response
function createErrorResponse(message: string, status: number = 401) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Main authentication middleware
export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { requireAuth = true, requireTenant = true } = options;

      // Extract token from request
      const token = extractToken(request);

      if (!token) {
        if (requireAuth) {
          return createErrorResponse('Authentication token required');
        }
        // If auth not required, continue without user context
        return handler(request, {} as AuthContext);
      }

      // Validate token and get user
      const authService = getNileAuthService();
      const user = await authService.getCurrentUser(token);

      if (!user) {
        return createErrorResponse('Invalid or expired token');
      }

      // Validate session
      const isValidSession = await authService.validateSession(token);
      if (!isValidSession) {
        return createErrorResponse('Session expired');
      }

      // Check tenant requirement
      if (requireTenant && !user.tenantId) {
        return createErrorResponse('Tenant context required', 403);
      }

      // Create auth context
      const authContext: AuthContext = {
        user,
        token,
        tenantId: user.tenantId
      };

      // Call the handler with auth context
      return handler(request, authContext);

    } catch (error) {
      console.error('Auth middleware error:', error);
      return createErrorResponse('Authentication error', 500);
    }
  };
}

// Optional authentication middleware (doesn't require auth)
export function withOptionalAuth(
  handler: (request: NextRequest, context: Partial<AuthContext>) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { requireAuth = false, requireTenant = false } = { requireAuth: false, requireTenant: false };

      // Extract token from request
      const token = extractToken(request);

      if (!token) {
        if (requireAuth) {
          return createErrorResponse('Authentication token required');
        }
        // If auth not required, continue without user context
        return handler(request, {} as Partial<AuthContext>);
      }

      // Validate token and get user
      const authService = getNileAuthService();
      const user = await authService.getCurrentUser(token);

      if (!user) {
        if (requireAuth) {
          return createErrorResponse('Invalid or expired token');
        }
        // If auth not required, continue without user context
        return handler(request, {} as Partial<AuthContext>);
      }

      // Validate session
      const isValidSession = await authService.validateSession(token);
      if (!isValidSession) {
        if (requireAuth) {
          return createErrorResponse('Session expired');
        }
        // If auth not required, continue without user context
        return handler(request, {} as Partial<AuthContext>);
      }

      // Check tenant requirement
      if (requireTenant && !user.tenantId) {
        return createErrorResponse('Tenant context required', 403);
      }

      // Create auth context
      const authContext: Partial<AuthContext> = {
        user,
        token,
        tenantId: user.tenantId
      };

      // Call the handler with auth context
      return handler(request, authContext);

    } catch (error) {
      console.error('Auth middleware error:', error);
      return createErrorResponse('Authentication error', 500);
    }
  };
}

// Middleware for API routes that need tenant isolation
export function withTenantAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return withAuth(handler, { requireAuth: true, requireTenant: true });
}

// Higher-order function for protecting API routes
export function protectRoute(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options?: AuthMiddlewareOptions
) {
  return withAuth(handler, options);
}

// Utility function to get auth context from request (for use in API routes)
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
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
    console.error('Get auth context error:', error);
    return null;
  }
}

// Utility function to check if user has required role
export function hasRole(user: NileUser, requiredRole: string): boolean {
  // This would be implemented based on your role system
  // For now, return true as roles aren't implemented yet
  return true;
}

// Utility function to check if user can access tenant
export function canAccessTenant(user: NileUser, tenantId: string): boolean {
  return user.tenantId === tenantId;
}

// CSRF protection middleware
export function withCSRFProtection(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: AuthContext): Promise<NextResponse> => {
    // Only check CSRF for state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const csrfToken = request.headers.get('x-csrf-token');
      const cookieCSRF = request.cookies.get('csrf-token')?.value;

      if (!csrfToken || !cookieCSRF || csrfToken !== cookieCSRF) {
        return createErrorResponse('CSRF token mismatch', 403);
      }
    }

    return handler(request, context);
  };
}

// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options: { maxRequests: number; windowMs: number } = { maxRequests: 100, windowMs: 60000 }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const key = 'anonymous';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < windowStart) {
        rateLimitMap.delete(k);
      }
    }

    // Check current rate limit
    const current = rateLimitMap.get(key);
    if (current && current.count >= options.maxRequests && current.resetTime > windowStart) {
      return createErrorResponse('Rate limit exceeded', 429);
    }

    // Update rate limit
    if (current && current.resetTime > windowStart) {
      current.count++;
    } else {
      rateLimitMap.set(key, { count: 1, resetTime: now });
    }

    return handler(req, {} as AuthContext);      // await if you need to
  };
}

// Audit logging middleware (for authenticated routes)
export function withAuditLog(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  action: string
) {
  return async (request: NextRequest, context: AuthContext): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      const response = await handler(request, context);
      
      // Log successful operation
      console.log(`Audit: ${action}`, {
        userId: context.user?.id,
        tenantId: context.tenantId,
        method: request.method,
        url: request.url,
        status: response.status,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      return response;

    } catch (error) {
      // Log failed operation
      console.error(`Audit: ${action} failed`, {
        userId: context.user?.id,
        tenantId: context.tenantId,
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  };
}

// Audit logging middleware (for unauthenticated routes)
export function withUnauthenticatedAuditLog(
  handler: (request: NextRequest) => Promise<NextResponse>,
  action: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const response = await handler(request);
      console.log(`Audit: ${action} - Success`);
      return response;
    } catch (error) {
      console.error(`Audit: ${action} - Error:`, error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      );
    }
  };
}

// Export alias for backward compatibility
export const authMiddleware = withAuth;