/**
 * app/chat/page.tsx
 * 
 * Chat list page - displays all user's chats.
 */

'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { Plus, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatListItem } from '@/types/chat';

export default function ChatListPage() {
  const { user, loading, signOut, getIdToken } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  // Fetch chats when user is available
  useEffect(() => {
    if (!user || loading) return;

    const doFetch = async () => {
      try {
        const token = await getIdToken();
        const response = await fetch('/api/chats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setChats(data.chats || []);
        }
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      } finally {
        setIsLoadingChats(false);
      }
    };

    doFetch();
  }, [user, loading, getIdToken]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleNewChat = useCallback(() => {
    // Navigate to the virtual 'new' route — chat is only created in DB
    // when the first message is sent (lazy creation via ChatUI + X-Chat-Id header).
    router.push('/chat/new');
  }, [router]);

  const handleDeleteChat = useCallback((chatId: string) => {
    // ChatSidebar already handles the actual API deletion and routing.
    // We only need to optimistically update the local list here.
    setChats((prev) => prev.filter((c) => c.id !== chatId));
  }, []);

  if (loading || isLoadingChats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full" />
        <p className="ml-4 text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <ChatSidebar
        chats={chats}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      
      <main className="flex-1 flex items-center justify-center min-w-0">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-[var(--brand-primary)]" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Your Chats</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Select a chat from the sidebar or start a new conversation.
          </p>
          
          <Link
            href="/chat/new"
            className="
              inline-flex items-center gap-2 px-6 py-3
              bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]
              text-white rounded-xl font-medium
              transition-all
            "
          >
            <Plus className="w-5 h-5" />
            <span>Start New Chat</span>
          </Link>

          <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
            <div className="flex items-center justify-center gap-3 mb-4">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div className="text-left">
                <p className="font-medium text-sm">{user?.displayName || 'User'}</p>
                <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
