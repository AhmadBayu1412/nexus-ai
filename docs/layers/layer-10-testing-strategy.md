---
layer: 10
name: Testing Strategy
tier: 1
purpose: Mendefinisikan strategi testing - mocking LLM provider, component tests, dan definition of done.
cross_layers: [1, 2, 4, 5]
spec_ref: requirements.md#9-development-requirements, spec.yaml#testing
---

# Layer 10: Testing Strategy

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan strategi testing — mocking LLM provider untuk CI/CD, component tests, dan definition of done.

---

## 10.1 Testing Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TESTING PYRAMID                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────┐
                             │   E2E     │  ← Few, slow, expensive
                             │   Tests   │    (Playwright/Cypress)
                            ┌┴───────────┴┐
                           ┌┴─────────────┴┐
                          ┌┴───────────────┴┐
                         ┌┴─────────────────┴┐
                        ┌┴───────────────────┴┐
                       ┌┴─────────────────────┴┐
                      ┌┴───────────────────────┴┐
                     │        UNIT TESTS         │  ← Many, fast, cheap
                     │  (Vitest/Jest)            │    (ChatInput, etc.)
                     └───────────────────────────┘

Cost: $$$$ → $                                               │
Speed: Slow → Fast                                           │
Quantity: Few → Many                                         │
                                                         Focus area
```

---

## 10.2 Mocking LLM Provider

### Why Mock?

```
Without mocking:
  - Each CI run: $0.01-0.10 in API costs
  - 100 test runs/day = $1-10/day
  - 100 test runs/day = $30-300/month
  - Plus: API rate limits
  - Plus: Flaky tests (network issues)

With mocking:
  - $0 in API costs
  - No rate limits
  - Instant responses
  - Deterministic tests
```

### Mock Provider Setup

```typescript
// lib/ai/mock-provider.ts
import { CoreMessage } from 'ai';

// Mock response generator
function generateMockResponse(messages: CoreMessage[]): string {
  const lastMessage = messages[messages.length - 1]?.content || '';

  // Simple mock responses
  if (lastMessage.toLowerCase().includes('hello')) {
    return 'Hello! How can I help you today?';
  }
  if (lastMessage.toLowerCase().includes('help')) {
    return 'I am here to help! What would you like to know?';
  }

  return `Mock response to: "${lastMessage.slice(0, 50)}..."`;
}

// Mock streaming (simulate token-by-token)
export function createMockStream(response: string): ReadableStream {
  const encoder = new TextEncoder();
  const words = response.split(' ');

  return new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'text', value: word + ' ' })}\n\n`)
        );
        await new Promise((r) => setTimeout(r, 10)); // Simulate delay
      }
      controller.close();
    },
  });
}
```

### Mock in API Route (Testing Mode)

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { generateMockResponse } from '@/lib/ai/mock-provider';

const USE_MOCK = process.env.USE_MOCK_LLM === 'true';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json();

  // Use mock in test environment
  if (USE_MOCK) {
    const mockText = generateMockResponse(messages);
    const stream = createMockStream(mockText);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Real LLM for production
  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    maxTokens: 2048,
  });

  return result.toDataStreamResponse();
}
```

### Mock via Vercel AI SDK

```typescript
// lib/ai/mock.ts
import { mockStreamCore } from 'ai';

// For unit tests
export const mockModel = mockStreamCore({
  generate: async ({ prompt }) => {
    return `Mock response to: ${prompt}`;
  },
});

// For integration tests
export const mockStreamModel = mockStreamCore({
  stream: async ({ prompt }) => {
    const words = `Mock streaming response to: ${prompt}`.split(' ');
    return words;
  },
});
```

---

## 10.3 Component Testing

### Testing Auto-Scroll Logic

```typescript
// __tests__/components/ChatMessageList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatMessageList } from '@/components/chat/ChatMessageList';

describe('ChatMessageList', () => {
  it('pins to bottom when isStreaming is true', () => {
    render(
      <ChatMessageList
        messages={[{ id: '1', role: 'user', content: 'Hello' }]}
        isStreaming={true}
      />
    );

    // Scroll container should have auto-scroll behavior
    const container = screen.getByRole('list');
    expect(container).toHaveAttribute('data-pinned', 'true');
  });

  it('releases pin when user scrolls up', async () => {
    render(
      <ChatMessageList
        messages={[{ id: '1', role: 'user', content: 'Hello' }]}
        isStreaming={false}
      />
    );

    const container = screen.getByRole('list');

    // Simulate scroll up (more than 50px from bottom)
    fireEvent.scroll(container, {
      target: {
        scrollTop: 100,
        scrollHeight: 500,
        clientHeight: 400,
      },
    });

    // Pin should be released
    await waitFor(() => {
      expect(container).toHaveAttribute('data-pinned', 'false');
    });
  });

  it('shows JumpToLatest button when unpinned and has new messages', () => {
    render(
      <ChatMessageList
        messages={[{ id: '1', role: 'user', content: 'Hello' }]}
        isStreaming={false}
        hasNewMessages={true}
      />
    );

    const button = screen.getByRole('button', { name: /jump to latest/i });
    expect(button).toBeVisible();
  });
});
```

### Testing Input Validation

```typescript
// __tests__/components/ChatInput.test.tsx
describe('ChatInput', () => {
  it('disables submit button when input is empty', () => {
    render(
      <ChatInput
        value=""
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );

    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeDisabled();
  });

  it('disables submit button when input is whitespace only', () => {
    render(
      <ChatInput
        value="   "
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );

    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeDisabled();
  });

  it('enables submit button when input has content', () => {
    render(
      <ChatInput
        value="Hello world"
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );

    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeEnabled();
  });

  it('calls onSubmit when Enter is pressed with content', () => {
    const handleSubmit = jest.fn();
    render(
      <ChatInput
        value="Hello"
        onSubmit={handleSubmit}
        isLoading={false}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleSubmit).toHaveBeenCalled();
  });

  it('adds new line when Shift+Enter is pressed', () => {
    const handleSubmit = jest.fn();
    render(
      <ChatInput
        value="Hello"
        onSubmit={handleSubmit}
        isLoading={false}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(handleSubmit).not.toHaveBeenCalled();
    // Newline should be in the value
    expect(input).toHaveValue('Hello\n');
  });
});
```

### Testing Stop Button Behavior

```typescript
// __tests__/components/StopButton.test.tsx
describe('StopButton', () => {
  it('renders when isLoading is true', () => {
    render(<StopButton isLoading={true} onStop={jest.fn()} />);
    expect(screen.getByRole('button', { name: /stop/i })).toBeVisible();
  });

  it('does not render when isLoading is false', () => {
    render(<StopButton isLoading={false} onStop={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /stop/i })).toBeNull();
  });

  it('calls onStop when clicked', () => {
    const handleStop = jest.fn();
    render(<StopButton isLoading={true} onStop={handleStop} />);

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(handleStop).toHaveBeenCalled();
  });
});
```

---

## 10.4 Integration Testing

### Testing API Route

```typescript
// __tests__/api/chat.test.ts
import { POST } from '@/app/api/chat/route';
import { createMocks } from 'node-mocks-http';

describe('POST /api/chat', () => {
  it('returns 401 without session', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'Hello' }] },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty message', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: { messages: [{ role: 'user', content: '   ' }] },
      headers: { cookie: 'session=valid-session' },
    });

    // Mock session
    jest.spyOn(auth, 'session').mockResolvedValue({
      user: { id: 'user-123' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('streams response with valid session', async () => {
    // Mock session
    jest.spyOn(auth, 'session').mockResolvedValue({
      user: { id: 'user-123' },
    });

    // Mock rate limit
    jest.spyOn(rateLimit, 'default').mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    });

    const { req } = createMocks({
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'Hello' }],
        chatId: 'chat-123',
      },
      headers: { cookie: 'session=valid-session' },
    });

    // Enable mock mode
    process.env.USE_MOCK_LLM = 'true';

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
```

---

## 10.5 Definition of Done (from spec.yaml)

```yaml
testing:
  definition_of_done:
    - 'The Stop button must immediately halt the generation stream
       and persist the partial text to the database.'
    - 'Attempting to access /chat/:id belonging to another user
       must return a 404 or 403 HTTP status.'
    - 'Rapid repetitive form submissions must be blocked by the
       rate limiter (returning HTTP 429).'
```

### Automated DoD Tests

```typescript
// __tests__/definition-of-done.test.ts
describe('Definition of Done', () => {
  it('Stop button halts stream and persists partial text', async () => {
    // Setup: Start a long streaming response
    const { stream, stop } = startMockStream();

    // Act: User clicks stop after 500ms
    await delay(500);
    stop();

    // Assert: Partial text saved
    const saved = await db.message.findFirst({
      where: { chatId, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
    });

    expect(saved.content).toHaveLengthGreaterThan(0);
    expect(saved.content).toBeLessThan(fullResponse.length);
  });

  it('Accessing other user chat returns 404', async () => {
    // Setup: User A creates chat
    const userAChat = await createChat(userA.id);

    // Act: User B tries to access
    const res = await GET(`/chat/${userAChat.id}`, {
      session: { user: { id: userB.id } },
    });

    // Assert: 404 (not 403 - leak-proof)
    expect(res.status).toBe(404);
  });

  it('Rate limiter blocks rapid submissions', async () => {
    // Setup: Make 10 requests (at limit)
    for (let i = 0; i < 10; i++) {
      await POST('/api/chat', { session: userSession });
    }

    // Act: 11th request
    const res = await POST('/api/chat', { session: userSession });

    // Assert: 429
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
  });
});
```

---

## 10.6 Testing Tools

| Tool | Purpose | Type |
|------|---------|------|
| Vitest | Unit & component testing | Core |
| Testing Library | React component testing | Core |
| node-mocks-http | API route testing | Core |
| Mock Service Worker | HTTP mocking | Optional |
| Playwright | E2E testing | Optional |
| Vite | Test runner (with Vitest) | Core |

---

## 10.7 CI/CD Configuration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          USE_MOCK_LLM: 'true'  # Use mock in CI
          DATABASE_URL: 'file:./test.db'
          NEXTAUTH_SECRET: 'test-secret'

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

---

## Acceptance Criteria

- [ ] LLM provider mocked for all tests (no API costs in CI)
- [ ] Auto-scroll component has unit tests
- [ ] Input validation has unit tests
- [ ] Stop button behavior has unit tests
- [ ] API route has integration tests
- [ ] IDOR prevention has integration tests
- [ ] Rate limiting has integration tests
- [ ] Definition of Done items are automated
- [ ] Tests run in CI/CD pipeline
- [ ] Mock mode configurable via environment variable
- [ ] Test coverage > 80% for core modules
