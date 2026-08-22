/**
 * app/page.tsx
 * 
 * Landing page - redirects to /chat if authenticated
 */

'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Github } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  // Redirect when user is loaded and authenticated
  useEffect(() => {
    if (!loading && user) {
      console.log('[HomePage] User authenticated, redirecting to /chat');
      router.push('/chat');
    }
  }, [user, loading, router]);

  // Still loading - show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full" />
        <p className="ml-4 text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  // Already authenticated - will redirect via useEffect
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full" />
        <p className="ml-4 text-[var(--text-secondary)]">Redirecting to chat...</p>
      </div>
    );
  }

  // Not authenticated - show sign-in page
  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
          <span className="text-4xl" role="img" aria-label="Robot icon">🤖</span>
        </div>
        
        <h1 className="text-3xl font-bold mb-3 text-[var(--text-primary)]">
          Welcome to Nexus AI
        </h1>
        
        <p className="text-[var(--text-secondary)] mb-8">
          Sign in with GitHub to start chatting with AI.
          Your conversations are private and secure.
        </p>

        <button
          onClick={signIn}
          className="
            w-full flex items-center justify-center gap-3
            px-6 py-4 rounded-xl
            bg-[var(--text-primary)] text-[var(--background)]
            font-semibold text-lg
            hover:opacity-90
            transition-all duration-200
            focus-ring
            btn-press
          "
          aria-label="Continue with GitHub login"
        >
          <Github className="w-6 h-6" aria-hidden="true" />
          <span>Continue with GitHub</span>
        </button>

        <p className="text-sm text-[var(--text-muted)] mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
