---
layer: 5
name: API Contract
tier: 1
purpose: Mendefinisikan kontrak API endpoint streaming, format payload, dan error handling.
cross_layers: [3, 6, 7, 9]
spec_ref: requirements.md#7-api-requirements, spec.yaml#api_contract
---

# Layer 5: API Contract

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan kontrak API endpoint `/api/chat` — bukan REST JSON, melainkan SSE streaming.

---

## 5.1 Endpoint Definition

### Primary Endpoint

```
POST /api/chat
Content-Type: application/json
Authorization: Bearer Session Cookie
```

### Chat Management Endpoints

```
GET /api/chats
Content-Type: application/json
Authorization: Bearer Session Cookie

POST /api/chats
Content-Type: application/json
Authorization: Bearer Session Cookie

GET /api/chats/[id]
Content-Type: application/json
Authorization: Bearer Session Cookie

DELETE /api/chats/[id]
Content-Type: application/json
Authorization: Bearer Session Cookie
```

### Request Payload

```typescript
// Request body (JSON)
interface ChatRequest {
  // Messages already includes the NEW user message
  // (useChat handles appending automatically)
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  // Optional:
  chatId?: string;        // For new chats, backend generates
}

// NOTE: The user message to send is in the messages array,
// not as a separate 'content' field
```

### Response Type: Server-Sent Events (SSE)

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### SSE Event Format (Vercel AI SDK)

```typescript
// DataStream format from Vercel AI SDK
event: data
data: {"type":"text","value":"Hello"}

event: data
data: {"type":"text","value":" world"}

event: data
data: {"type":"done"}

event: error
data: {"type":"error","value":"LLM_PROVIDER_TIMEOUT"}

// Or using custom format:
// data: {"message":"Hello world","usage":{...},"finishReason":"stop"}
```

---

## 5.2 Implementation (Vercel AI SDK)

### Route Handler

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai'; // 'ai' package from Vercel
import { openai } from '@ai-sdk/openai'; // or anthropic
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { saveMessages } from '@/lib/db/queries';

export async function POST(req: Request) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Rate limit check
  const { success, limit, remaining, reset } = await rateLimit({
    identifier: session.user.id,
    limit: 10,
    window: '10 s',
  });
  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
      },
    });
  }

  // 3. Parse request
  const { messages } = await req.json();

  // 4. Stream response
  const result = await streamText({
    model: openai('gpt-4o'), // or anthropic('claude-3-5-sonnet-latest')
    system: 'You are a helpful assistant.', // from lib/ai/config.ts
    messages,
    maxTokens: 2048, // Billing abuse protection

    // 5. onFinish: async DB write (non-blocking)
    onFinish: async ({ text, usage, finishReason }) => {
      // Fire-and-forget DB write
      saveMessages({
        chatId: /* derived from context */,
        userMessage: messages[messages.length - 1],
        assistantMessage: { role: 'assistant', content: text },
        usage,
      }).catch(console.error);
    },

    onError: ({ error }) => {
      console.error('LLM Error:', error);
    },
  });

  // 6. Return SSE stream
  return result.toDataStreamResponse();
}
```

---

## 5.3 Error Response Format

### Error Codes (from spec.yaml)

| Code | HTTP Status | Scenario |
|------|-------------|----------|
| `UNAUTHORIZED` | 401 | No session / invalid session |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `LLM_PROVIDER_TIMEOUT` | 504 | LLM provider timeout (>30s) |
| `BILLING_ABUSE` | 400 | maxTokens exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Error Response Body

```typescript
// JSON error response (non-streaming errors)
interface ErrorResponse {
  error: 'UNAUTHORIZED' | 'RATE_LIMIT_EXCEEDED' | 'LLM_PROVIDER_TIMEOUT' | 'BILLING_ABUSE' | 'INTERNAL_ERROR';
  message?: string; // Optional user-friendly message
  retryAfter?: number; // Seconds until retry (for 429)
}
```

### SSE Error Events

```typescript
// For streaming errors (sent as SSE event)
data: {"type":"error","value":"LLM_PROVIDER_TIMEOUT"}
```

---

## 5.4 Idempotency Handling

### Client-Side Idempotency

```typescript
// In useChat hook - button disabled while loading
<button
  type="submit"
  disabled={isLoading}
  onClick={handleSubmit}
>
  {isLoading ? 'Stop' : 'Send'}
</button>

// This prevents:
// - Double-submit on Enter
// - Rapid repetitive submissions
```

### Server-Side Idempotency (Optional Enhancement)

```typescript
// Generate idempotency key per submission
const submissionId = crypto.randomUUID();

// Include in request
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages, submissionId }),
});

// Server checks before processing
if (await isProcessed(submissionId)) {
  return cachedResponse(submissionId);
}
```

---

## 5.5 Request/Response Examples

### Example Request

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=xxx" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is React?"}
    ]
  }'
```

### Example Response Stream

```
event: data
data: {"type":"text","value":"React"}

event: data
data: {"type":"text","value":" is"}

event: data
data: {"type":"text","value":" a"}

event: data
data: {"type":"text","value":" JavaScript"}

event: data
data: {"type":"text","value":" library"}

event: data
data: {"type":"done"}
```

---

## 5.6 Security Headers

```typescript
// Recommended security headers for SSE endpoint
const securityHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Content-Type-Options': 'nosniff',
  // Prevent embedding in iframe (clickjacking)
  'X-Frame-Options': 'DENY',
};
```

---

## 5.7 Versioning

| Version | Endpoint | Notes |
|---------|----------|-------|
| v1 (current) | `/api/chat` | Implicit via App Router structure |
| Future | `/api/v2/chat` | Major breaking changes |

Current approach: implicit versioning via App Router file structure. No `/v1/` prefix needed until major version bump.

---

## 5.8 Chat Management Endpoints

### List Chats

```
GET /api/chats
Authorization: Bearer Session Cookie
```

**Response:** `200 OK`
```typescript
interface ChatsListResponse {
  chats: Array<{
    id: string;
    title: string;
    createdAt: string; // ISO 8601
    updatedAt: string;
  }>;
}
```

**Error Responses:**
| Code | HTTP Status |
|------|-------------|
| `UNAUTHORIZED` | 401 |
| `INTERNAL_ERROR` | 500 |

---

### Create Chat

```
POST /api/chats
Authorization: Bearer Session Cookie
```

**Request Payload:**
```typescript
// Request body (JSON)
interface CreateChatRequest {
  title?: string; // Optional; defaults to "New Chat"
}
```

**Response:** `201 Created`
```typescript
interface CreateChatResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
```

**Notes:** New chats are typically created implicitly when the user sends their first message via `POST /api/chat` (without a chatId). Explicit `POST /api/chats` is available for pre-creating chats.

**Error Responses:**
| Code | HTTP Status |
|------|-------------|
| `UNAUTHORIZED` | 401 |
| `INTERNAL_ERROR` | 500 |

---

### Get Chat

```
GET /api/chats/[id]
Authorization: Bearer Session Cookie
```

**Response:** `200 OK`
```typescript
interface GetChatResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
  }>;
}
```

**Security:** Returns `404 Not Found` (not `403`) if the chat does not exist or does not belong to the authenticated user, preventing existence leakage.

**Error Responses:**
| Code | HTTP Status |
|------|-------------|
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN / NOT_FOUND` | 404 (IDOR-protected) |
| `INTERNAL_ERROR` | 500 |

---

### Delete Chat

```
DELETE /api/chats/[id]
Authorization: Bearer Session Cookie
```

**Response:** `204 No Content`

**Security:** Returns `404 Not Found` (not `403`) if the chat does not exist or does not belong to the authenticated user.

**Error Responses:**
| Code | HTTP Status |
|------|-------------|
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN / NOT_FOUND` | 404 (IDOR-protected) |
| `INTERNAL_ERROR` | 500 |

---

## Acceptance Criteria

- [ ] POST /api/chat returns text/event-stream
- [ ] Tokens stream as SSE data events
- [ ] onFinish callback fires after stream completes
- [ ] onError handles provider errors gracefully
- [ ] Rate limit returns 429 with proper headers
- [ ] Auth failure returns 401
- [ ] Error events sent via SSE for streaming errors
- [ ] No JSON REST response (SSE only)
- [ ] Idempotency: submit button disabled during loading
- [ ] Security headers applied
