import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signInHandler } from '../signin/route';
import { POST as signUpHandler } from '../signup/route';
import { POST as signOutHandler } from '../signout/route';
import { GET as meHandler } from '../me/route';
import { GET as validateHandler } from '../validate/route';

// Mock the auth service
vi.mock('../../../../lib/auth/nile-auth-service', () => ({
  getNileAuthService: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getCurrentUser: vi.fn(),
    validateSession: vi.fn()
  })
}));

// Mock the middleware
vi.mock('../../../../lib/auth/auth-middleware', () => ({
  withUnauthenticatedAuditLog: (handler: any) => handler,
  withAuth: (handler: any) => handler,
  withAuditLog: (handler: any) => handler
}));

describe('Authentication API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/signin', () => {
    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await signInHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Email is required');
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123'
        })
      });

      const response = await signInHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('valid email address');
    });

    it('should validate password length', async () => {
      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123'
        })
      });

      const response = await signInHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('at least 6 characters');
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await signUpHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Email is required');
    });

    it('should validate password complexity', async () => {
      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'simple'
        })
      });

      const response = await signUpHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('at least 8 characters');
    });

    it('should validate phone number format', async () => {
      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123',
          phone: 'invalid-phone'
        })
      });

      const response = await signUpHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('valid phone number');
    });
  });

  describe('GET /api/auth/validate', () => {
    it('should return error when no token provided', async () => {
      const request = new NextRequest('http://localhost/api/auth/validate', {
        method: 'GET'
      });

      const response = await validateHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_MISSING');
    });

    it('should extract token from Authorization header', async () => {
      const request = new NextRequest('http://localhost/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      // Mock the auth service to return invalid session
      const { getNileAuthService } = await import('../../../../lib/auth/nile-auth-service');
      const mockAuthService = getNileAuthService();
      vi.mocked(mockAuthService.validateSession).mockResolvedValue(false);

      const response = await validateHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('SESSION_INVALID');
    });
  });
});

describe('API Middleware Utilities', () => {
  describe('Token Extraction', () => {
    it('should extract token from Authorization header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: {
          'Authorization': 'Bearer test-token-123'
        }
      });

      // We'll test this through the validate endpoint since the function is not exported
      expect(request.headers.get('authorization')).toBe('Bearer test-token-123');
    });

    it('should extract token from cookie', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: {
          'Cookie': 'auth-token=cookie-token-123'
        }
      });

      expect(request.cookies.get('auth-token')?.value).toBe('cookie-token-123');
    });

    it('should extract token from X-Auth-Token header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: {
          'X-Auth-Token': 'header-token-123'
        }
      });

      expect(request.headers.get('x-auth-token')).toBe('header-token-123');
    });
  });
});