import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { onboardingMiddleware, checkOnboardingStatus } from '../onboarding-middleware'

// Mock dependencies
vi.mock('../../cache/cache-service', () => ({
  getCacheService: vi.fn(() => ({
    getAccounts: vi.fn()
  }))
}))

vi.mock('../../auth/auth-middleware', () => ({
  getAuthContext: vi.fn()
}))

// Mock fetch for client-side function
global.fetch = vi.fn()

describe('onboardingMiddleware', () => {
  const mockGetCacheService = vi.mocked(require('../../cache/cache-service').getCacheService)
  const mockGetAuthContext = vi.mocked(require('../../auth/auth-middleware').getAuthContext)
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should skip onboarding check for excluded paths', async () => {
    const request = new NextRequest('http://localhost:3000/onboarding')
    
    const response = await onboardingMiddleware(request)
    
    expect(response.status).toBe(200) // NextResponse.next()
  })

  it('should skip onboarding check for API routes', async () => {
    const request = new NextRequest('http://localhost:3000/api/accounts')
    
    const response = await onboardingMiddleware(request)
    
    expect(response.status).toBe(200) // NextResponse.next()
  })

  it('should skip onboarding check for auth routes', async () => {
    const request = new NextRequest('http://localhost:3000/auth/signin')
    
    const response = await onboardingMiddleware(request)
    
    expect(response.status).toBe(200) // NextResponse.next()
  })

  it('should continue if no authenticated user', async () => {
    const request = new NextRequest('http://localhost:3000/')
    mockGetAuthContext.mockResolvedValue(null)
    
    const response = await onboardingMiddleware(request)
    
    expect(response.status).toBe(200) // NextResponse.next()
  })

  it('should redirect to onboarding if user has no accounts', async () => {
    const request = new NextRequest('http://localhost:3000/')
    const mockUser = { id: 'user123', email: 'test@example.com', tenantId: 'tenant1' }
    const mockAuthContext = { user: mockUser, token: 'token123', tenantId: 'tenant1' }
    
    mockGetAuthContext.mockResolvedValue(mockAuthContext)
    mockGetCacheService.mockReturnValue({
      getAccounts: vi.fn().mockResolvedValue({ accounts: [] })
    })
    
    const response = await onboardingMiddleware(request)
    
    expect(response.status).toBe(307) // Redirect
    expect(response.headers.get('location')).toBe('http://localhost:3000/onboarding')
  })

  it('should redirect to dashboard if user has accounts and is on onboarding page', async () => {
    const request = new NextRequest('http://localhost:3000/onboarding')
    const mockUser = { id: 'user123', email: 'test@example.com', tenantId: 'tenant1' }
    const mockAuthContext = { user: mockUser, token: 'token123', tenantId: 'tenant1' }
    
    mockGetAuthContext.mockResolvedValue(mockAuthContext)
    mockGetCacheService.mockReturnValue({
      getAccounts: vi.fn().mockResolvedValue({ 
        accounts: [{ id: 'acc1', name: 'Test Account' }] 
      })
    })
    
    const response = await onboardingMiddleware(request)
    
    expect(response.status).toBe(307) // Redirect
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('should continue if user has accounts and is not on onboarding page', async () => {
    const request = new NextRequest('http://localhost:3000/transactions')
    const mockUser = { id: 'user123', email: 'test@example.com', tenantId: 'tenant1' }
    
    mockGetAuthUser.mockResolvedValue(mockUser)
    mockGetCacheService.mockReturnValue({
      getAccounts: vi.fn().mockResolvedValue({ 
        accounts: [{ id: 'acc1', name: 'Test Account' }] 
      })
    })
    
    const response = await onboardingMiddleware(request)
    
    expect(response.status).toBe(200) // NextResponse.next()
  })

  it('should handle errors gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    mockGetAuthUser.mockRejectedValue(new Error('Auth error'))
    
    const response = await onboardingMiddleware(request)
    
    expect(response.status).toBe(200) // NextResponse.next() on error
    expect(consoleSpy).toHaveBeenCalledWith('Onboarding middleware error:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })
})

describe('checkOnboardingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return needs onboarding true when no accounts', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { accounts: [] }
      })
    } as Response)

    const result = await checkOnboardingStatus()

    expect(result).toEqual({
      needsOnboarding: true,
      accountCount: 0
    })
  })

  it('should return needs onboarding false when accounts exist', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { 
          accounts: [
            { id: 'acc1', name: 'Test Account' },
            { id: 'acc2', name: 'Another Account' }
          ] 
        }
      })
    } as Response)

    const result = await checkOnboardingStatus()

    expect(result).toEqual({
      needsOnboarding: false,
      accountCount: 2
    })
  })

  it('should handle API errors gracefully', async () => {
    const mockFetch = vi.mocked(fetch)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await checkOnboardingStatus()

    expect(result).toEqual({
      needsOnboarding: false,
      accountCount: 0
    })
    expect(consoleSpy).toHaveBeenCalledWith('Error checking onboarding status:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('should handle non-ok response', async () => {
    const mockFetch = vi.mocked(fetch)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    } as Response)

    const result = await checkOnboardingStatus()

    expect(result).toEqual({
      needsOnboarding: false,
      accountCount: 0
    })
    
    consoleSpy.mockRestore()
  })

  it('should handle malformed response data', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: null // Malformed data
      })
    } as Response)

    const result = await checkOnboardingStatus()

    expect(result).toEqual({
      needsOnboarding: false,
      accountCount: 0
    })
  })
})