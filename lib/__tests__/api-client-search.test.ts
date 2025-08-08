import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchApi } from '../api-client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('searchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform search with query only', async () => {
    const mockResponse = {
      success: true,
      data: {
        transactions: [],
        goals: [],
        pages: [{ id: '1', name: 'Overview', description: 'Dashboard', path: '/' }],
        totalResults: 1
      },
      timestamp: new Date().toISOString()
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await searchApi.search('overview');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/search?query=overview',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        credentials: 'include'
      })
    );

    expect(result).toEqual(mockResponse.data);
  });

  it('should perform search with categories filter', async () => {
    const mockResponse = {
      success: true,
      data: {
        transactions: [],
        goals: [],
        pages: [{ id: '1', name: 'Overview', description: 'Dashboard', path: '/' }],
        totalResults: 1
      },
      timestamp: new Date().toISOString()
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await searchApi.search('overview', { categories: ['pages'] });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/search?query=overview&categories=pages',
      expect.objectContaining({
        method: 'GET'
      })
    );

    expect(result).toEqual(mockResponse.data);
  });

  it('should perform search with limit', async () => {
    const mockResponse = {
      success: true,
      data: {
        transactions: [],
        goals: [],
        pages: [{ id: '1', name: 'Overview', description: 'Dashboard', path: '/' }],
        totalResults: 1
      },
      timestamp: new Date().toISOString()
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await searchApi.search('overview', { limit: 10 });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/search?query=overview&limit=10',
      expect.objectContaining({
        method: 'GET'
      })
    );

    expect(result).toEqual(mockResponse.data);
  });

  it('should perform search with multiple options', async () => {
    const mockResponse = {
      success: true,
      data: {
        transactions: [],
        goals: [],
        pages: [{ id: '1', name: 'Overview', description: 'Dashboard', path: '/' }],
        totalResults: 1
      },
      timestamp: new Date().toISOString()
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await searchApi.search('test', { 
      categories: ['transactions', 'goals'], 
      limit: 5 
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/search?query=test&categories=transactions%2Cgoals&limit=5',
      expect.objectContaining({
        method: 'GET'
      })
    );

    expect(result).toEqual(mockResponse.data);
  });

  it('should throw ApiError on failed response', async () => {
    const mockErrorResponse = {
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: 'Search failed',
        timestamp: new Date().toISOString()
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockErrorResponse
    });

    await expect(searchApi.search('test')).rejects.toThrow('Search failed');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(searchApi.search('test')).rejects.toThrow('Network error');
  });
});