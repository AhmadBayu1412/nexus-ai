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
import { EmptyState } from './EmptyState';
import { JumpToLatest } from './JumpToLatest';
import { ChatInput } from './ChatInput';
import { ThinkingIndicator } from './ThinkingIndicator';
import { SmartButton } from '@/components/ui/SmartButton';
import { getFirebaseAuth } from '@/lib/auth/firebase';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import type { ChatMessage as ChatMessageType, MessageFeedback } from '@/types/chat';

interface ChatUIProps {
  chatId: string;
  initialMessages?: ChatMessageType[];
  initialTitle?: string | null;
  onTitleChange?: (title: string) => void;
  onChatCreated?: (chatId: string) => void;
}

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
  const { user, signOut } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [isThinking, dispatchThinking] = useReducer(
    (_prev: boolean, action: 'show' | 'hide') => action === 'show',
    false
  );
  const lastInputRef = useRef<string>('');
  const hasNotifiedChatCreated = useRef(false);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the current stream finished normally (onFinish called).
  // Used to detect silent aborts: stream stopped but onFinish never fired.
  const streamFinishedNormallyRef = useRef(false);
  // Tracks whether the user explicitly clicked the Stop button.
  // Suppresses false-positive error banner when user stops generation.
  const userInitiatedStopRef = useRef(false);

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
        const firebaseUser = auth?.currentUser;
        if (firebaseUser) {
          idToken = await firebaseUser.getIdToken(true);
        }
      } catch (err) {
        // Firebase token fetch failed — proceed without token
        // The 401 response from the server will surface the auth error via chatError
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

      if (!response.body) return response;

      // Idle timeout: if no chunk arrives for this long, the connection is dead.
      // Increased to 60s because agentic tasks with tools (e.g. Tavily search) can take time.
      const IDLE_TIMEOUT_MS = 60_000;
      let idleTimer: ReturnType<typeof setTimeout>;
      const idleController = new AbortController();

      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          console.log('[customFetch] Idle timeout — no data for', IDLE_TIMEOUT_MS, 'ms');
          setLocalError('Connection lost. Check your internet connection and try again.');
          idleController.abort();
        }, IDLE_TIMEOUT_MS);
      };
      resetIdleTimer();

      const reader = response.body!.getReader();
      const monitoredStream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              if (idleController.signal.aborted) {
                controller.error(new DOMException('Idle timeout', 'AbortError'));
                return;
              }
              const { done, value } = await reader.read();
              if (done) {
                clearTimeout(idleTimer);
                controller.close();
                return;
              }
              resetIdleTimer(); // healthy chunk — keep the stream alive
              controller.enqueue(value);
            }
          } catch (err) {
            clearTimeout(idleTimer);
            controller.error(err);
          }
        },
        cancel() {
          clearTimeout(idleTimer);
          reader.cancel();
        },
      });

      return new Response(monitoredStream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    },
    [chatId]
  );

  // ── State for tracking chat promotion without resetting useChat ─────────────
  const useChatIdRef = useRef(chatId);
  const realChatIdRef = useRef<string | null>(null);

  if (chatId !== useChatIdRef.current) {
    if (chatId === realChatIdRef.current) {
      // Promotion from virtual 'new-' chat to real server chat.
      // Do NOT update useChatIdRef, so useChat doesn't clear mid-stream.
    } else {
      // Normal navigation to a different chat.
      useChatIdRef.current = chatId;
      realChatIdRef.current = null;
    }
  }

  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit: aiHandleSubmit,
    stop,
    error: chatError,
    reload,
    append,
    setMessages,
  } = useChat({
    id: useChatIdRef.current,
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
    onToolCall: () => {
      // Tool call detected — useChat handles the state internally
      // Tool invocation state transitions: partial-call → result
    },
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
          realChatIdRef.current = newChatId; // Mark as promoted to prevent useChat reset
          onChatCreatedRef.current(newChatId);
        }
      }
    },
    onFinish: () => {
      streamFinishedNormallyRef.current = true;
      dispatchThinking('hide');
      if (isPinned && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    },
    onError: (err) => {
      dispatchThinking('hide');
      // Note: localError is NOT set here — the wasLoadingRef effect below handles
      // silent abort detection by checking streamFinishedNormallyRef.
      // Only set localError for auth errors where we want an immediate banner.
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
        setLocalError('Authentication required. Please sign in again.');
        setTimeout(() => setLocalError(null), 5000);
      }
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
    if (!isOnline) {
      setLocalError('You are offline. Please check your internet connection.');
      setTimeout(() => setLocalError(null), 4000);
      return;
    }
    if (!input.trim() || isLoading) return;
    // Clear any pending error state on new submission
    setLocalError(null);
    lastInputRef.current = input;
    // void operator suppresses unhandled rejection in dev overlay;
    // the error is surfaced via chatError state + onError callback
    void aiHandleSubmit(e as unknown as SubmitEvent & { target: HTMLFormElement });
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

  // ─── Online/Offline listener ─────────────────────────────────────────────────
  // Handles the case where wifi is cut BEFORE starting a new request.
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLocalError(null);
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (!isLoading) {
        setLocalError('Connection lost. Check your internet connection and try again.');
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isLoading]);

  // ─── Silent abort detection ───────────────────────────────────────────────────
  // Detects when the stream stopped but onFinish never fired — a silent abort.
  // This catches mid-stream disconnects that the browser's offline event misses.
  // AbortErrors from user-initiated stops are excluded via userInitiatedStopRef.
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
      streamFinishedNormallyRef.current = false;
    } else if (wasLoadingRef.current) {
      wasLoadingRef.current = false;
      if (!streamFinishedNormallyRef.current && !chatError && !userInitiatedStopRef.current) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentionally reactive:
        // signals a silent abort to the UI by setting localError.
        setLocalError('Connection lost. Check your internet connection and try again.');
      }
    }
  }, [isLoading, chatError]);

  // ─── User-initiated stop guard ───────────────────────────────────────────────
  // Wrapping useChat's stop so we can suppress false-positive banners on user stops.
  const handleStop = useCallback(() => {
    userInitiatedStopRef.current = true;
    stop();
    setTimeout(() => {
      userInitiatedStopRef.current = false;
    }, 2000);
  }, [stop]);

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
        const firebaseUser = auth?.currentUser;
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
    handleStop();
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
    const inputToRetry = lastInputRef.current;
    setTimeout(() => {
      setInput(inputToRetry);
      setTimeout(() => {
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) void form.requestSubmit();
      }, 30);
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is a stable context ref
  }, [handleStop, setMessages, setInput]);

  // ─── Retry Tool ─────────────────────────────────────────────────────────────
  /** Called by ToolError when user clicks "Try Again". */
  const handleRetryTool = useCallback(
    async (_toolCallId: string, _toolName: string, args: Record<string, unknown>) => {
      toast({ message: '🔄 Retrying...', type: 'info', duration: 2000 });
      const companyName = args.companyName as string | undefined;
      const industry = args.industry as string | undefined;
      const companySize = args.companySize as string | undefined;
      const sizeText = companySize ? `, company size: ${companySize}` : '';
      const text = `Score lead: ${companyName}, industry: ${industry}${sizeText}`;
      append({
        id: `retry-${Date.now()}`,
        role: 'user',
        content: text,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is a stable context ref
    [append]
  );

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

  // ─── Stream Error Retry ───────────────────────────────────────────────────────
  /** Retries only the last failed message using useChat's reload().
   *  Clears localError first so the UI clears before reload fires.
   *  .catch(()=>{}) prevents unhandled Promise rejection from bubbling up to
   *  the Next.js dev overlay — the error is already handled via chatError state. */
  const handleStreamRetry = useCallback(() => {
    if (isRetrying) return;
    setIsRetrying(true);
    setLocalError(null); // Clear error UI immediately
    reload().catch(() => {});
    // onError will fire when the SDK catches the failure → chatError state updates
    // Keep isRetrying guard active to prevent double-clicks
    setTimeout(() => setIsRetrying(false), 2000);
  }, [reload, isRetrying]);

  // Starter prompt click handler
  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) void form.requestSubmit();
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
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {isLoading ? 'Generating response...' : 'Ready'}
          </p>
        </div>

        {/* Right side: User Profile / Logout Button (Hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {user ? (
            <button
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-ring border border-white/10"
              title="Keluar dari akun"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4A6B7C] text-white hover:bg-[#3d5a69] transition-colors focus-ring"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Messages container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-container px-4 py-6 relative"
        style={{ contain: 'layout style' }}
      >
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 ? (
            <EmptyState onPromptClick={handleStarterClick} />
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
                      toolInvocations={message.toolInvocations as import('@/components/chat/ChatMessage').ToolInvocation[] | undefined}
                      onRetryTool={handleRetryTool}
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

      {/* Mid-stream error banner — shows when either useChat's error fires
          OR our offline event listener catches a mid-stream disconnect */}
      <AnimatePresence>
        {(chatError || localError) && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mx-4 mb-2"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.18)',
              }}
            >
              {/* Error icon */}
              <div
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.12)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>

              {/* Message — show localError (mid-stream disconnect) or chatError (API/network error) */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#f87171' }}>
                  {localError ? 'Connection lost mid-stream' : 'Connection interrupted'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {(localError || String(chatError ?? '')).length > 80
                    ? (localError || String(chatError ?? '')).slice(0, 80) + '...'
                    : (localError || 'Your message could not be sent. Check your network and try again.')}
                </p>
              </div>

              {/* Retry button — SmartButton FSM handles loading/success/error states */}
              <SmartButton
                onClick={async () => {
                  if (isRetrying) throw new Error('already retrying');
                  setIsRetrying(true);
                  setLocalError(null);
                  try {
                    await reload();
                  } finally {
                    setTimeout(() => setIsRetrying(false), 2000);
                  }
                }}
                idleLabel="Retry"
                loadingLabel="Retrying..."
                successLabel="Sent!"
                errorLabel="Failed"
                showIcon={false}
                successResetMs={1200}
                errorResetMs={1800}
                className="shrink-0 px-4 py-2 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.22)',
                  color: '#f87171',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
        onStop={handleStop}
      />
    </div>
  );
});

// ── Retry Spinner ─────────────────────────────────────────────────────────────────

function RetrySpinner() {
  return (
    <motion.div
      className="w-3.5 h-3.5 rounded-full"
      style={{ border: '2px solid rgba(248,113,113,0.25)', borderTopColor: '#f87171' }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
    />
  );
}
