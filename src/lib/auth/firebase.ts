/**
 * lib/auth/firebase.ts
 * 
 * Firebase Authentication Client
 * Uses Firebase Auth for user authentication
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app (singleton pattern)
let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }
  return app;
}

function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export { getFirebaseAuth };

// GitHub OAuth provider
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

/**
 * Sign in with GitHub using Firebase Auth
 */
export async function signInWithGitHub(): Promise<User> {
  const firebaseAuth = getFirebaseAuth();
  const result = await signInWithPopup(firebaseAuth, githubProvider);
  // This gives you a GitHub Access Token
  const credential = GithubAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;
  
  if (token) {
    // Store the token for API calls
    sessionStorage.setItem('github_token', token);
  }
  
  return result.user;
}

/**
 * Sign out from Firebase
 */
export async function signOut(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  sessionStorage.removeItem('github_token');
  await firebaseSignOut(firebaseAuth);
}

/**
 * Get the current Firebase user
 */
export function getCurrentUser(): User | null {
  const firebaseAuth = getFirebaseAuth();
  return firebaseAuth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const firebaseAuth = getFirebaseAuth();
  return onAuthStateChanged(firebaseAuth, callback);
}

/**
 * Get GitHub token from session storage
 */
export function getGitHubToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('github_token');
}

/**
 * Get Firebase ID token for API authentication
 * Used by client components to call protected API endpoints
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const user = getCurrentUser();
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export type { User };
