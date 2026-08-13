/**
 * app/chat/[id]/page.tsx
 *
 * Individual chat page - displays messages for a specific chat.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatUI } from '@/components/chat/ChatUI';
import { ChatMessageListSkeleton } from '@/components/chat/ChatSkeleton';
import type { ChatListItem, ChatMessage } from '@/types/chat';

interface ChatData {
  id: string;
  title: string | null;
  messages: ChatMessage[];
}

export default function ChatPage() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatData | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  // authReady = false while Firebase auth is still initializing.
  // Prevents premature renders when auth is mid-initialization on Vercel cold start.
  // Derived directly from loading — no setState in effects needed (React 19 compat).
  const authReady = !loading;

  // Stable ref for auth-dependent operations — avoids stale closure issues
  const authRef = useRef({ user, loading, getIdToken, router });
  useEffect(() => {
    authRef.current = { user, loading, getIdToken, router };
  });

  // Generate stable chat ID for new chats
  const [newChatId] = useState(() => `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

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

  // Fetch current chat with messages
  const fetchChat = useCallback(async () => {
    const { user, getIdToken, router } = authRef.current;
    if (!user || !id) return;
    if (id === 'new') {
      setIsLoadingChat(false);
      return;
    }

    try {
      const token = await getIdToken();
      const response = await fetch(`/api/chats/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentChat(data.chat);
      } else if (response.status === 404) {
        // Chat not found - redirect to new chat
        router.push('/chat/new');
      }
    } catch (error) {
      console.error('Failed to fetch chat:', error);
    } finally {
      setIsLoadingChat(false);
    }
  }, [id]); // Only id changes trigger a new fetchChat — stable auth via ref

  // Safety timeout - if fetch hangs, unlock UI
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoadingChat(false);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  // Auth guard + data fetch — runs when auth settles and user is confirmed
  useEffect(() => {
    if (!authReady) return;

    const { user, router } = authRef.current;
    if (!user) {
      router.push('/');
      return;
    }

    fetchChats();
    fetchChat();
  }, [authReady, user, fetchChats, fetchChat]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    const { getIdToken, router } = authRef.current;
    try {
      const token = await getIdToken();
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (chatId === id) {
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }, [id]);

  const handleNewChat = useCallback(async () => {
    const { getIdToken, router } = authRef.current;
    try {
      const token = await getIdToken();
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/chat/${data.chat.id}`);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  }, []);

  if (loading || isLoadingChat) {
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

  const effectiveChatId = id === 'new' ? newChatId : id;
  const isNewChat = id === 'new';

  return (
    <div className="flex chat-layout overflow-hidden">
      <ChatSidebar
        chats={chats}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatUI
          chatId={effectiveChatId}
          initialMessages={isNewChat ? [] : (currentChat?.messages || [])}
          initialTitle={isNewChat ? 'New Chat' : (currentChat?.title || 'Chat')}
          onChatCreated={(newChatId) => {
            const { router } = authRef.current;
            router.replace(`/chat/${newChatId}`);
          }}
        />
      </main>
    </div>
  );
}
