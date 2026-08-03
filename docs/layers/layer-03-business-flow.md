---
layer: 3
name: Business Flow
tier: 1
purpose: Mendefinisikan alur data end-to-end dari user input hingga response dan persistence.
cross_layers: [4, 5, 6, 7, 8, 9]
spec_ref: requirements.md#1-business-requirements, spec.yaml#business_rules
---

# Layer 3: Business Flow

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan pipeline alur data end-to-end: dari user input → processing → streaming → persistence.

---

## 3.1 End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUSINESS FLOW PIPELINE                          │
└─────────────────────────────────────────────────────────────────────────────┘

  [USER INPUT]
       │
       ▼
  ┌─────────────────┐
  │  Client Side    │  ← layer-01-visual-ui.md
  │  - Empty check  │
  │  - Trim input   │
  └────────┬────────┘
           │ submit()
           ▼
  ┌─────────────────┐
  │  Auth Check     │  ← layer-09-security-access-control.md
  │  - session.user │
  │    .id exists?  │
  └────────┬────────┘
           │ No session → reject
           ▼
  ┌─────────────────┐
  │  Rate Limit     │  ← layer-09-security-access-control.md
  │  - Upstash Redis│
  │  - 10 req/10s   │
  │    per IP/User  │
  │  - (skipped in  │
  │    dev if no    │
  │    Redis env)   │
  └────────┬────────┘
           │ 429 → reject
           ▼
  ┌─────────────────┐
  │  streamText()    │  ← layer-08-system-architecture.md
  │  - Vercel AI SDK│
  │  - LLM Provider │
  │  - System prompt │
  └────────┬────────┘
           │ SSE stream (text/event-stream)
           ▼
  ┌─────────────────┐
  │  Client Render  │  ← layer-02-ux-audit.md
  │  - Token arrive │
  │  - Append to text│
  │  - Auto-scroll  │
  │    (unpins at   │
  │    50px scroll) │
  └────────┬────────┘
           │
           ▼ (onFinish callback)
  ┌──────────────────────────────────────────────────────┐
  │  Async DB Write (BACKGROUND - non-blocking)          │  ← layer-06-database-architecture.md
  │  1. Save user message to messages table             │
  │  2. Save assistant message to messages table        │
  │  3. (If first message) Generate & save chat title   │  ← layer-07-business-rules.md
  └──────────────────────────────────────────────────────┘
```

---

## 3.2 Detailed Step Breakdown

### Step 1: User Input (Client)
```
Action: User types in textarea, presses Enter
Validation:
  - input.trim().length === 0 → block (see layer-07)
  - isLoading === true → block (idempotency)
State update:
  - Append user message to local messages array
  - Set isLoading = true
  - Clear textarea (input preserved on stream error for retry)
  - Reset textarea height
Keyboard shortcut: Ctrl/Cmd+K focuses chat input (global)
```

### Step 2: Auth Check (Server)
```
Location: POST /api/chat route handler
Action:
  - Get session via getServerSession() or auth()
  - If no session → return 401 { error: 'UNAUTHORIZED' }
  - Extract session.user.id for IDOR checks
```

### Step 3: Rate Limit Check (Server)
```
Location: POST /api/chat route handler (before streamText)
Action:
  - Call Upstash Redis rate limiter
  - Key: IP address OR userId
  - Limit: 10 requests per 10 seconds
  - If exceeded → return 429 { error: 'RATE_LIMIT_EXCEEDED' }
```

### Step 4: streamText() Invocation (Server)
```
Location: POST /api/chat route handler
Action:
  - Build messages array with system prompt (from lib/ai/config.ts)
  - Call streamText() with:
    - model: configured LLM model
    - messages: conversation history + user input
    - maxTokens: 2048 (billing abuse protection)
    - onFinish: callback for async DB writes
    - onError: callback for error handling
```

### Step 5: SSE Stream to Client
```
Format: text/event-stream (Server-Sent Events)
Events:
  - type: 'text' → delta text chunk
  - type: 'error' → error message
  - type: 'done' → stream complete signal
Implementation:
  - Use Vercel AI SDK's DataStreamResponse
  - Or use ResponseStream from AI SDK
```

### Step 6: Async DB Write (onFinish Callback)
```
Trigger: When stream completes OR is stopped
Action:
  1. Save user message:
     INSERT INTO messages (chatId, role, content, createdAt)
     VALUES (chatId, 'user', userContent, NOW())

  2. Save assistant message:
     INSERT INTO messages (chatId, role, content, createdAt)
     VALUES (chatId, 'assistant', assistantContent, NOW())

  3. If first message in chat:
     - Trigger title generation (layer-07)
     - UPDATE chats SET title = generatedTitle WHERE id = chatId

Timing: Async (Promise, fire-and-forget with error logging)
Blocking: MUST NOT block SSE response

Special Case: New Chat Creation
  - If chatId is undefined (new chat):
    1. INSERT INTO chats (id, userId, title, createdAt)
       VALUES (uuid, session.user.id, 'New Chat', NOW())
    2. Return new chatId to client via SSE redirect event
    3. Client updates URL to /chat/{realChatId}
```

---

## 3.3 Stop Generation Flow

```
[USER CLICKS STOP]
     │
     ▼
  ┌─────────────────────┐
  │  stop() from useChat │
  │  - Abort fetch stream│
  │  - Set isLoading=false│
  │  - Set isStreaming=false│
  │  - Partial text stays │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  Partial Save        │
  │  (If partial content)│
  │  - Save partial as   │
  │    assistant message │
  │  - isFinished=false  │
  │    flag in DB?       │
  └─────────────────────┘
```

---

## 3.4 Error Handling Flow

```
[STREAM ERROR]
     │
     ├─→ HTTP 504 / Timeout
     │       │
     │       ▼
     │   ┌─────────────────────┐
     │   │ onError callback    │
     │   │ - Log error         │
     │   │ - If partial text:  │
     │   │   save to DB        │
     │   │ - Return 504 to UI │
     │   └─────────────────────┘
     │
     ├─→ API Key Exhausted
     │       │
     │       ▼
     │   ┌─────────────────────┐
     │   │ 401 or 403          │
     │   │ Show "API Error"     │
     │   │ toast to user       │
     │   └─────────────────────┘
     │
     └─→ Generic Error
             │
             ▼
         ┌─────────────────────┐
         │ Log to console      │
         │ Save partial (if any)│
         │ Show error toast     │
         └─────────────────────┘
```

---

## 3.5 Title Generation Flow (First Message)

```
[ON FIRST MESSAGE]
     │
     ▼
  ┌────────────────────────────┐
  │  Check: messages.length===1 │
  │  (newly created chat)       │
  └──────────────┬──────────────┘
                 │
                 ▼
  ┌────────────────────────────┐
  │  Trigger async title gen   │
  │  (separate from main stream)│
  └──────────────┬──────────────┘
                 │
                 ▼
  ┌────────────────────────────┐
  │  Call lightweight LLM:     │
  │  - Max 5-10 tokens         │
  │  - Short, concise title    │
  │  - Based on user message   │
  └──────────────┬──────────────┘
                 │
                 ▼
  ┌────────────────────────────┐
  │  UPDATE chats SET          │
  │  title = generatedTitle    │
  │  WHERE id = chatId         │
  └────────────────────────────┘
```

---

## 3.6 Idempotency Guarantees

| Scenario | Protection |
|----------|-----------|
| Rapid double-submit | `isLoading` flag disables button |
| Page refresh mid-stream | Server detects via session + chatId |
| Network timeout retry | Client generates new message ID |
| Duplicate onFinish calls | Check if message already saved |

---

## Acceptance Criteria

- [ ] Empty/whitespace input blocked on client
- [ ] No auth → 401 returned, UI shows login prompt
- [ ] Rate limit exceeded → 429 returned, UI shows retry timer
- [ ] streamText() receives correct messages array with system prompt
- [ ] SSE stream delivers tokens to client in real-time
- [ ] DB writes happen async without blocking stream
- [ ] Stop button aborts stream and saves partial text
- [ ] onFinish callback saves both user and assistant messages
- [ ] First message triggers title generation
- [ ] All errors logged and partial content preserved
- [ ] Idempotency maintained (no duplicate messages)
