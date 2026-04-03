import { NextRequest, NextResponse } from 'next/server';

const AUTH_ROUTES = ['/dashboard', '/checkout', '/wishlist'];
const LEARN_ROUTE = /^\/courses\/[^/]+\/learn/;
const ADMIN_ROUTE = /^\/admin/;
const INSTRUCTOR_ROUTE = /^\/instructor/;
const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

const VALID_ROLES = new Set(['student', 'instructor', 'admin']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawRole = request.cookies.get('user_role')?.value;
  // Only trust roles that are in the known-valid set — prevents spoofing with arbitrary values
  const userRole = rawRole && VALID_ROLES.has(rawRole) ? rawRole : undefined;
  const isAuthenticated = !!userRole;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protect user-only routes
  const needsAuth =
    AUTH_ROUTES.some((r) => pathname.startsWith(r)) || LEARN_ROUTE.test(pathname);

  if (needsAuth && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect admin routes
  if (ADMIN_ROUTE.test(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect instructor routes
  if (INSTRUCTOR_ROUTE.test(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== 'instructor') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/checkout/:path*',
    '/wishlist/:path*',
    '/courses/:slug/learn/:path*',
    '/admin/:path*',
    '/instructor/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password/:path*',
  ],
};
