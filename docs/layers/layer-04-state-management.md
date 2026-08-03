---
layer: 4
name: State Management
tier: 1
purpose: Mendefinisikan bagaimana state dikelola antara client (UI) dan server (RSC/database).
cross_layers: [1, 2, 3, 5, 8]
spec_ref: requirements.md#6-architecture-requirements, spec.yaml#database
---

# Layer 4: State Management

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan bagaimana state dikelola — client state (ephemeral streaming) vs server state (persistent chat history).

---

## 4.1 State Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT SPLIT                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────┐      ┌─────────────────────────┐
│      CLIENT STATE        │      │      SERVER STATE        │
│   (useChat hook)         │      │   (RSC + Database)      │
├─────────────────────────┤      ├─────────────────────────┤
│ - input (textarea)      │      │ - Chat history           │
│ - isLoading             │      │ - Message persistence    │
│ - isStreaming           │      │ - User ownership         │
│ - messages (local)       │      │ - Chat metadata          │
│ - partial streaming text │      │                         │
└───────────┬─────────────┘      └───────────┬─────────────┘
            │                                    │
            │  Sync on stream finish             │
            │  (onFinish callback)               │
            └──────────────┬────────────────────┘
                           ▼
                   ┌─────────────────┐
                   │   Database      │
                   │  (source of     │
                   │   truth)        │
                   └─────────────────┘
```

---

## 4.2 Client State (useChat Hook)

### Primary State Variables

```typescript
// From Vercel AI SDK's useChat
const {
  // Input state
  input,                    // string - current textarea value
  setInput,                  // function - update textarea
  handleInputChange,         // function - handleChange for textarea
  handleSubmit,              // function - submit form

  // Streaming state
  isLoading,                 // boolean - waiting for first token
  isStreaming,               // boolean - actively receiving tokens
  messages,                   // Message[] - all messages in conversation

  // Controls
  stop,                      // function - abort current stream

  // Error state
  error,                     // Error | undefined
} = useChat({
  // Config
  api: '/api/chat',
  id: chatId,                // Provide stable chatId for RSC hydration

  // Callbacks
  onFinish: (message) => {
    // This runs AFTER stream completes
    // Save to DB here (async, non-blocking)
  },
  onError: (error) => {
    // Handle stream errors
  },
});
```

### State Transitions

```
IDLE ──submit()──▶ LOADING ──first token──▶ STREAMING
 │                     │                         │
 │                     │ error                   │ stop() / done
 │                     ▼                         ▼
 │                  ERROR                      IDLE
 │                     │                         │
 └─────────────────────┴─────────────────────────┘
```

### Partial Streaming Text

During streaming, the assistant's partial text lives in `messages` array:
```typescript
// messages[lastIndex].content grows token-by-token
// Visual: immediate append to rendered text
```

---

## 4.3 Server State (React Server Components)

### Chat History Loading (RSC)

```typescript
// app/chat/[id]/page.tsx (Server Component)
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';

export default async function ChatPage({ params }) {
  const session = await auth();
  const chat = await db.chat.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  // IDOR Check (layer-09)
  if (!chat || chat.userId !== session.user.id) {
    notFound(); // Returns 404
  }

  return <ChatUI chat={chat} />;
}
```

### State Sync Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                      STATE SYNC FLOW                            │
└────────────────────────────────────────────────────────────────┘

[PAGE LOAD - RSC]
     │
     ▼
  1. Fetch chat + messages from DB
  2. Render initial messages to HTML (SSR)
  3. Hydrate useChat with initialMessages prop
     │
     ▼
[USER SUBMITS]
     │
     ▼
  4. useChat appends user message to local state
  5. useChat sets isLoading = true
  6. SSE stream starts
     │
     ▼
[STREAM COMPLETES - onFinish]
     │
     ▼
  7. useChat appends assistant message to local state
  8. useChat sets isLoading = false
  9. Async DB save (fire-and-forget)
     │
     ▼
[NEXT PAGE LOAD]
     │
     ▼
 10. Fresh RSC fetch from DB
 11. All messages present (including saved ones)
```

---

## 4.4 Hydration & Initial State

### Avoiding Hydration Mismatch

```typescript
// app/chat/[id]/page.tsx
export default async function ChatPage({ params }) {
  const session = await auth();
  const chat = await getChatById(params.id, session.user.id);

  // Pass initial messages to client component
  return (
    <ChatUI
      chatId={chat.id}
      initialMessages={chat.messages}
      initialTitle={chat.title}
    />
  );
}

// components/ChatUI.tsx (Client Component)
'use client';

function ChatUI({ chatId, initialMessages, initialTitle }) {
  const chat = useChat({
    id: chatId, // Stable key - useChat won't re-fetch if messages match
    initialMessages,
  });

  // ...
}
```

### Stable Message Keys
```typescript
// Use message.id (UUID) as React key, not index
{messages.map((message) => (
  <ChatMessage key={message.id} message={message} />
))}
```

---

## 4.5 Form State (Input)

### Textarea Auto-Expand
```typescript
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();

  // Block empty
  if (!input.trim()) return;

  // Clear input BEFORE submit (optimistic)
  const currentInput = input;
  setInput('');

  // Reset height
  textareaRef.current.style.height = 'auto';

  // Submit
  handleSubmit(e);
};
```

### Input Reset on Error
```typescript
// If stream errors, preserve input so user can retry
useEffect(() => {
  if (error && lastAttemptedInput) {
    setInput(lastAttemptedInput);
  }
}, [error]);
```

---

## 4.6 Optimistic Updates

### User Message (Optimistic)
```typescript
// useChat handles this automatically:
// User message appears immediately in messages array
// before server confirms
```

### Stop → Partial Save
```typescript
const handleStop = async () => {
  stop(); // Abort stream

  // Partial text already visible in UI (from streaming)
  // Will be saved when onFinish fires (with partial content)
};
```

---

## 4.7 State Persistence Considerations

| State Type | Persistence | Mechanism |
|------------|--------------|-----------|
| Conversation messages | Yes | DB (layer-06) |
| Chat title | Yes | DB (layer-06) |
| Input text | No | Ephemeral |
| isLoading | No | Ephemeral |
| isStreaming | No | Ephemeral |
| Partial streaming text | Partial | Ephemeral until onFinish |
| Scroll position | No | Ephemeral |

---

## 4.8 Multi-Tab Consistency

```typescript
// Option A: Periodic polling (simpler)
useEffect(() => {
  const interval = setInterval(async () => {
    const fresh = await fetch(`/api/chat/${chatId}/messages`);
    if (fresh.timestamp > lastSaved.timestamp) {
      refetchMessages();
    }
  }, 5000);
  return () => clearInterval(interval);
}, [chatId]);

// Option B: Server-Sent Events (full duplex)
// For MVP: use Option A polling every 5s
```

---

## Acceptance Criteria

- [ ] useChat provides all required state (input, isLoading, messages, stop)
- [ ] Initial messages loaded via RSC without SSR mismatch
- [ ] Chat history fetched from DB on page load
- [ ] User messages appear immediately (optimistic)
- [ ] Assistant messages stream token-by-token
- [ ] Stop button preserves partial text in UI
- [ ] onFinish triggers async DB save
- [ ] Page reload shows all saved messages
- [ ] Stable message.id used as React key
- [ ] Input resets on successful submit
- [ ] Input preserved on error (for retry)
