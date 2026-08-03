'use client';

/**
 * ChatUI Component
 *
 * Main chat container managing streaming state.
 * Premium 2026 dark theme with glassmorphism, mesh background,
 * starter prompt chips, and polished layout.
 */

import { useRef, useEffect, useState, useCallback, useReducer, memo } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from './ChatMessage';
import { JumpToLatest } from './JumpToLatest';
import { ChatInput } from './ChatInput';
import { ThinkingIndicator } from './ThinkingIndicator';
import { getFirebaseAuth } from '@/lib/auth/firebase';
import { useToast } from '@/components/ui/Toast';
import type { ChatMessage as ChatMessageType, MessageFeedback } from '@/types/chat';

interface ChatUIProps {
  chatId: string;
  initialMessages?: ChatMessageType[];
  initialTitle?: string | null;
  onTitleChange?: (title: string) => void;
  onChatCreated?: (chatId: string) => void;
}

const STARTER_PROMPTS = [
  'Explain how Server-Sent Events work in 2 sentences',
  'Refactor this React hook to use best practices',
  'Debug my async function and explain the issue',
  'Write a clean TypeScript utility function',
];

function transformMessage(
  msg: { id: string; role: string; content: string; createdAt?: Date }
) {
  return {
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
  };
}

export const ChatUI = memo(function ChatUI({
  chatId,
  initialMessages = [],
  initialTitle,
  onChatCreated,
}: ChatUIProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, dispatchThinking] = useReducer(
    (_prev: boolean, action: 'show' | 'hide') => action === 'show',
    false
  );
  const lastInputRef = useRef<string>('');
  const hasNotifiedChatCreated = useRef(false);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ref for onChatCreated — avoids recreating customFetch on every render
  const onChatCreatedRef = useRef(onChatCreated);
  useEffect(() => {
    onChatCreatedRef.current = onChatCreated;
  });

  // Custom fetch with Firebase Auth headers
  // NOTE: only depends on chatId — stable across renders to prevent stream reinit
  const customFetch = useCallback(
    async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = init?.method || 'POST';
      const body = init?.body;

      let idToken = '';
      try {
        const auth = getFirebaseAuth();
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          idToken = await firebaseUser.getIdToken(true);
        }
      } catch (err) {
        console.error('[ChatUI] Failed to get Firebase ID token:', err);
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body,
        signal: init?.signal,
      });

      return response;
    },
    [chatId]
  );

  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit: aiHandleSubmit,
    stop,
    error: chatError,
    append,
    setMessages,
  } = useChat({
    id: chatId,
    api: '/api/chat',
    fetch: customFetch,
    initialMessages: initialMessages
      .filter((m) => !m.hidden)
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    body: { chatId },
    onResponse: (response) => {
      // Only trigger once: when new-chat stream starts, capture real chat ID from header
      if (
        onChatCreatedRef.current &&
        chatId.startsWith('new-') &&
        !hasNotifiedChatCreated.current
      ) {
        const newChatId = response.headers.get('X-Chat-Id');
        if (newChatId && !newChatId.startsWith('new-')) {
          hasNotifiedChatCreated.current = true;
          onChatCreatedRef.current(newChatId);
        }
      }
    },
    onFinish: () => {
      dispatchThinking('hide');
      if (isPinned && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    },
    onError: (err) => {
      dispatchThinking('hide');
      console.error('[ChatUI] Stream error:', err);
      let message = err.message || 'An error occurred';
      try {
        const parsed = JSON.parse(message);
        message = parsed.message || parsed.error || message;
      } catch {
        // Keep original
      }
      if (
        message.includes('ID token') ||
        message.includes('UNAUTHORIZED') ||
        message.includes('Firebase')
      ) {
        message = 'Authentication required. Please sign in again.';
      }
      setError(message);
      setTimeout(() => setError(null), 5000);
    },
  });

  const { toast } = useToast();

  const lastMessage = messages.at(-1);
  const showThinking = isThinking && isLoading && lastMessage?.role === 'assistant';

  // Show thinking indicator for first 5s of a stream, then fade out
  useEffect(() => {
    if (isLoading) {
      dispatchThinking('show');
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = setTimeout(() => {
        dispatchThinking('hide');
      }, 5000);
    } else {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      dispatchThinking('hide');
    }
    return () => {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
    };
  }, [isLoading]);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    setIsPinned(true);
    setShowJumpToLatest(false);
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom > 50) {
      setIsPinned(false);
      setShowJumpToLatest(true);
    } else {
      setIsPinned(true);
      setShowJumpToLatest(false);
    }
  }, []);

  useEffect(() => {
    if (isPinned && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isPinned]);

  const handleFormSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    lastInputRef.current = input;
    aiHandleSubmit(e as unknown as SubmitEvent & { target: HTMLFormElement });
  };

  useEffect(() => {
    if (chatError && lastInputRef.current) {
      setInput(lastInputRef.current);
      lastInputRef.current = '';
    }
  }, [chatError, setInput]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const textarea = document.querySelector(
          'textarea[aria-label="Chat input"]'
        ) as HTMLTextAreaElement;
        if (textarea) textarea.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Feedback ────────────────────────────────────────────────────────────────
  const handleFeedback = useCallback(
    async (messageId: string, feedback: MessageFeedback) => {
      toast({
        message: feedback.type === 'like' ? '👍 Great response!' : '👎 Feedback recorded',
        type: 'success',
        duration: 2000,
      });
      try {
        const auth = getFirebaseAuth();
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;
        const token = await firebaseUser.getIdToken();
        const res = await fetch('/api/messages/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chatId, messageId, feedback }),
        });
        if (!res.ok) {
          toast({ message: 'Failed to save feedback', type: 'error', duration: 3000 });
        }
      } catch {
        toast({ message: 'Failed to save feedback', type: 'error', duration: 3000 });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is a stable context ref
    [chatId]
  );

  // ─── Regenerate ─────────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    if (!lastInputRef.current) return;
    toast({ message: '🔄 Regenerating...', type: 'info', duration: 2000 });
    stop();
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
    setTimeout(() => {
      setInput(lastInputRef.current);
      setTimeout(() => {
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 30);
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is a stable context ref
  }, [stop, setMessages, setInput]);

  // ─── Instruct ────────────────────────────────────────────────────────────────
  const handleInstruct = useCallback(
    (instruction: string) => {
      lastInputRef.current = instruction;
      append({
        id: `instruct-${Date.now()}`,
        role: 'user',
        content: `[INSTRUCT] ${instruction}`,
      });
    },
    [append]
  );

  // Starter prompt click handler
  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  return (
    <div className="flex flex-col h-full mesh-bg">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(44,42,38,0.10)', background: 'rgba(44,42,38,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="relative flex-shrink-0" style={{ width: 28, height: 28 }}>
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)',
            }}
          />
          <div className="absolute inset-0 rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 12 12 6" />
              <path d="M12 12 16 14" />
              <circle cx="18" cy="6" r="3" />
              <path d="M18 3v6" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate" style={{ color: '#ffffff' }}>
            {initialTitle || 'New Chat'}
          </h1>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {isLoading ? 'Generating response...' : 'Ready'}
          </p>
        </div>
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 right-4 z-50 max-w-md"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(44,42,38,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(239,68,68,0.20)' }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" /><path d="m9 9 6 6" />
                </svg>
              </div>
              <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{error}</span>
              <button
                onClick={() => setError(null)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Dismiss error"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-container px-4 py-6 relative"
        style={{ contain: 'layout style' }}
      >
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="relative mb-8 animate-float">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)',
                    border: '1px solid rgba(44,42,38,0.12)',
                  }}
                >
                  <BotIcon />
                </div>
                <div
                  className="absolute inset-0 -z-10 rounded-2xl scale-110 opacity-30"
                  style={{ background: 'radial-gradient(circle, rgba(74,107,124,0.5) 0%, transparent 70%)' }}
                />
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
                <span className="text-gradient">How can I help you</span>
                <br />
                <span style={{ color: '#3C3A36' }}>today?</span>
              </h2>
              <p className="text-center mb-10 max-w-md leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                I&apos;m your AI assistant — great at coding, writing, analysis,
                and creative tasks.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg px-4">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <motion.button
                    key={prompt}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStarterClick(prompt)}
                    className="group relative px-4 py-3.5 rounded-xl text-left text-sm transition-all duration-200 focus-ring min-h-[56px] flex items-center"
                    style={{
                      background: 'rgba(255,253,248,0.90)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(44,42,38,0.10)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{
                        background: 'linear-gradient(135deg, rgba(74,107,124,0.07) 0%, transparent 60%)',
                        border: '1px solid rgba(74,107,124,0.14)',
                      }}
                    />
                    <div className="relative flex items-start gap-3 w-full">
                      <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5" style={{ background: 'rgba(74,107,124,0.14)' }}>
                        <SparkleIcon />
                      </div>
                      <span className="flex-1 leading-snug">{prompt}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isLastAssistant =
                  message.role === 'assistant' &&
                  index === messages.length - 1;

                return (
                  <div key={message.id}>
                    <ChatMessage
                      message={transformMessage({
                        id: message.id,
                        role: message.role,
                        content: message.content,
                        createdAt: undefined,
                      })}
                      isStreaming={isLastAssistant && isLoading && !!message.content}
                      onRegenerate={handleRegenerate}
                      onInstruct={handleInstruct}
                      onFeedback={(fb) => handleFeedback(message.id, fb)}
                      canRegenerate={isLastAssistant && !isLoading}
                    />
                  </div>
                );
              })}

              {/* Thinking indicator — shown while streaming & within 5s window */}
              {showThinking && <ThinkingIndicator />}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showJumpToLatest && <JumpToLatest onClick={scrollToBottom} />}
      </AnimatePresence>

      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
        onStop={stop}
      />
    </div>
  );
});

function BotIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 12 12 6" />
      <path d="M12 12 16 14" />
      <circle cx="18" cy="6" r="3" />
      <path d="M18 3v6" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4A6B7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
