import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Root Middleware for Route Protection
 * Redirects unauthenticated users to the setup/login page.
 * Allows access to /api/auth/* and /setup routes without authentication.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that don't require authentication
  const publicPaths = ['/api/auth', '/setup', '/login', '/_next', '/favicon.ico'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) || pathname === '/';

  if (!token && !isPublicPath) {
    // Redirect to home if accessing protected route without token
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // If already authenticated and trying to access root or setup, go to dashboard
  if (token && (pathname === '/' || pathname === '/setup' || pathname === '/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (handled by withAuth in specific routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
