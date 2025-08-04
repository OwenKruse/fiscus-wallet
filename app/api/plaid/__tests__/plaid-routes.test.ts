// Integration tests for Plaid API routes

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createLinkToken } from '../create-link-token/route';
import { POST as exchangeToken } from '../exchange-token/route';
import { GET as getAccounts } from '../accounts/route';
import { POST as disconnectAccount } from '../disconnect/route';

// Mock the services
vi.mock('../../../../lib/auth/nile-auth-service', () => ({
  getNileAuthService: vi.fn(() => ({
    getCurrentUser: vi.fn(),
    validateSession: vi.fn()
  }))
}));

vi.mock('../../../../lib/plaid/plaid-service', () => ({
  getPlaidService: vi.fn(() => ({
    createLinkToken: vi.fn(),
    exchangePublicToken: vi.fn(),
    getAccountsWithInstitution: vi.fn(),
    revokeAccess: vi.fn()
  }))
}));

vi.mock('../../../../lib/database/nile-client', () => ({
  getNileClient: vi.fn(() => ({
    query: vi.fn(),
    queryOne: vi.fn()
  }))
}));

// Test user data
const testUser = {
  email: 'plaid-test@example.com',
  password: 'testpassword123',
  firstName: 'Plaid',
  lastName: 'Test'
};

// Mock Plaid sandbox data
const mockPlaidData = {
  publicToken: 'public-sandbox-test-token',
  linkToken: 'link-sandbox-test-token',
  itemId: 'test-item-id-123',
  institutionId: 'ins_109508',
  institutionName: 'First Platypus Bank',
  accounts: [
    {
      account_id: 'test-account-1',
      name: 'Plaid Checking',
      official_name: 'Plaid Gold Standard 0% Interest Checking',
      type: 'depository',
      subtype: 'checking',
      balances: {
        available: 100.0,
        current: 110.0,
        limit: null
      }
    },
    {
      account_id: 'test-account-2',
      name: 'Plaid Saving',
      official_name: 'Plaid Silver Standard 0.1% Interest Saving',
      type: 'depository',
      subtype: 'savings',
      balances: {
        available: 200.0,
        current: 210.0,
        limit: null
      }
    }
  ]
};

// Helper function to create authenticated request
function createAuthenticatedRequest(
  method: string,
  url: string,
  body?: any,
  token?: string
): NextRequest {
  const headers = new Headers({
    'Content-Type': 'application/json'
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

// Helper function to extract JSON from response
async function getResponseJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

describe('Plaid API Routes Integration Tests', () => {
  const authToken = 'test-auth-token';
  const userId = 'test-user-id';
  const testItemId = mockPlaidData.itemId;

  const mockUser = {
    id: userId,
    email: testUser.email,
    firstName: testUser.firstName,
    lastName: testUser.lastName,
    tenantId: 'test-tenant-id',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    const { getNileAuthService } = require('../../../../lib/auth/nile-auth-service');
    const { getPlaidService } = require('../../../../lib/plaid/plaid-service');
    
    const authService = getNileAuthService();
    const plaidService = getPlaidService();

    // Mock auth service
    authService.getCurrentUser.mockResolvedValue(mockUser);
    authService.validateSession.mockResolvedValue(true);

    // Mock plaid service
    plaidService.createLinkToken.mockResolvedValue(mockPlaidData.linkToken);
    plaidService.exchangePublicToken.mockResolvedValue({
      accessToken: 'test-access-token',
      itemId: mockPlaidData.itemId,
      institutionId: mockPlaidData.institutionId,
      institutionName: mockPlaidData.institutionName,
      accounts: mockPlaidData.accounts
    });
    plaidService.getAccountsWithInstitution.mockResolvedValue([
      {
        id: 'account-1',
        name: 'Plaid Checking',
        officialName: 'Plaid Gold Standard 0% Interest Checking',
        type: 'depository',
        subtype: 'checking',
        balance: {
          available: 100.0,
          current: 110.0,
          limit: null
        },
        institutionName: mockPlaidData.institutionName,
        lastUpdated: new Date()
      }
    ]);
    plaidService.revokeAccess.mockResolvedValue(undefined);
  });

  describe('POST /api/plaid/create-link-token', () => {
    it('should create a link token for authenticated user', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/create-link-token',
        {},
        authToken
      );

      const response = await createLinkToken(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.linkToken).toBe(mockPlaidData.linkToken);
      expect(data.data.expiration).toBeDefined();
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/create-link-token',
        {}
      );

      const response = await createLinkToken(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_MISSING');
    });

    it('should return 401 for invalid token', async () => {
      // Mock invalid token response
      const { getNileAuthService } = require('../../../../lib/auth/nile-auth-service');
      const authService = getNileAuthService();
      authService.getCurrentUser.mockResolvedValue(null);

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/create-link-token',
        {},
        'invalid-token'
      );

      const response = await createLinkToken(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_INVALID');
    });
  });

  describe('POST /api/plaid/exchange-token', () => {
    it('should exchange public token successfully', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/exchange-token',
        { publicToken: mockPlaidData.publicToken },
        authToken
      );

      const response = await exchangeToken(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.success).toBe(true);
      expect(data.data.institutionName).toBe(mockPlaidData.institutionName);
      expect(data.data.accountsCount).toBe(mockPlaidData.accounts.length);
      expect(data.message).toContain(mockPlaidData.institutionName);

      // Verify exchangePublicToken was called
      const { getPlaidService } = require('../../../../lib/plaid/plaid-service');
      const plaidService = getPlaidService();
      expect(plaidService.exchangePublicToken).toHaveBeenCalledWith(mockPlaidData.publicToken, userId);
    });

    it('should return 400 for missing public token', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/exchange-token',
        {},
        authToken
      );

      const response = await exchangeToken(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Public token is required');
    });

    it('should return 400 for invalid public token format', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/exchange-token',
        { publicToken: 'invalid' },
        authToken
      );

      const response = await exchangeToken(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Public token appears to be invalid');
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/exchange-token',
        { publicToken: mockPlaidData.publicToken }
      );

      const response = await exchangeToken(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_MISSING');
    });
  });

  describe('GET /api/plaid/accounts', () => {
    it('should fetch user accounts successfully', async () => {
      const request = createAuthenticatedRequest(
        'GET',
        'http://localhost:3000/api/plaid/accounts',
        undefined,
        authToken
      );

      const response = await getAccounts(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.accounts).toBeDefined();
      expect(Array.isArray(data.data.accounts)).toBe(true);
      expect(data.data.accounts.length).toBeGreaterThan(0);

      // Check account structure
      const account = data.data.accounts[0];
      expect(account.id).toBeDefined();
      expect(account.name).toBeDefined();
      expect(account.type).toBeDefined();
      expect(account.subtype).toBeDefined();
      expect(account.balance).toBeDefined();
      expect(account.balance.current).toBeDefined();
      expect(account.institutionName).toBeDefined();
      expect(account.lastUpdated).toBeDefined();

      // Verify getAccountsWithInstitution was called
      const { getPlaidService } = require('../../../../lib/plaid/plaid-service');
      const plaidService = getPlaidService();
      expect(plaidService.getAccountsWithInstitution).toHaveBeenCalledWith(userId);
    });

    it('should return empty array for user with no accounts', async () => {
      // Mock empty accounts response
      const { getPlaidService } = require('../../../../lib/plaid/plaid-service');
      const plaidService = getPlaidService();
      plaidService.getAccountsWithInstitution.mockResolvedValue([]);

      const request = createAuthenticatedRequest(
        'GET',
        'http://localhost:3000/api/plaid/accounts',
        undefined,
        authToken
      );

      const response = await getAccounts(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.accounts).toEqual([]);
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = createAuthenticatedRequest(
        'GET',
        'http://localhost:3000/api/plaid/accounts'
      );

      const response = await getAccounts(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_MISSING');
    });
  });

  describe('POST /api/plaid/disconnect', () => {
    it('should disconnect account successfully', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/disconnect',
        { itemId: testItemId },
        authToken
      );

      const response = await disconnectAccount(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('disconnected successfully');

      // Verify revokeAccess was called
      const { getPlaidService } = require('../../../../lib/plaid/plaid-service');
      const plaidService = getPlaidService();
      expect(plaidService.revokeAccess).toHaveBeenCalledWith(testItemId, userId);
    });

    it('should return 400 for missing item ID', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/disconnect',
        {},
        authToken
      );

      const response = await disconnectAccount(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Item ID is required');
    });

    it('should return 400 for invalid item ID format', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/disconnect',
        { itemId: 'bad' },
        authToken
      );

      const response = await disconnectAccount(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Item ID appears to be invalid');
    });

    it('should return 404 for non-existent connection', async () => {
      // Mock connection not found error
      const { getPlaidService } = require('../../../../lib/plaid/plaid-service');
      const plaidService = getPlaidService();
      plaidService.revokeAccess.mockRejectedValue(new Error('Connection not found'));

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/disconnect',
        { itemId: 'non-existent-item-id' },
        authToken
      );

      const response = await disconnectAccount(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONNECTION_NOT_FOUND');
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/plaid/disconnect',
        { itemId: testItemId }
      );

      const response = await disconnectAccount(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_MISSING');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/plaid/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: 'invalid-json'
      });

      const response = await exchangeToken(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_JSON');
    });

    it('should handle missing Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/plaid/exchange-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ publicToken: mockPlaidData.publicToken })
      });

      const response = await exchangeToken(request);
      const data = await getResponseJson(response);

      // Should still work as middleware handles JSON parsing
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid requests gracefully', async () => {
      const requests = Array.from({ length: 5 }, () =>
        createAuthenticatedRequest(
          'POST',
          'http://localhost:3000/api/plaid/create-link-token',
          {},
          authToken
        )
      );

      const responses = await Promise.all(
        requests.map(request => createLinkToken(request))
      );

      // All requests should succeed (no rate limiting implemented yet)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});