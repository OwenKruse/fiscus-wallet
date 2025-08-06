import { NextRequest, NextResponse } from 'next/server'
import { shouldSkipAuth, hasAuthToken, isTokenExpired } from './lib/auth/auth-utils-edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for certain paths
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next()
  }

  // Check for authentication token
  const hasToken = hasAuthToken(request)
  
  // If no token, redirect to sign in (except for public pages)
  if (!hasToken) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
  runtime: 'experimental-edge',
}