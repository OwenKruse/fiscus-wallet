import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified middleware for Edge Runtime compatibility
 * Main onboarding logic is handled client-side to avoid crypto dependencies
 */
export async function onboardingMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip onboarding check for certain paths
  const skipPaths = [
    '/onboarding',
    '/auth',
    '/api',
    '/_next',
    '/favicon.ico',
    '/manifest.json',
    '/demo'
  ]

  if (skipPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // For Edge Runtime compatibility, we'll handle onboarding routing client-side
  // The OnboardingGuard component will handle the actual redirection logic
  return NextResponse.next()
}

/**
 * Check if user needs onboarding (client-side helper)
 */
export async function checkOnboardingStatus(): Promise<{
  needsOnboarding: boolean
  accountCount: number
}> {
  try {
    const response = await fetch('/api/accounts', {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch accounts')
    }

    const data = await response.json()
    const accountCount = data.data?.accounts?.length || 0

    return {
      needsOnboarding: accountCount === 0,
      accountCount
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return {
      needsOnboarding: false,
      accountCount: 0
    }
  }
}