/**
 * app/chat/new/page.tsx
 *
 * Redirects to a newly created chat.
 * Handles the "Start New Chat" button from the chat list page.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function NewChatPage() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    const createAndRedirect = async () => {
      try {
        const token = await getIdToken();
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });

        if (response.ok) {
          const data = await response.json();
          router.replace(`/chat/${data.chat.id}`);
        } else {
          router.replace('/chat');
        }
      } catch {
        router.replace('/chat');
      }
    };

    createAndRedirect();
  }, [user, loading, getIdToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full" />
      <p className="ml-4 text-[var(--text-secondary)]">Creating new chat...</p>
    </div>
  );
}
