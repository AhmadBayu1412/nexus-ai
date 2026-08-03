// ============================================================
// MESSAGE TYPES
// ============================================================

/**
 * Message role in the conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message feedback type
 */
export interface MessageFeedback {
  type: 'like' | 'dislike';
  timestamp: number;
}

/**
 * Message with string content (for API)
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: string;  // AI reasoning/thinking content (assistant only)
  feedback?: MessageFeedback;
  hidden?: boolean;     // true = instruction message, hidden from UI
  createdAt: Date;
}

// ============================================================
// CHAT TYPES
// ============================================================

/**
 * Chat with messages (from database)
 */
export interface ChatWithMessages {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

/**
 * Chat list item (for sidebar)
 */
export interface ChatListItem {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// API TYPES
// ============================================================

/**
 * Request payload for POST /api/chat
 */
export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  chatId?: string; // Optional for new chats
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: 'UNAUTHORIZED' | 'RATE_LIMIT_EXCEEDED' | 'LLM_PROVIDER_TIMEOUT' | 'BILLING_ABUSE' | 'INTERNAL_ERROR';
  message?: string;
  retryAfter?: number;
}

// ============================================================
// UI STATE TYPES
// ============================================================

/**
 * Auto-scroll state
 */
export interface AutoScrollState {
  isPinned: boolean;
  hasNewMessages: boolean;
}

/**
 * Streaming state machine
 */
export type StreamingState = 'idle' | 'loading' | 'streaming' | 'error';
