import { describe, it, expect } from 'vitest'
import { 
  extractJWTPayload, 
  isTokenExpired, 
  getUserIdFromToken,
  shouldSkipAuth,
  shouldSkipOnboarding
} from '../auth-utils-edge'

describe('Edge Auth Utils', () => {
  describe('JWT payload extraction', () => {
    it('should extract payload from valid JWT', () => {
      // Create a simple JWT-like token (header.payload.signature)
      const payload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `header.${encodedPayload}.signature`

      const result = extractJWTPayload(token)
      expect(result).toEqual(payload)
    })

    it('should return null for invalid JWT format', () => {
      expect(extractJWTPayload('invalid')).toBeNull()
      expect(extractJWTPayload('invalid.token')).toBeNull()
      expect(extractJWTPayload('')).toBeNull()
    })

    it('should handle malformed payload', () => {
      const token = 'header.invalid-base64.signature'
      expect(extractJWTPayload(token)).toBeNull()
    })
  })

  describe('Token expiration check', () => {
    it('should detect expired token', () => {
      const expiredPayload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) - 3600 }
      const encodedPayload = btoa(JSON.stringify(expiredPayload))
      const token = `header.${encodedPayload}.signature`

      expect(isTokenExpired(token)).toBe(true)
    })

    it('should detect valid token', () => {
      const validPayload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }
      const encodedPayload = btoa(JSON.stringify(validPayload))
      const token = `header.${encodedPayload}.signature`

      expect(isTokenExpired(token)).toBe(false)
    })

    it('should treat token without exp as expired', () => {
      const payloadWithoutExp = { sub: 'user123' }
      const encodedPayload = btoa(JSON.stringify(payloadWithoutExp))
      const token = `header.${encodedPayload}.signature`

      expect(isTokenExpired(token)).toBe(true)
    })

    it('should treat invalid token as expired', () => {
      expect(isTokenExpired('invalid')).toBe(true)
      expect(isTokenExpired('')).toBe(true)
    })
  })

  describe('User ID extraction', () => {
    it('should extract user ID from sub field', () => {
      const payload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `header.${encodedPayload}.signature`

      expect(getUserIdFromToken(token)).toBe('user123')
    })

    it('should extract user ID from userId field', () => {
      const payload = { userId: 'user456', exp: Math.floor(Date.now() / 1000) + 3600 }
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `header.${encodedPayload}.signature`

      expect(getUserIdFromToken(token)).toBe('user456')
    })

    it('should extract user ID from id field', () => {
      const payload = { id: 'user789', exp: Math.floor(Date.now() / 1000) + 3600 }
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `header.${encodedPayload}.signature`

      expect(getUserIdFromToken(token)).toBe('user789')
    })

    it('should return null for token without user ID', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) + 3600 }
      const encodedPayload = btoa(JSON.stringify(payload))
      const token = `header.${encodedPayload}.signature`

      expect(getUserIdFromToken(token)).toBeNull()
    })

    it('should return null for invalid token', () => {
      expect(getUserIdFromToken('invalid')).toBeNull()
      expect(getUserIdFromToken('')).toBeNull()
    })
  })

  describe('Path checking utilities', () => {
    it('should identify paths that skip auth', () => {
      expect(shouldSkipAuth('/auth/signin')).toBe(true)
      expect(shouldSkipAuth('/api/auth/signin')).toBe(true)
      expect(shouldSkipAuth('/_next/static/css/app.css')).toBe(true)
      expect(shouldSkipAuth('/favicon.ico')).toBe(true)
      expect(shouldSkipAuth('/manifest.json')).toBe(true)
      expect(shouldSkipAuth('/demo/onboarding')).toBe(true)

      expect(shouldSkipAuth('/')).toBe(false)
      expect(shouldSkipAuth('/transactions')).toBe(false)
      expect(shouldSkipAuth('/investments')).toBe(false)
    })

    it('should identify paths that skip onboarding', () => {
      expect(shouldSkipOnboarding('/onboarding')).toBe(true)
      expect(shouldSkipOnboarding('/auth/signin')).toBe(true)
      expect(shouldSkipOnboarding('/api/accounts')).toBe(true)
      expect(shouldSkipOnboarding('/_next/static/css/app.css')).toBe(true)
      expect(shouldSkipOnboarding('/demo/onboarding')).toBe(true)

      expect(shouldSkipOnboarding('/')).toBe(false)
      expect(shouldSkipOnboarding('/transactions')).toBe(false)
      expect(shouldSkipOnboarding('/investments')).toBe(false)
    })
  })
})