---
layer: 9
name: Security & Access Control
tier: 1
purpose: Mendefinisikan semua aspek keamanan - authentication, authorization, IDOR prevention, dan rate limiting.
cross_layers: [3, 5, 6, 7]
spec_ref: requirements.md#4-security-requirements, spec.yaml#security
---

# Layer 9: Security & Access Control

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan semua aspek keamanan — authentication, authorization, IDOR prevention, dan rate limiting untuk mencegah abuse.

---

## 9.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYER                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         REQUEST LIFECYCLE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  [INCOMING REQUEST]
         │
         ▼
  ┌──────────────────┐
  │  1. AUTH CHECK    │  ← Siapa kamu? (Session valid?)
  │  - Session exist? │
  │  - Token valid?   │
  └────────┬─────────┘
           │ 401 Unauthorized
           ▼
  ┌──────────────────┐
  │  2. RATE LIMIT   │  ← Berapa sering? (Upstash Redis)
  │  - IP / UserID   │
  │  - 10 req/10s    │
  └────────┬─────────┘
           │ 429 Too Many Requests
           ▼
  ┌──────────────────┐
  │  3. IDOR CHECK   │  ← Boleh akses? (Owner validation)
  │  - chat.userId   │
  │  === session.id  │
  └────────┬─────────┘
           │ 404 Not Found (leak-proof)
           ▼
  ┌──────────────────┐
  │  4. PROCESS      │  ← LLM streaming
  │  - maxTokens     │     (billing protection)
  │  - Input sanitize│
  └────────┬─────────┘
           │
           ▼
      [RESPONSE]
```

---

## 9.2 Authentication (Firebase Auth)

### Overview

The application uses **Firebase Auth** with GitHub OAuth for authentication. Unlike NextAuth.js (which uses session cookies managed server-side), Firebase Auth is a client-first system:

- **Client side:** Firebase SDK handles sign-in via `signInWithRedirect`. The user's ID token is stored in an HTTP-only cookie by the client SDK.
- **Server side:** Route Handlers and Server Components verify tokens using the **Firebase Admin SDK**, which calls the Firebase REST API to validate the ID token passed in the `Authorization: Bearer <token>` header.
- **NEXTAUTH_\* environment variables and NextAuth tables (Account, Session, VerificationToken) in the Prisma schema are not used.** They are dead code retained for potential future migration.

### Configuration

#### Client-side (Firebase SDK)

```typescript
// lib/auth/firebase.ts
import { initializeApp, getAuth } from 'firebase/app';
import { GithubAuthProvider, signInWithRedirect } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const githubProvider = new GithubAuthProvider();

export async function signInWithGitHub() {
  await signInWithRedirect(auth, githubProvider);
}
```

#### Server-side (Firebase Admin REST API)

```typescript
// lib/auth/firebaseAdmin.ts
// Uses Firebase Admin REST API (no gRPC) for token verification

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function verifyIdToken(idToken: string) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v2/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await res.json();
  if (data.users?.[0]) {
    return { uid: data.users[0].localId, email: data.users[0].email };
  }
  return null;
}

export async function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  return verifyIdToken(token);
}
```

### Auth Helper (Server Components & Route Handlers)

```typescript
// Usage in Server Components (RSC)
import { getUserFromToken } from '@/lib/auth/firebaseAdmin';
import { cookies } from 'next/headers';

export default async function ChatPage({ params }) {
  // Read token from cookie (set by Firebase SDK client)
  const cookieStore = await cookies();
  const idToken = cookieStore.get('firebase-id-token')?.value;
  const user = idToken ? await verifyIdToken(idToken) : null;

  if (!user) {
    redirect('/login');
  }

  // Use user.uid as the user identifier
  const chat = await db.chat.findFirst({
    where: { id: params.id, userId: user.uid },
  });
}
```

### Middleware (Pass-through, not Auth Guard)

```typescript
// middleware.ts
// Firebase Auth is client-side; middleware does NOT enforce auth.
// It only handles Firebase-cookie sync and passes requests through.
// Auth checks are done per-request in Route Handlers and RSC.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Pass all requests through — auth is enforced by each route handler
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

> **Note:** The middleware is pass-through. Authentication is enforced inside each Route Handler and Server Component by calling `getUserFromToken(req)` (for route handlers) or by reading the Firebase ID token from cookies (for RSC).

---

## 9.3 Authorization & IDOR Prevention

### The IDOR Problem

```
IDOR (Insecure Direct Object Reference):

Attacker knows: chatId = "abc123"
Attacker requests: GET /chat/abc123

Without IDOR check:
  → Returns chat even if it belongs to another user

With IDOR check:
  → Returns 404 (not 403 - don't leak existence)
```

### IDOR Check Implementation (RSC)

```typescript
// app/chat/[id]/page.tsx
export default async function ChatPage({ params }) {
  // Verify Firebase ID Token from cookie
  const cookieStore = await cookies();
  const idToken = cookieStore.get('firebase-id-token')?.value;
  const user = idToken ? await verifyIdToken(idToken) : null;

  // IDOR Check #1: User is authenticated
  if (!user) {
    redirect('/login');
  }

  // IDOR Check #2: Chat belongs to user
  const chat = await db.chat.findUnique({
    where: { id: params.id },
  });

  if (!chat || chat.userId !== user.uid) {
    notFound(); // Returns 404 - leak-proof
  }

  return <ChatUI chat={chat} />;
}
```

### IDOR Check Implementation (API)

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  // Auth check: verify Firebase ID Token from Bearer header
  const user = await getUserFromToken(req);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { chatId, messages } = await req.json();

  // IDOR Check #3: Chat belongs to current user
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.userId !== user.uid) {
    return new Response('Chat not found', { status: 404 });
  }

  // Proceed...
}
```

### IDOR Check in Database Query

```typescript
// lib/db/queries.ts
export async function getMessages(chatId: string, userId: string) {
  // IDOR check embedded in WHERE clause
  return db.chat.findFirst({
    where: {
      id: chatId,
      userId: userId, // MUST match
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

// Usage
const chat = await getMessages(chatId, user.uid);
if (!chat) {
  // Either doesn't exist OR belongs to another user
  // Don't differentiate - return 404 for both
  notFound();
}
```

### IDOR Checklist

| Endpoint | Check | Implementation |
|----------|-------|----------------|
| GET /chat/[id] | chat.userId === user.uid | RSC query + null check |
| POST /api/chat | chat.userId === user.uid | API query + 404 |
| GET /api/chats | Filter by user.uid | API query (list only own chats) |
| GET /api/chats/[id] | chat.userId === user.uid | API query + 404 |
| DELETE /api/chats/[id] | chat.userId === user.uid | API query + 404 |
| Any DB query | Always include userId filter | Query builder pattern |

---

## 9.4 Rate Limiting (Upstash Redis)

### Why Rate Limiting?

```
Without rate limiting:
  - Attacker: 1000 requests/second
  - Cost: $1000/hour on OpenAI API
  - Result: Massive billing abuse

With rate limiting:
  - Attacker: 10 requests/10 seconds
  - Cost: $0.10/hour
  - Result: Negligible, no abuse
```

### Rate Limit Configuration (spec.yaml)

```yaml
threat_checklist:
  rate_limit: 'Implement Rate Limiting (e.g., using Upstash Redis) to prevent spam requests.'
```

### Implementation

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create rate limiter (conditionally, based on Redis availability)
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
    analytics: true, // Enable analytics
    prefix: 'ratelimit:chat',
  });
}

interface RateLimitResult {
  success: boolean;
  limit: number;       // Max requests allowed
  remaining: number;   // Requests remaining
  reset: number;       // Timestamp when limit resets
}

export async function rateLimit(
  identifier: string
): Promise<RateLimitResult> {
  // Dev fallback: skip rate limiting when Redis is not configured
  if (!ratelimit) {
    return { success: true, limit: Infinity, remaining: Infinity, reset: 0 };
  }

  const result = await ratelimit.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

### Usage in API Route

```typescript
// app/api/chat/route.ts
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const user = await getUserFromToken(req);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Rate limit by user ID (or IP as fallback)
  const identifier = user.uid;
  const { success, remaining, reset } = await rateLimit(identifier);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  // Proceed with stream...
}
```

### Rate Limit Strategy

| Scenario | Identifier | Limit | Window |
|----------|-----------|-------|--------|
| Logged-in user | `userId` | 10 | 10 seconds |
| Anonymous (signup) | `IP address` | 5 | 60 seconds |
| Login attempts | `IP + email` | 3 | 15 minutes |
| Title generation | `userId` | 5 | 60 seconds |

---

## 9.5 API Key Protection

### Never Expose to Client

```typescript
// WRONG - API key exposed!
export default function ChatUI() {
  const apiKey = process.env.OPENAI_API_KEY; // ERROR: undefined in client
  return <div>{apiKey}</div>; // Renders as undefined, but still bad practice
}

// CORRECT - API key server-side only
// app/api/chat/route.ts
export async function POST(req: Request) {
  // API key is used HERE, server-side only
  // It's never sent to the client
  const result = await streamText({
    model: openai('gpt-4o'),
    // openai() reads API key from OPENAI_API_KEY env var
    // This happens server-side only
  });

  return result.toDataStreamResponse();
}
```

### Environment Variable Security

```bash
# .env.local - NEVER commit this file
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
DATABASE_URL="postgresql://..."

# Vercel Project Settings
# Set these as Environment Variables in Vercel dashboard
# Select "Server-side only" for API keys
```

---

## 9.6 Input Sanitization (XSS Prevention)

### Markdown Rendering Safety

```typescript
// components/chat/ChatMessage.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ChatMessage({ content, role }) {
  return (
    <div className={role === 'user' ? 'user-bubble' : 'assistant-bubble'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Prevent script injection
          script: () => null,
          // Safe code blocks
          code: ({ node, inline, className, children, ...props }) => {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

### User Input Validation

```typescript
// Sanitize before saving to DB
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  // Remove potential XSS vectors
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: [], // Strip all attributes
  });
}

// In API route
const { content } = await req.json();
const sanitized = sanitizeInput(content);
```

---

## 9.7 Security Checklist

| Category | Item | Status |
|----------|------|--------|
| Authentication | Session validation on every request | Required |
| Authorization | IDOR check on all resource access (including /api/chats/*) | Required |
| Rate Limiting | Upstash Redis, 10 req/10s/user (skipped in dev if Redis absent) | Required |
| API Key | Never expose to client bundle | Required |
| XSS | Sanitize markdown output | Required |
| CSRF | Firebase ID Token in Bearer header | Handled |
| Headers | X-Frame-Options: DENY, X-Content-Type-Options: nosniff (SSE endpoint) | Recommended |

---

## Acceptance Criteria

- [ ] All protected routes require authentication
- [ ] Session validation on every API request
- [ ] IDOR check on GET /chat/[id] (returns 404, not 403)
- [ ] IDOR check on POST /api/chat (returns 404, not 403)
- [ ] IDOR check on GET /api/chats/[id] (returns 404, not 403)
- [ ] IDOR check on DELETE /api/chats/[id] (returns 404, not 403)
- [ ] Rate limiting returns 429 with Retry-After header
- [ ] Rate limit: 10 requests per 10 seconds per user
- [ ] Rate limiting skipped in development when Redis is not configured
- [ ] API keys only accessible server-side
- [ ] No API keys in client bundle
- [ ] Markdown output sanitized against XSS
- [ ] All DB queries include userId filter
- [ ] 404 for non-existent OR unauthorized resources
- [ ] SSE endpoint includes X-Content-Type-Options and X-Frame-Options headers
