import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for Multi-tenant Domain-based Rendering
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  
  // 1. Extract hostname from headers
  const hostname = request.headers.get('host') || ''
  
  // 2. Detect site base on hostname or query param fallback
  // Query param takes precedence for testing/simulation purposes
  let site = url.searchParams.get('site')

  if (!site) {
    if (hostname.includes('site1')) {
      site = 'site1'
    } else if (hostname.includes('site2')) {
      site = 'site2'
    } else {
      site = 'default'
    }
  }

  // 3. Append site as a query param using URL rewrite
  // If the site is already in the query params as detected, proceed
  if (url.searchParams.get('site') === site) {
    return NextResponse.next()
  }

  // Otherwise, set it and rewrite to the new URL internally
  url.searchParams.set('site', site || 'default')
  
  return NextResponse.rewrite(url)
}

// Ensure middleware is efficient and only runs on relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - API routes (/api)
     * - Internal Next.js paths (_next)
     * - Static assets (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\..*).*)',
  ],
}
