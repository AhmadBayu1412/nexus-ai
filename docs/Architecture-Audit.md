# Architecture Audit: Core Chat Streaming Module

**Tier:** 1 (Mission Critical - Requires full security, performance, and data integrity checks)

## Layers 1-4: Frontend & Interaction

- **L1 - Visual UI:** Sidebar (chat history), Main Chat Area (message list), Auto-expanding textarea, Submit/Stop toggle button, Scroll-to-bottom affordance, Thinking Indicator (loading state).
- **L2 - UX Audit:** Users receive instant visual feedback via token-by-token streaming. The UI must feature "smart auto-scroll": it pins to the bottom during streaming but releases the lock immediately if the user manually scrolls up to read past messages.
- **L3 - Business Flow:** User Input -> Auth Check -> Rate Limit Check -> Invoke `streamText` -> Stream SSE to client -> Asynchronously save partial/complete messages to the database (KV/Postgres) upon stream completion.
- **L4 - State Management:** \* _Client State:_ Current text input, isLoading/isStreaming boolean, partial streaming text.
  - _Server State:_ Persistent chat history (synced via React Server Components).

## Layers 5-6: API & Database

- **L5 - API Contract:** The `/api/chat` endpoint does NOT use standard JSON REST. It utilizes **Server-Sent Events (SSE)** via `text/event-stream`. Idempotency is handled on the client side by disabling the submit button while `isLoading` is true.
- **L6 - Database Architecture:** \* Tables: `chats` (id, userId, title, path) and `messages` (id, chatId, role, content).
  - Strategy: Database insertions for user messages and assistant responses must be triggered in the background (using the `onFinish` callback in the AI SDK) to ensure zero latency blocking on the streaming response.

## Layers 7-8: Business Rules & Architecture

- **L7 - Business Rules:** 1. Empty string submissions must be blocked on the client side. 2. The system must implicitly trigger a background AI call to generate a concise chat title based on the user's first message. 3. Strict isolation: Users can only read/write chats associated with their own `userId`.
- **L8 - System Architecture:** Next.js App Router paradigm. Separation of concerns: UI state managed by `useChat` hook (Client Component), backend LLM connection managed by `POST /api/chat` (Route Handler), DB operations via ORM (Prisma/Drizzle), Authentication via Firebase Auth (GitHub OAuth). Server-side token verification uses the Firebase Admin REST API to validate Bearer tokens in the Authorization header.

## Layers 9-11: Security, Testing, & Observability

- **L9 - Security & Access Control:**
  - _IDOR Check:_ The system must validate `session.user.id === chat.userId` before rendering any chat history or accepting new messages.
  - _Rate Limiting:_ Implement Upstash Redis rate limiting to prevent billing abuse (e.g., max 10 requests per 10 seconds per IP/User).
- **L10 - Testing Strategy:** Require mock testing for the LLM provider API to avoid incurring costs during CI/CD pipelines. Implement component tests for the auto-scroll hydration logic during chunk streaming.
- **L11 - Observability:** Log exact token usage metrics per session. Implement explicit error handling and logging for LLM provider timeouts (HTTP 504) or API key exhaustion.
