import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the middleware to return the raw handlers
vi.mock('../../../../lib/auth/auth-middleware', () => ({
  withUnauthenticatedAuditLog: (handler: any) => handler,
  withAuth: (handler: any) => handler,
  withAuditLog: (handler: any) => handler
}));

// Import handlers after mocking
import { POST as signUpHandler } from '../signup/route';
import { POST as signInHandler } from '../signin/route';
import { POST as signOutHandler } from '../signout/route';
import { GET as meHandler } from '../me/route';
import { GET as validateHandler } from '../validate/route';

describe('Authentication Integration Tests', () => {
  let testUserEmail: string;
  let testUserPassword: string;
  let authToken: string;

  beforeEach(() => {
    testUserEmail = `test-${Date.now()}@example.com`;
    testUserPassword = 'TestPassword123';
  });

  afterEach(async () => {
    // Clean up: sign out if we have a token
    if (authToken) {
      try {
        const signOutRequest = new NextRequest('http://localhost/api/auth/signout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        await signOutHandler(signOutRequest);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it('should complete full authentication flow', async () => {
    // 1. Sign up a new user
    const signUpRequest = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserEmail,
        password: testUserPassword,
        firstName: 'Test',
        lastName: 'User'
      })
    });

    const signUpResponse = await signUpHandler(signUpRequest);
    const signUpData = await signUpResponse.json();

    expect(signUpResponse.status).toBe(200);
    expect(signUpData.success).toBe(true);
    expect(signUpData.user.email).toBe(testUserEmail);
    expect(signUpData.user.firstName).toBe('Test');
    expect(signUpData.user.lastName).toBe('User');

    // Extract token from cookie
    const cookies = signUpResponse.headers.get('set-cookie');
    expect(cookies).toContain('auth-token=');
    
    // Extract the token value
    const tokenMatch = cookies?.match(/auth-token=([^;]+)/);
    authToken = tokenMatch?.[1] || '';
    expect(authToken).toBeTruthy();

    // 2. Validate the session
    const validateRequest = new NextRequest('http://localhost/api/auth/validate', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const validateResponse = await validateHandler(validateRequest);
    const validateData = await validateResponse.json();

    expect(validateResponse.status).toBe(200);
    expect(validateData.success).toBe(true);
    expect(validateData.valid).toBe(true);
    expect(validateData.user.email).toBe(testUserEmail);

    // 3. Get user profile
    const meRequest = new NextRequest('http://localhost/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const meResponse = await meHandler(meRequest);
    const meData = await meResponse.json();

    expect(meResponse.status).toBe(200);
    expect(meData.success).toBe(true);
    expect(meData.user.email).toBe(testUserEmail);
    expect(meData.user.firstName).toBe('Test');
    expect(meData.user.lastName).toBe('User');

    // 4. Sign out
    const signOutRequest = new NextRequest('http://localhost/api/auth/signout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const signOutResponse = await signOutHandler(signOutRequest);
    const signOutData = await signOutResponse.json();

    expect(signOutResponse.status).toBe(200);
    expect(signOutData.success).toBe(true);

    // Verify cookie is cleared
    const signOutCookies = signOutResponse.headers.get('set-cookie');
    expect(signOutCookies).toContain('auth-token=;');

    // 5. Verify session is invalidated
    const validateAfterSignOutRequest = new NextRequest('http://localhost/api/auth/validate', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const validateAfterSignOutResponse = await validateHandler(validateAfterSignOutRequest);
    const validateAfterSignOutData = await validateAfterSignOutResponse.json();

    expect(validateAfterSignOutResponse.status).toBe(401);
    expect(validateAfterSignOutData.success).toBe(false);

    // Clear token so cleanup doesn't try to use it
    authToken = '';
  });

  it('should handle sign in with existing user', async () => {
    // First create a user
    const signUpRequest = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserEmail,
        password: testUserPassword,
        firstName: 'Test',
        lastName: 'User'
      })
    });

    const signUpResponse = await signUpHandler(signUpRequest);
    expect(signUpResponse.status).toBe(200);

    // Extract token for cleanup
    const signUpCookies = signUpResponse.headers.get('set-cookie');
    const signUpTokenMatch = signUpCookies?.match(/auth-token=([^;]+)/);
    const signUpToken = signUpTokenMatch?.[1] || '';

    // Sign out first
    if (signUpToken) {
      const signOutRequest = new NextRequest('http://localhost/api/auth/signout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${signUpToken}`
        }
      });
      await signOutHandler(signOutRequest);
    }

    // Now sign in with the same credentials
    const signInRequest = new NextRequest('http://localhost/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserEmail,
        password: testUserPassword
      })
    });

    const signInResponse = await signInHandler(signInRequest);
    const signInData = await signInResponse.json();

    expect(signInResponse.status).toBe(200);
    expect(signInData.success).toBe(true);
    expect(signInData.user.email).toBe(testUserEmail);

    // Extract token for cleanup
    const signInCookies = signInResponse.headers.get('set-cookie');
    const signInTokenMatch = signInCookies?.match(/auth-token=([^;]+)/);
    authToken = signInTokenMatch?.[1] || '';
  });

  it('should reject invalid credentials', async () => {
    const signInRequest = new NextRequest('http://localhost/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      })
    });

    const signInResponse = await signInHandler(signInRequest);
    const signInData = await signInResponse.json();

    expect(signInResponse.status).toBe(401);
    expect(signInData.success).toBe(false);
    expect(signInData.error.code).toBe('AUTHENTICATION_FAILED');
  });

  it('should reject duplicate user registration', async () => {
    // First registration
    const signUpRequest1 = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserEmail,
        password: testUserPassword,
        firstName: 'Test',
        lastName: 'User'
      })
    });

    const signUpResponse1 = await signUpHandler(signUpRequest1);
    expect(signUpResponse1.status).toBe(200);

    // Extract token for cleanup
    const cookies = signUpResponse1.headers.get('set-cookie');
    const tokenMatch = cookies?.match(/auth-token=([^;]+)/);
    authToken = tokenMatch?.[1] || '';

    // Second registration with same email
    const signUpRequest2 = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserEmail,
        password: testUserPassword,
        firstName: 'Test2',
        lastName: 'User2'
      })
    });

    const signUpResponse2 = await signUpHandler(signUpRequest2);
    const signUpData2 = await signUpResponse2.json();

    expect(signUpResponse2.status).toBe(409);
    expect(signUpData2.success).toBe(false);
    expect(signUpData2.error.code).toBe('USER_EXISTS');
  });
});