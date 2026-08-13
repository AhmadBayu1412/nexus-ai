'use client';

/**
 * ChatSkeleton Component
 *
 * Zero-CLS skeleton for chat message list.
 * Dimensi persis sama dengan ChatMessage bubble.
 * Menggunakan Tailwind animate-shimmer dari globals.css.
 */

interface ChatBubbleSkeletonProps {
  role?: 'user' | 'assistant';
}

/**
 * Single bubble skeleton — dimensi pixel-perfect dengan ChatMessage bubble.
 */
export function ChatBubbleSkeleton({ role = 'assistant' }: ChatBubbleSkeletonProps) {
  const isUser = role === 'user';

  return (
    <div className="flex gap-3 animate-pulse">
      {/* Avatar placeholder — hanya untuk assistant */}
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full shrink-0 mt-0.5"
          style={{ background: 'rgba(74,107,124,0.12)' }}
        />
      )}

      {/* Bubble skeleton */}
      <div
        className={`flex flex-col gap-2 ${isUser ? 'ml-auto items-end' : ''}`}
        style={{ maxWidth: isUser ? '75%' : '80%' }}
      >
        {/* Baris 1 */}
        <div
          className="h-4 rounded shimmer"
          style={{
            width: isUser ? '70%' : '90%',
            background: 'rgba(44,42,38,0.08)',
          }}
        />
        {/* Baris 2 */}
        <div
          className="h-4 rounded shimmer"
          style={{
            width: isUser ? '50%' : '75%',
            background: 'rgba(44,42,38,0.08)',
          }}
        />
        {/* Baris 3 — hanya untuk assistant */}
        {!isUser && (
          <div
            className="h-4 rounded shimmer"
            style={{
              width: '55%',
              background: 'rgba(44,42,38,0.08)',
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Full message list skeleton — untuk initial load di chat/[id]/page.tsx.
 * Mimics: user msg → assistant msg → assistant msg → user msg → assistant msg
 */
export function ChatMessageListSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <ChatBubbleSkeleton role="user" />
      <ChatBubbleSkeleton role="assistant" />
      <ChatBubbleSkeleton role="assistant" />
      <ChatBubbleSkeleton role="user" />
      <ChatBubbleSkeleton role="assistant" />
    </div>
  );
}

/**
 * Compact skeleton untuk sidebar loading state.
 */
export function SidebarItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div
        className="w-4 h-4 rounded shrink-0"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div
          className="h-3.5 rounded shimmer"
          style={{
            width: '70%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          className="h-3 rounded shimmer"
          style={{
            width: '40%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
      </div>
    </div>
  );
}
