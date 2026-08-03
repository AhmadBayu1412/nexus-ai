---
layer: 8
name: System Architecture
tier: 1
purpose: Mendefinisikan arsitektur sistem keseluruhan - Next.js App Router, separation of concerns, dan teknologi stack.
cross_layers: [3, 4, 5, 6]
spec_ref: requirements.md#6-architecture-requirements, requirements.md#10-deployment-requirements
---

# Layer 8: System Architecture

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan arsitektur sistem keseluruhan — Next.js App Router paradigm, separation of concerns, dan pilihan teknologi.

---

## 8.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            NEXT.JS APP ROUTER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐  │
│  │   SERVER COMPONENTS  │         │          CLIENT COMPONENTS            │  │
│  │   (RSC - Server)    │         │   (use client - Browser)              │  │
│  ├─────────────────────┤         ├─────────────────────────────────────┤  │
│  │                     │           │                                     │  │
│  │  app/               │  Props    │  components/ChatUI.tsx             │  │
│  │    layout.tsx       │ ────────▶│    ├── ChatSidebar.tsx            │  │
│  │    page.tsx         │           │    ├── ChatMessage.tsx            │  │
│  │    chat/[id]/       │           │    ├── ChatInput.tsx              │  │
│  │      page.tsx       │           │    └── ThinkingIndicator.tsx     │  │
│  │                     │           │                                     │  │
│  └─────────────────────┘           └─────────────────────────────────────┘  │
│           │                                        │                         │
│           │ useChat hook                          │                         │
│           │ (streams tokens)                      │                         │
│           ▼                                        ▼                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    API ROUTE HANDLER                                 │    │
│  │  app/api/chat/route.ts                                              │    │
│  │    ├── Auth check (Firebase ID Token in Bearer header)               │    │
│  │    ├── Rate limit (Upstash Redis)                                  │    │
│  │    ├── streamText (Vercel AI SDK)                                  │    │
│  │    └── DataStreamResponse (SSE)                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                      │
│                                      │ onFinish callback (async)            │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      DATA LAYER                                      │    │
│  │  lib/db/queries.ts                                                  │    │
│  │    ├── Prisma/Drizzle ORM                                           │    │
│  │    └── Database (Postgres/SQLite)                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8.2 Directory Structure

```
my-ai-chatbot/
├── app/
│   ├── layout.tsx              # Root layout (fonts, providers)
│   ├── page.tsx                # Landing page (redirect to /chat or login)
│   ├── globals.css             # Tailwind + custom styles
│   ├── api/
│   │   └── chat/
│   │       └── route.ts        # POST /api/chat (streaming endpoint)
│   └── chat/
│       ├── page.tsx            # Chat list / home
│       └── [id]/
│           └── page.tsx        # Individual chat (RSC)
├── components/
│   ├── ui/                     # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── textarea.tsx
│   │   └── toast.tsx
│   ├── chat/
│   │   ├── ChatSidebar.tsx     # Chat history list
│   │   ├── ChatMessage.tsx     # Single message bubble
│   │   ├── ChatInput.tsx       # Auto-expanding textarea
│   │   ├── ThinkingIndicator.tsx
│   │   ├── JumpToLatest.tsx    # Scroll-to-bottom button
│   │   └── ChatUI.tsx         # Main chat container (useChat)
│   └── providers/
│       └── auth-provider.tsx   # Session context
├── lib/
│   ├── ai/
│   │   ├── config.ts           # System prompt, model config (SINGLE SOURCE)
│   │   └── title-generator.ts  # Title generation logic
│   ├── auth/
│   │   ├── firebase.ts        # Firebase client SDK (signInWithRedirect, getIdToken)
│   │   └── firebaseAdmin.ts  # Firebase Admin (verifyIdToken, REST API)
│   ├── db/
│   │   ├── index.ts            # Prisma client instance
│   │   ├── schema.prisma       # Database schema (NextAuth tables are dead code)
│   │   └── queries.ts          # Database queries
│   └── rate-limit.ts           # Upstash Redis rate limiter
├── hooks/
│   └── use-scroll-pagination.ts # Smart scroll hook
├── types/
│   └── chat.ts                 # TypeScript types
├── public/
│   └── ...                     # Static assets
├── .env.local                  # Local env vars (API keys)
├── .env.example                # Example env vars
├── prisma/
│   └── schema.prisma           # DB schema
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── SPEC.md
```

---

## 8.3 Separation of Concerns

### Client Components (Browser)

```typescript
// components/chat/ChatUI.tsx
'use client';

import { useChat } from 'ai/react';

export function ChatUI({ chatId, initialMessages }) {
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    stop,
  } = useChat({
    id: chatId,
    api: '/api/chat',
    initialMessages,
  });

  return (
    <div>
      {/* Message list */}
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {/* Stop button (conditional) */}
      {isLoading && (
        <button onClick={stop}>Stop</button>
      )}
    </div>
  );
}
```

### Server Components (RSC)

```typescript
// app/chat/[id]/page.tsx
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth/firebaseAdmin';
import { ChatUI } from '@/components/chat/ChatUI';

export default async function ChatPage({ params }) {
  // Server-side token verification via Firebase Admin REST API
  const user = await getUserFromToken();

  // Database query (server-side only)
  const chat = await db.chat.findFirst({
    where: { id: params.id, userId: user.uid },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!chat) notFound();

  // Pass to client component
  return (
    <ChatUI
      chatId={chat.id}
      initialMessages={chat.messages}
      initialTitle={chat.title}
    />
  );
}
```

### API Route Handler

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { getUserFromToken } from '@/lib/auth/firebaseAdmin';
import { rateLimit } from '@/lib/rate-limit';
import { generateTitle } from '@/lib/ai/title-generator';
import { openai } from '@ai-sdk/openai';
import { SYSTEM_PROMPT } from '@/lib/ai/config';

export async function POST(req: Request) {
  // 1. Auth: verify Firebase ID Token from Bearer header
  const user = await getUserFromToken(req);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Rate limit
  const { success } = await rateLimit(user.uid);
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // 3. Stream
  const { messages, chatId } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: 2048,

    onFinish: async ({ text }) => {
      // Save to DB (async, non-blocking)
      await saveMessages({ chatId, messages, response: text });
    },
  });

  return result.toDataStreamResponse();
}
```

---

## 8.4 Technology Stack

### Core Framework

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React framework (App Router) | ^15.x |
| React | UI library | ^19.x |
| TypeScript | Type safety (strict mode) | ^5.x |

### AI & Streaming

| Technology | Purpose | Version |
|------------|---------|---------|
| `ai` (Vercel) | LLM streaming SDK | ^3.x |
| `@ai-sdk/openai` | OpenAI provider | latest |
| `@ai-sdk/anthropic` | Anthropic provider | latest |

### Database & ORM

| Technology | Purpose | Version |
|------------|---------|---------|
| Prisma | ORM (recommended) | ^5.x |
| PostgreSQL | Production database | 15+ |
| SQLite | Local development | - |

### Authentication

| Technology | Purpose | Version |
|------------|---------|---------|
| Firebase Auth | Authentication (GitHub OAuth) | firebase ^11.x |
| Firebase Admin SDK | Server-side token verification | firebase-admin ^12.x |

> **Note:** NextAuth tables (Account, Session, VerificationToken) in the Prisma schema are not used. They are dead code retained for potential future migration. NEXTAUTH_* environment variables are not used.

### Rate Limiting

| Technology | Purpose | Version |
|------------|---------|---------|
| Upstash Redis | Serverless rate limiting | @upstash/ratelimit ^2.x |
| @upstash/redis | Redis client | ^2.x |

### UI & Styling

| Technology | Purpose | Version |
|------------|---------|---------|
| Tailwind CSS | Utility-first CSS | ^3.x |
| react-markdown | Markdown rendering | ^9.x |
| remark-gfm | GitHub Flavored Markdown | ^4.x |

### Development Tools

| Technology | Purpose | Version |
|------------|---------|---------|
| ESLint | Linting | ^9.x |
| Prettier | Code formatting | ^3.x |
| Vitest | Testing (optional) | ^2.x |

---

## 8.5 Configuration Isolation (lib/ai/config.ts)

### Single Source of Truth

```typescript
// lib/ai/config.ts
// IMPORTANT: Keep system prompt and model config isolated
// This module is the single source of truth for AI configuration

export const SYSTEM_PROMPT = `You are a helpful AI assistant.
You provide accurate, concise, and helpful responses.
You can understand and communicate in multiple languages.
When writing code, always explain your reasoning.`;

// Model configuration
export const MODEL_CONFIG = {
  primary: {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 2048,
  },
  fallback: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    maxTokens: 2048,
  },
} as const;

// Title generation config
export const TITLE_CONFIG = {
  model: 'gpt-4o-mini', // Lighter model
  maxTokens: 15,
  temperature: 0.7,
} as const;
```

### Usage

```typescript
// In API route
import { SYSTEM_PROMPT, MODEL_CONFIG } from '@/lib/ai/config';

const result = await streamText({
  model: openai(MODEL_CONFIG.primary.model),
  system: SYSTEM_PROMPT,
  maxTokens: MODEL_CONFIG.primary.maxTokens,
  // ...
});
```

---

## 8.6 Deployment Architecture

### Vercel (Recommended)

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL PLATFORM                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Edge Runtime / Serverless Functions                 │
│  ┌────────────────────────────────────────────────┐ │
│  │  POST /api/chat                                 │ │
│  │  - Stream text (Serverless function)           │ │
│  │  - Max execution: 30s (configurable)           │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Static / SSR Pages                                 │
│  ┌────────────────────────────────────────────────┐ │
│  │  /chat/[id] (SSR with RSC)                     │ │
│  │  - Pre-rendered HTML                          │ │
│  │  - Hydrated on client                         │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Environment Variables                               │
│  ┌────────────────────────────────────────────────┐ │
│  │  - OPENAI_API_KEY (server-only)               │ │
│  │  - ANTHROPIC_API_KEY (server-only)           │ │
│  │  - DATABASE_URL (server-only)                  │ │
│  │  - UPSTASH_REDIS_REST_URL                     │ │
│  │  - UPSTASH_REDIS_REST_TOKEN                   │ │
│  │  - FIREBASE_PROJECT_ID                         │ │
│  │  - FIREBASE_CLIENT_EMAIL                       │ │
│  │  - FIREBASE_PRIVATE_KEY                       │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Environment Variables

```bash
# .env.local (development - NOT committed to git)
DATABASE_URL="file:./dev.db"

# LLM Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Upstash Redis
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Firebase Auth (GitHub OAuth)
# Client-side Firebase config (safe to expose to client bundle)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."

# Firebase Admin (server-side only - NEVER expose)
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Acceptance Criteria

- [ ] Next.js App Router structure implemented
- [ ] Server Components for data fetching (RSC)
- [ ] Client Components for interactivity (useChat)
- [ ] API Route Handler for /api/chat
- [ ] Separation: UI logic in Client Components, DB logic in Server Components
- [ ] lib/ai/config.ts is single source of truth for AI config
- [ ] All API keys in .env.local (never in client bundle)
- [ ] TypeScript strict mode enabled
- [ ] Deployment ready (Vercel compatible)
- [ ] Preview deployments for PRs
