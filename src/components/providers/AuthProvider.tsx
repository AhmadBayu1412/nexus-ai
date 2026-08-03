'use client';

/**
 * components/providers/AuthProvider.tsx
 * 
 * React Context for Firebase Authentication
 * Wraps the app and provides auth state to all components
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { onAuthChange, signInWithGitHub, signOut as firebaseSignOut, User } from '@/lib/auth/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  getIdToken: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Timeout fallback - if Firebase doesn't fire within 3s, assume no user
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      const resultUser = await signInWithGitHub();
      setUser(resultUser);
      setLoading(false);
    } catch (error) {
      console.error('[Auth] Sign in failed:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await firebaseSignOut();
      setUser(null);
      setLoading(false);
    } catch (error) {
      console.error('[Auth] Sign out failed:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }, [user]);

  const authValue = useMemo(
    () => ({ user, loading, signIn, signOut, getIdToken: getToken }),
    [user, loading, signIn, signOut, getToken]
  );

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}
