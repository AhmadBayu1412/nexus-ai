/**
 * middleware.ts
 * 
 * Production Hygiene & Security Middleware:
 * 1. Edge-Level Payload Size Guard (prevents mega-payload memory exhaustion attacks)
 * 2. Security Headers (nosniff, frame-ancestors / DENY, referrer-policy)
 * 3. Client & API Route Protection
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAX_API_PAYLOAD_BYTES = 512 * 1024; // 512 KB limit for API requests

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Edge Payload Size Guard for API routes ─────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_API_PAYLOAD_BYTES) {
      return new NextResponse(
        JSON.stringify({
          error: 'PAYLOAD_TOO_LARGE',
          message: 'Ukuran payload melebihi batas maksimum 512 KB.',
        }),
        {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // ── Security Headers Injection (Production Hygiene) ────────────────────────
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
