import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the dependencies
vi.mock('../../../../lib/auth/api-middleware', () => ({
  withApiAuth: vi.fn((handler) => handler),
  withApiLogging: vi.fn((handler) => handler),
}));

vi.mock('../../../../lib/cache/cache-service', () => ({
  getCacheService: vi.fn(() => ({
    getTransactions: vi.fn().mockResolvedValue({
      transactions: [
        {
          id: '1',
          name: 'Test Transaction',
          amount: 100,
          date: '2024-01-01',
          accountName: 'Test Account',
          category: ['Food']
        }
      ]
    })
  }))
}));

vi.mock('../../../../lib/goals/goal-service', () => ({
  getGoalService: vi.fn(() => ({
    getGoals: vi.fn().mockResolvedValue([
      {
        id: '1',
        title: 'Test Goal',
        description: 'Test Description',
        targetAmount: 1000,
        currentAmount: 500,
        status: 'active'
      }
    ])
  }))
}));

describe('/api/search', () => {
  const mockContext = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      tenantId: 'test-tenant'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return search results for valid query', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?query=test');
    
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('transactions');
    expect(data.data).toHaveProperty('goals');
    expect(data.data).toHaveProperty('pages');
    expect(data.data).toHaveProperty('totalResults');
  });

  it('should return error for missing query parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/search');
    
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return error for query too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?query=a');
    
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should filter by categories when specified', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?query=overview&categories=pages');
    
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.transactions).toHaveLength(0);
    expect(data.data.goals).toHaveLength(0);
    expect(data.data.pages.length).toBeGreaterThan(0);
  });

  it('should respect limit parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?query=test&limit=1');
    
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Each category should respect the limit
    expect(data.data.transactions.length).toBeLessThanOrEqual(1);
    expect(data.data.goals.length).toBeLessThanOrEqual(1);
    expect(data.data.pages.length).toBeLessThanOrEqual(1);
  });

  it('should search pages correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?query=overview&categories=pages');
    
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.pages).toHaveLength(1);
    expect(data.data.pages[0].name).toBe('Overview');
    expect(data.data.pages[0].path).toBe('/');
  });
});