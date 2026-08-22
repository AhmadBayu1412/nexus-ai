/**
 * app/chat/page.tsx
 * 
 * Chat page - renders new chat interface directly.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatUI } from '@/components/chat/ChatUI';
import { ChatMessageListSkeleton } from '@/components/chat/ChatSkeleton';
import type { ChatListItem } from '@/types/chat';

export default function ChatListPage() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const authReady = !loading;

  const authRef = useRef({ user, loading, getIdToken, router });
  useEffect(() => {
    authRef.current = { user, loading, getIdToken, router };
  });

  const [newChatId] = useState(() => `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [promotedChatId, setPromotedChatId] = useState<string | null>(null);

  // Fetch chats list
  const fetchChats = useCallback(async () => {
    const { user, getIdToken } = authRef.current;
    if (!user) return;

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
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const { user, router } = authRef.current;
    if (!user) {
      router.push('/');
      return;
    }
    fetchChats();
  }, [authReady, user, fetchChats]);

  const handleDeleteChat = useCallback((chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
  }, []);

  const handleNewChat = useCallback(() => {
    if (!promotedChatId) {
      throw new Error('already-on-empty-chat');
    }
    window.location.href = '/chat/new';
  }, [promotedChatId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            <ChatMessageListSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const effectiveChatId = promotedChatId || newChatId;

  return (
    <div className="flex chat-layout overflow-hidden">
      <ChatSidebar
        chats={chats}
        activeChatId={effectiveChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      <main id="main-content" className="flex-1 flex flex-col min-w-0">
        <ChatUI
          chatId={effectiveChatId}
          initialMessages={[]}
          initialTitle="New Chat"
          onChatCreated={(newChatIdFromServer) => {
            window.history.replaceState(null, '', `/chat/${newChatIdFromServer}`);
            setPromotedChatId(newChatIdFromServer);
            fetchChats();
          }}
        />
      </main>
    </div>
  );
}
