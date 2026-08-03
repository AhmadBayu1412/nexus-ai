/**
 * lib/auth/firebaseAdmin.ts
 *
 * Firebase Admin SDK for server-side token verification
 * Uses Firebase REST API to verify ID tokens (no service account needed)
 */

/**
 * Verify a Firebase ID token using Firebase REST API
 * @param idToken - The Firebase ID token to verify
 * @returns The decoded token if valid
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error('Firebase API key not configured');
  }

  // Use Firebase REST API to verify the ID token
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: idToken,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token verification failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.users && data.users.length > 0) {
    const user = data.users[0];
    return {
      uid: user.localId,
      email: user.email,
    };
  }

  throw new Error('Token verification failed: user not found');
}

/**
 * Create a custom session token from a Firebase user
 * Note: This requires Firebase Admin SDK with service account credentials
 * For now, we just return the user UID
 */
export async function createSessionToken(user: { uid: string }): Promise<string> {
  // In production, you would use Firebase Admin SDK or session cookies
  // For now, we'll just return a simple token
  return `session_${user.uid}_${Date.now()}`;
}
