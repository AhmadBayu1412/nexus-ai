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
  
  // Track if a virtual new chat has been promoted to a real chat in the database.
  // This allows us to update the URL and sidebar without unmounting the active AI stream.
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

  const handleDeleteChat = useCallback((chatId: string) => {
    // ChatSidebar already handles the actual API deletion and routing.
    // We only need to optimistically update the local list here.
    setChats((prev) => prev.filter((c) => c.id !== chatId));
  }, []);

  const isActuallyNew = id === 'new' && !promotedChatId;

  const handleNewChat = useCallback(() => {
    // If already on a virtual new chat (no messages yet), do nothing — the
    // current tab IS already an empty chat. Caller (ChatSidebar SmartButton)
    // receives a thrown error to trigger its error/shake state.
    if (isActuallyNew) {
      throw new Error('already-on-empty-chat');
    }
    // If on a real chat that has no messages yet (unlikely but guard anyway)
    if (currentChat && currentChat.messages.length === 0) {
      throw new Error('already-on-empty-chat');
    }
    
    // Navigate to virtual new chat.
    // If we are currently on a silently promoted chat (URL updated via replaceState but Next.js
    // router internal state still thinks it's on /chat/new), router.push won't work.
    // We force a hard navigation to guarantee a fresh chat.
    if (id === 'new' && promotedChatId) {
      window.location.href = '/chat/new';
      return;
    }
    
    const { router } = authRef.current;
    router.push('/chat/new');
  }, [id, currentChat, isActuallyNew, promotedChatId]);

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

  const effectiveChatId = promotedChatId || (id === 'new' ? newChatId : id);
  const isVirtualEmptyChat = id === 'new' && !promotedChatId;

  return (
    <div className="flex chat-layout overflow-hidden">
      <ChatSidebar
        chats={chats}
        activeChatId={effectiveChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatUI
          chatId={effectiveChatId}
          initialMessages={isVirtualEmptyChat ? [] : (currentChat?.messages || [])}
          initialTitle={isVirtualEmptyChat ? 'New Chat' : (currentChat?.title || 'Chat')}
          onChatCreated={(newChatIdFromServer) => {
            // Silently update the URL without triggering a Next.js navigation.
            // This prevents the page component from unmounting and destroying the active AI stream.
            window.history.replaceState(null, '', `/chat/${newChatIdFromServer}`);
            
            // Track the real ID so effectiveChatId stays accurate and the sidebar highlights it.
            setPromotedChatId(newChatIdFromServer);
            
            // Refresh sidebar so the new chat appears in history
            fetchChats();
          }}
        />
      </main>
    </div>
  );
}
