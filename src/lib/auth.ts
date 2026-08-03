/**
 * lib/auth.ts
 * 
 * Authentication wrapper for Firebase Auth
 * Provides a session-like interface for the app
 * 
 * Note: Firebase Auth is client-side. For server-side auth,
 * we use custom tokens or verify ID tokens.
 */

import { cookies } from 'next/headers';
import { getCurrentUser, type User } from './auth/firebase';

/**
 * Get the current session (server-side)
 * For server components, we check for a session cookie
 */
export async function auth(): Promise<{ user: { id: string; email?: string; name?: string; image?: string } | null }> {
  try {
    // Check for session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('firebase_session');
    
    if (!sessionCookie?.value) {
      return { user: null };
    }

    // Parse session data (stored as base64 JSON)
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    
    return {
      user: {
        id: sessionData.uid,
        email: sessionData.email,
        name: sessionData.name,
        image: sessionData.photoURL,
      },
    };
  } catch {
    return { user: null };
  }
}

/**
 * Get current user (client-side)
 */
export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  return getCurrentUser();
}

/**
 * Session cookie name
 */
export const SESSION_COOKIE_NAME = 'firebase_session';

/**
 * Session cookie options
 */
export const SESSION_COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};
