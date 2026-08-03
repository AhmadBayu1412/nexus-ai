---
layer: 6
name: Database Architecture
tier: 1
purpose: Mendefinisikan schema database, relasi tabel, indexing strategy, dan write patterns.
cross_layers: [3, 4, 7]
spec_ref: requirements.md#8-database-requirements, spec.yaml#database
---

# Layer 6: Database Architecture

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan schema database, strategi penulisan async, dan indexing untuk performa query.

---

## 6.1 Database Schema

### Tables Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    users    │ 1───M    │    chats    │ 1───M    │  messages   │
├─────────────┤          ├─────────────┤          ├─────────────┤
│ id          │          │ id          │          │ id          │
│ email       │          │ userId (FK) │          │ chatId (FK) │
│ name        │          │ title       │          │ role        │
│ image       │          │ createdAt   │          │ content     │
│ createdAt   │          │ updatedAt   │          │ createdAt   │
└─────────────┘          └─────────────┘          └─────────────┘
```

### Schema Definitions

#### Users Table

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,        -- UUID from auth provider
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  image       TEXT,
  createdAt   TIMESTAMPTZ DEFAULT NOW(),
  updatedAt   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup by email
CREATE INDEX idx_users_email ON users(email);
```

#### Chats Table

```sql
CREATE TABLE chats (
  id          TEXT PRIMARY KEY,        -- UUID
  userId      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT,                    -- Generated from first message
  createdAt   TIMESTAMPTZ DEFAULT NOW(),
  updatedAt   TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: Index for fast sidebar loading
CREATE INDEX idx_chats_userId_createdAt
  ON chats(userId, createdAt DESC);

-- Index for title search (future feature)
CREATE INDEX idx_chats_userId_title ON chats(userId, title);
```

#### Messages Table

```sql
CREATE TABLE messages (
  id          TEXT PRIMARY KEY,        -- UUID
  chatId      TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  createdAt   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for loading chat messages in order
CREATE INDEX idx_messages_chatId_createdAt
  ON messages(chatId, createdAt ASC);

-- Index for message search (future feature)
CREATE INDEX idx_messages_chatId_role ON messages(chatId, role);
```

---

## 6.2 ORM Implementation (Prisma)

### Schema File

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // or "sqlite" for local dev
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  chats     Chat[]
}

model Chat {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]

  @@index([userId, createdAt(sort: Desc)])
}

model Message {
  id        String   @id @default(cuid())
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  role      String   // 'user' | 'assistant' | 'system'
  content   String   @db.Text
  createdAt DateTime @default(now())

  @@index([chatId, createdAt(sort: Asc)])
}
```

---

## 6.3 Async Write Strategy

### The Problem

```
Naive approach (WRONG):
┌──────────────────────────────────────────┐
│  streamText() → save to DB → return SSE  │
│       │                │                 │
│       │           BLOCKING!              │
│       │           Latency +               │
│       └──────────────────┘               │
│         User waits longer                │
└──────────────────────────────────────────┘

Correct approach (RIGHT):
┌──────────────────────────────────────────┐
│  streamText() → return SSE ──────────────────┐
│       │                │                     │
│       │           onFinish                   │
│       │           callback                   │
│       │           (async,                    │
│       │          fire-and-forget)            │
│       └──────────────────────────────────┘
│         User sees tokens immediately      │
└──────────────────────────────────────────┘
```

### Implementation

```typescript
// lib/db/queries.ts
import { db } from '@/lib/db';

interface SaveMessageParams {
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
}

export async function saveMessage(params: SaveMessageParams) {
  return db.message.create({
    data: {
      id: generateId(), // Or let DB auto-generate
      chatId: params.chatId,
      role: params.role,
      content: params.content,
    },
  });
}

export async function saveChatAndMessages({
  chatId,
  userMessage,
  assistantMessage,
}: {
  chatId: string;
  userMessage: { role: 'user'; content: string };
  assistantMessage: { role: 'assistant'; content: string };
}) {
  // Single transaction for consistency
  return db.$transaction([
    db.message.create({ data: { chatId, ...userMessage } }),
    db.message.create({ data: { chatId, ...assistantMessage } }),
    db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    }),
  ]);
}
```

### Route Handler Integration

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    maxTokens: 2048,

    // onFinish: fires AFTER stream completes
    // The callback is async but we don't await it
    // This is fire-and-forget for zero blocking
    onFinish: async ({ text, usage }) => {
      const chatId = /* derive from session or create new */;

      try {
        await saveChatAndMessages({
          chatId,
          userMessage: messages[messages.length - 1],
          assistantMessage: { role: 'assistant', content: text },
        });
      } catch (error) {
        // Log error but DON'T throw
        // Throwing here would disrupt the stream response
        console.error('Failed to save messages:', error);
      }
    },
  });

  return result.toDataStreamResponse();
}
```

---

## 6.4 Read Patterns

### Load Chat History for Sidebar

```typescript
// lib/db/queries.ts
export async function getChatsByUserId(userId: string) {
  return db.chat.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    // Limit for performance
    take: 50,
  });
}
```

### Load Messages for Chat Page

```typescript
export async function getChatWithMessages(chatId: string, userId: string) {
  return db.chat.findFirst({
    where: {
      id: chatId,
      userId, // IDOR check at DB level
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}
```

### Create New Chat

```typescript
export async function createChat(userId: string, title?: string) {
  return db.chat.create({
    data: {
      userId,
      title: title || 'New Chat',
    },
  });
}
```

---

## 6.5 Indexing Strategy

### Critical Indexes

| Index | Query | Why |
|-------|-------|-----|
| `chats(userId, createdAt DESC)` | Sidebar loading | Fast, ordered by recency |
| `messages(chatId, createdAt ASC)` | Message history | Fast, in-order loading |
| `users(id)` | FK lookups | Implicit (PK) |

### Index Maintenance

```sql
-- Monitor index usage
SELECT
  indexrelname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public';
```

---

## 6.6 Transaction Boundaries

### When to Use Transactions

```typescript
// USE transaction for:
// - Creating chat + first message together
// - Updating chat title + saving message

await db.$transaction(async (tx) => {
  // Create chat
  const chat = await tx.chat.create({ data: { userId } });

  // Save first message
  await tx.message.create({
    data: { chatId: chat.id, role: 'user', content: firstMessage },
  });

  // Generate and save title
  const title = await generateTitle(firstMessage);
  await tx.chat.update({
    where: { id: chat.id },
    data: { title },
  });
});

// DON'T use transaction for:
// - Saving streaming messages (already in-progress chat)
// - Background title generation
```

---

## 6.7 Soft Delete (Future Consideration)

```typescript
// If implementing soft delete (from compliance requirements):
model Chat {
  deletedAt DateTime? // null = active, set = deleted

  @@index([userId, deletedAt]) // Exclude deleted in queries
}

export async function getChatsByUserId(userId: string) {
  return db.chat.findMany({
    where: {
      userId,
      deletedAt: null, // Filter out deleted
    },
  });
}
```

---

## Acceptance Criteria

- [ ] Schema defines users, chats, messages tables
- [ ] Primary keys use UUID/text (not auto-increment)
- [ ] Foreign keys cascade delete
- [ ] Index on chats(userId, createdAt DESC) exists
- [ ] Index on messages(chatId, createdAt ASC) exists
- [ ] DB writes happen in onFinish callback (async)
- [ ] DB writes do NOT block SSE response
- [ ] Chat creation + first message in transaction
- [ ] IDOR check at DB query level
- [ ] Error logging on failed DB writes (no throwing)
