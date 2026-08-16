import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { ROLE_HOME_ROUTES, canAccessRoute } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/types';

/**
 * Next.js Proxy — runs on every request.
 *
 * 1. Refreshes the Supabase auth session (important for Server Components).
 * 2. Redirects unauthenticated users away from protected routes.
 * 3. Redirects authenticated users away from auth pages to their role's home.
 * 4. Enforces role-based route access (e.g., customer can't access /admin).
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/register', '/invite'];
const AUTH_ROUTES = ['/login', '/register', '/invite'];

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api');
}

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/customer') ||
    pathname.startsWith('/rider') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/manager') ||
    pathname.startsWith('/admin')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and API webhook routes (they handle their own auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/api/webhooks')
  ) {
    return NextResponse.next();
  }

  // Refresh the Supabase session
  const { user, supabaseResponse, supabase } = await updateSession(request);

  // API routes: let route handlers do their own auth checks
  if (isApiRoute(pathname)) {
    return supabaseResponse;
  }

  // If user is NOT authenticated
  if (!user) {
    // Allow access to public routes
    if (isPublicRoute(pathname)) {
      return supabaseResponse;
    }
    // Redirect to login for protected routes
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User IS authenticated — get their role from the users table
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as UserRole | undefined;

  // If user has no profile yet (shouldn't happen, but handle gracefully)
  if (!role) {
    // Allow access to auth routes so they can complete setup
    if (isAuthRoute(pathname) || pathname === '/') {
      return supabaseResponse;
    }
    // Redirect to home
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  // If on an auth route (login/register) and already logged in → redirect to role home
  if (isAuthRoute(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = ROLE_HOME_ROUTES[role];
    return NextResponse.redirect(homeUrl);
  }

  // If on the root page and logged in → redirect to role home
  if (pathname === '/') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = ROLE_HOME_ROUTES[role];
    return NextResponse.redirect(homeUrl);
  }

  // If on a protected route, check role-based access
  if (isProtectedRoute(pathname)) {
    if (!canAccessRoute(role, pathname)) {
      // Redirect to their actual home
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = ROLE_HOME_ROUTES[role];
      return NextResponse.redirect(homeUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
