/**
 * middleware.ts
 * 
 * Next.js Middleware for Firebase Auth protection
 * 
 * NOTE: Firebase Auth is client-side. We check for a custom session cookie
 * that we set after Firebase authentication.
 * 
 * For now, we'll allow all routes through and rely on client-side auth checks.
 * In production, you can set a custom session cookie after Firebase login.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Firebase Auth is client-side - we allow all routes through
  // Client components will handle auth redirects
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/).*)',
  ],
};
