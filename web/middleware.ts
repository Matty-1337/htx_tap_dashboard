import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { resolveSubdomain } from './lib/client/resolveSubdomain'

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default-secret-change-in-production'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const session = request.cookies.get('session')

  // STEP 1: Handle subdomain-based routing (rewrite, not redirect)
  const host = request.headers.get('host') || ''
  const subdomain = resolveSubdomain(host)

  if (subdomain) {
    // Client subdomain (melrose, fancy, bestregard)
    if (subdomain === 'melrose' || subdomain === 'fancy' || subdomain === 'bestregard') {
      // If pathname already starts with /[client], skip rewrite
      if (!pathname.startsWith(`/${subdomain}`)) {
        // Rewrite to /[client]/[pathname] for seamless routing
        const rewritePath = pathname === '/' ? `/${subdomain}` : `/${subdomain}${pathname}`
        const rewriteUrl = new URL(rewritePath, request.url)
        return NextResponse.rewrite(rewriteUrl)
      }
    }

    // Admin subdomain
    if (subdomain === 'admin') {
      // If pathname already starts with /admin, skip rewrite
      if (!pathname.startsWith('/admin')) {
        // Rewrite to /admin or /admin/[pathname]
        const rewritePath = pathname === '/' ? '/admin' : `/admin${pathname}`
        const rewriteUrl = new URL(rewritePath, request.url)
        return NextResponse.rewrite(rewriteUrl)
      }
    }
  }

  // STEP 2: Preserve existing auth logic for API routes and dashboard
  // Allow login page and API routes (no auth required for API, they handle their own)
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Protect dashboard and other routes
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const secret = new TextEncoder().encode(COOKIE_SECRET)
      await jwtVerify(session.value, secret)
      return NextResponse.next()
    } catch (error) {
      // Invalid token, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('session')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
}
