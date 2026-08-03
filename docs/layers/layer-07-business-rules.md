---
layer: 7
name: Business Rules
tier: 1
purpose: Mendefinisikan aturan bisnis spesifik yang mengatur behavior sistem.
cross_layers: [3, 6, 9]
spec_ref: requirements.md#1-business-requirements, spec.yaml#business_rules
---

# Layer 7: Business Rules

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan aturan bisnis spesifik yang mengatur behavior sistem — validasi input, title generation, dan ownership isolation.

---

## 7.1 Rule: Prevent Empty Submission

### Specification (from spec.yaml)

```yaml
business_rule:
  id: prevent_empty_submission
  description: 'Users cannot submit empty or whitespace-only strings.'
  conditions:
    - 'input.trim().length === 0'
  actions:
    - 'disable_submit_button'
```

### Implementation

#### Client-Side (Primary Guard)

```typescript
// components/ChatInput.tsx
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();

  // Rule: Block empty/whitespace-only
  if (!input.trim()) {
    return; // Early exit - button should also be disabled
  }

  handleSubmitForm(e);
};

// Button state
<button
  type="submit"
  disabled={isLoading || !input.trim()}
  // isLoading already prevents double-submit
  // !input.trim() prevents empty
>
  Send
</button>
```

#### Server-Side (Defense in Depth)

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json();

  // Validate: last message must have content
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage?.content?.trim()) {
    return new Response('Empty message not allowed', { status: 400 });
  }

  // Proceed with stream...
}
```

---

## 7.2 Rule: Generate Title on First Message

### Specification (from spec.yaml)

```yaml
business_rule:
  id: generate_title_on_first_message
  description: "If this is the first message in a newly created chatId, trigger a background AI task to generate a short title based on the user's input."
  conditions:
    - 'messages.length === 1'
  actions:
    - 'async_generate_title() AND update_db_title()'
```

### Implementation Flow

```
[NEW CHAT CREATED]
        │
        ▼
  Is this first message?
        │
        ├─→ YES → Trigger title generation
        │           │
        │           ▼
        │      ┌─────────────────────────┐
        │      │ Call lightweight LLM:  │
        │      │ Prompt: "Summarize in  │
        │      │ 5 words or less: {msg}" │
        │      └───────────┬─────────────┘
        │                  │ (5-10 tokens max)
        │                  ▼
        │      ┌─────────────────────────┐
        │      │ UPDATE chats SET        │
        │      │ title = {result}        │
        │      │ WHERE id = chatId       │
        │      └─────────────────────────┘
        │
        └─→ NO → Skip (title already exists)
```

### Title Generation Implementation

```typescript
// lib/ai/title-generator.ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function generateChatTitle(
  userMessage: string
): Promise<string> {
  const { text } = await generateText({
    model: openai('gpt-4o-mini'), // Lightweight model
    system: `You are a chat title generator. Given a user's first message,
             generate a short, concise title (max 5 words, no quotes).
             Be specific but brief. Example: "React useEffect guide"`,
    prompt: `Generate a title for this message: "${userMessage}"`,
    maxTokens: 15, // ~5 words
    temperature: 0.7,
  });

  // Clean up: trim, remove quotes, limit length
  return text.trim().replace(/^["']|["']$/g, '').slice(0, 100);
}
```

### Integration in Route Handler

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages, chatId } = await req.json();
  const isFirstMessage = messages.length === 1;

  const result = await streamText({
    model: openai('gpt-4o'),
    messages,

    onFinish: async ({ text }) => {
      try {
        // Always save messages
        await saveChatAndMessages({
          chatId,
          userMessage: messages[messages.length - 1],
          assistantMessage: { role: 'assistant', content: text },
        });

        // If first message, generate title
        if (isFirstMessage) {
          const title = await generateChatTitle(messages[0].content);
          await db.chat.update({
            where: { id: chatId },
            data: { title },
          });
        }
      } catch (error) {
        console.error('onFinish error:', error);
        // Don't throw - stream already sent
      }
    },
  });

  return result.toDataStreamResponse();
}
```

### Title Generation Rules

| Rule | Value |
|------|-------|
| Max tokens | 15 (~5 words) |
| Model | gpt-4o-mini (cheaper, faster) |
| Max DB length | 100 characters |
| Default if fail | "New Chat" |
| Language | Match user's input language |

---

## 7.3 Rule: User ID Isolation (Strict)

### Specification (from requirements.md & spec.yaml)

```yaml
authorization:
  resource: chat
  action: read_and_write
  rule: 'chat.userId === current_user.id'
```

### Implementation Layers

#### Layer 1: RSC Page Load

```typescript
// app/chat/[id]/page.tsx
export default async function ChatPage({ params }) {
  const session = await auth();
  const chat = await getChatById(params.id);

  // CRITICAL: IDOR check
  if (!chat || chat.userId !== session.user.id) {
    notFound(); // Returns 404, not 403 (don't leak existence)
  }

  return <ChatUI chat={chat} />;
}
```

#### Layer 2: API Route Handler

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { chatId, messages } = await req.json();

  // Verify chat ownership before streaming
  const chat = await db.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== session.user.id) {
    return new Response('Chat not found', { status: 404 });
  }

  // Proceed with stream...
}
```

#### Layer 3: Chat Management API Routes (GET / DELETE)

All chat management API routes (`GET /api/chats/[id]`, `DELETE /api/chats/[id]`) perform IDOR verification before returning data or performing operations.

```typescript
// app/api/chats/[id]/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // IDOR check: verify chat belongs to current user
  const chat = await db.chat.findUnique({ where: { id: params.id } });
  if (!chat || chat.userId !== session.user.id) {
    return new Response('Not found', { status: 404 }); // Leak-proof
  }

  // Return chat with messages...
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // IDOR check: verify chat belongs to current user
  const chat = await db.chat.findUnique({ where: { id: params.id } });
  if (!chat || chat.userId !== session.user.id) {
    return new Response('Not found', { status: 404 }); // Leak-proof
  }

  // Proceed with deletion...
}
```

#### Layer 3: Database Query

```typescript
// lib/db/queries.ts
export async function getMessages(chatId: string, userId: string) {
  // IDOR check embedded in query
  const chat = await db.chat.findFirst({
    where: { id: chatId, userId }, // Must match BOTH
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  return chat; // null if not owned by user
}
```

#### Layer 4: Database Constraint (Defense in Depth)

```sql
-- Ensure userId match at DB level (optional but recommended)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_isolation ON chats
  USING (userId = current_user_id());
```

---

## 7.4 Rule: Stop Generation + Partial Save

### Specification (from requirements.md & spec.yaml)

```yaml
testing:
  definition_of_done:
    - 'The Stop button must immediately halt the generation stream
       and persist the partial text to the database.'
```

### Implementation

```typescript
// components/ChatUI.tsx
const { stop, messages } = useChat({
  onFinish: async (message) => {
    // This fires when stream completes naturally
    await saveMessage({ chatId, ...message });
  },
});

const handleStop = () => {
  stop(); // Abort fetch, set isLoading = false

  // Partial text is already in messages array
  // (useChat manages this automatically)

  // Save partial:
  const partialAssistant = messages.find(
    (m) => m.role === 'assistant' && m.content
  );

  if (partialAssistant) {
    savePartialMessage({
      chatId,
      content: partialAssistant.content,
      isPartial: true, // Optional flag
    });
  }
};
```

---

## 7.5 Business Rules Summary Table

| Rule ID | Condition | Action | Location |
|---------|-----------|--------|----------|
| `prevent_empty_submission` | `input.trim() === ''` | Block submit | Client + Server |
| `generate_title_on_first_message` | `messages.length === 1` | Generate + save title | Server (onFinish) |
| `user_id_isolation` | Always | Check `chat.userId === session.user.id` | RSC + API + DB |
| `stop_and_persist` | User clicks Stop | Abort stream + save partial | Client + Server |

---

## 7.6 Edge Cases

### Empty After Trim
```typescript
// "   " (spaces only) should be blocked
input.trim().length === 0 // true → block
input.trim().length > 0  // false → allow
```

### Very Long First Message
```typescript
// Truncate for title generation
const truncated = userMessage.slice(0, 500);
// Title gen prompt: summarize this: "{truncated}"
```

### Title Generation Fails
```typescript
// Fallback title
const title = generatedTitle || 'New Chat';
await db.chat.update({ where: { id: chatId }, data: { title } });
```

### Race Condition: Stop vs onFinish
```typescript
// If user stops, onFinish may or may not fire
// UseChat: stop() sets isLoading=false
// Partial text IS in messages array
// onFinish: only fires if stream completed
// Solution: save partial when stopping (as shown above)
```

---

## Acceptance Criteria

- [ ] Empty string blocked (client-side + server-side)
- [ ] Whitespace-only string blocked
- [ ] Submit button disabled for empty input
- [ ] First message triggers title generation
- [ ] Title is 5 words or less
- [ ] Title saved to database after generation
- [ ] Default title "New Chat" if generation fails
- [ ] Stop button aborts stream immediately
- [ ] Partial text visible after stop
- [ ] Partial text saved to database
- [ ] IDOR: accessing other user's chat returns 404
- [ ] IDOR: posting to other user's chat returns 404
