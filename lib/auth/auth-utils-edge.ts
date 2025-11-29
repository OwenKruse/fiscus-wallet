import { NextRequest } from 'next/server'

/**
 * Edge Runtime compatible auth utilities
 * These functions avoid Node.js crypto dependencies
 */

// Extract token from request headers (Edge Runtime compatible)
export function extractTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check cookie (for browser requests)
  const cookieToken = request.cookies.get('auth-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  // Check X-Auth-Token header
  const headerToken = request.headers.get('x-auth-token')
  if (headerToken) {
    return headerToken
  }

  return null
}

// Check if request has authentication token
export function hasAuthToken(request: NextRequest): boolean {
  return extractTokenFromRequest(request) !== null
}

// Check if path should skip authentication
export function shouldSkipAuth(pathname: string): boolean {
  if (pathname === '/') {
    return true
  }

  const skipPaths = [
    '/auth',
    '/api/auth',
    '/_next',
    '/favicon.ico',
    '/manifest.json',
    '/demo'
  ]

  return skipPaths.some(path => pathname.startsWith(path))
}

// Check if path should skip onboarding
export function shouldSkipOnboarding(pathname: string): boolean {
  const skipPaths = [
    '/onboarding',
    '/auth',
    '/api',
    '/_next',
    '/favicon.ico',
    '/manifest.json',
    '/demo'
  ]

  return skipPaths.some(path => pathname.startsWith(path))
}

// Simple JWT payload extraction (without verification for Edge Runtime)
export function extractJWTPayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (error) {
    return null
  }
}

// Check if JWT token is expired (basic check without verification)
export function isTokenExpired(token: string): boolean {
  try {
    const payload = extractJWTPayload(token)
    if (!payload || !payload.exp) {
      return true
    }

    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  } catch (error) {
    return true
  }
}

// Get user ID from token (basic extraction without verification)
export function getUserIdFromToken(token: string): string | null {
  try {
    const payload = extractJWTPayload(token)
    return payload?.sub || payload?.userId || payload?.id || null
  } catch (error) {
    return null
  }
}