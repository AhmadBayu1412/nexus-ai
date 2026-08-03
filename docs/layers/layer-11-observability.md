---
layer: 11
name: Observability
tier: 1
purpose: Mendefinisikan logging, monitoring, error tracking, dan metric collection.
cross_layers: [3, 5, 10]
spec_ref: requirements.md#11-observability-requirements, spec.yaml#acceptance_criteria
---

# Layer 11: Observability

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan logging, monitoring, error tracking, dan metric collection untuk production debugging.

---

## 11.1 Observability Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OBSERVABILITY PILLARS                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     LOGS         │    │     METRICS      │    │     TRACES       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ - Error events   │    │ - Token usage   │    │ - Request ID    │
│ - LLM timeouts   │    │ - Latency (TTFB)│    │ - Span timing   │
│ - Rate limit hit │    │ - Error rate    │    │ - DB queries    │
│ - Auth failures  │    │ - Users online  │    │ - LLM calls     │
└─────────────────┘    └─────────────────┘    └─────────────────┘

                        ▲
                        │  All pillar data feeds into
                        │  centralized observability platform
                        ▼

              ┌─────────────────────────┐
              │   OBSERVABILITY TOOL    │
              │   (e.g., Vercel,       │
              │    Axiom, LogSnag)     │
              └─────────────────────────┘
```

---

## 11.2 Structured Logging

### Why Structured Logging?

```
❌ BAD: console.log("Error occurred")
   - Hard to search/filter
   - No context
   - Can't aggregate

✅ GOOD: console.error(JSON.stringify({
     level: 'error',
     message: 'LLM request failed',
     timestamp: '2024-01-15T10:30:00Z',
     chatId: 'chat-123',
     userId: 'user-456',
     error: 'timeout',
     duration: 30000,
   }))
   - Easy to search/filter
   - Has context
   - Can aggregate in log platform
```

### Logging Utility

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private service = 'my-ai-chatbot';

  private format(level: LogLevel, message: string, context?: LogContext) {
    return JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...context,
    });
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.format('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.format('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.format('warn', message, context));
  }

  error(message: string, context?: LogContext) {
    console.error(this.format('error', message, context));
  }
}

export const logger = new Logger();
```

---

## 11.3 LLM Error Tracking

### Timeout Detection

```typescript
// app/api/chat/route.ts
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      maxTokens: 2048,

      onError: ({ error }) => {
        const duration = Date.now() - startTime;

        // Log LLM provider error with context
        if (error.message.includes('timeout') || error.status === 504) {
          logger.error('LLM_PROVIDER_TIMEOUT', {
            type: 'llm_error',
            errorType: 'timeout',
            duration,
            userId: session?.user?.id,
            chatId,
            statusCode: 504,
          });
        }

        if (error.status === 401 || error.message.includes('api key')) {
          logger.error('LLM_API_KEY_ERROR', {
            type: 'llm_error',
            errorType: 'auth_failure',
            userId: session?.user?.id,
            statusCode: 401,
          });
        }

        if (error.status === 429) {
          logger.warn('LLM_RATE_LIMIT', {
            type: 'llm_error',
            errorType: 'provider_rate_limit',
            userId: session?.user?.id,
            statusCode: 429,
          });
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('CHAT_STREAM_ERROR', {
      type: 'unhandled_error',
      error: error instanceof Error ? error.message : String(error),
      duration,
      userId: session?.user?.id,
      chatId,
    });

    throw error;
  }
}
```

### Error Categories

| Error Type | HTTP Status | Log Level | Action |
|------------|-------------|-----------|--------|
| LLM Timeout | 504 | ERROR | Alert + retry suggestion |
| API Key Invalid | 401 | ERROR | Alert immediately |
| API Key Exhausted | 403 | ERROR | Alert immediately |
| Provider Rate Limit | 429 | WARN | Log + user wait |
| Network Error | 500 | ERROR | Retry with backoff |
| Parse Error | 400 | WARN | Log + reject |
| Unknown | 500 | ERROR | Alert + log stack |

---

## 11.4 Token Usage Metrics

### Tracking (from requirements.md)

```yaml
observability:
  - 'Track usage metadata from the onFinish event to observe token
      consumption per chat session.'
```

### Implementation

```typescript
// app/api/chat/route.ts
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface UsageRecord {
  timestamp: string;
  chatId: string;
  userId: string;
  model: string;
  usage: TokenUsage;
  finishReason: string;
  duration: number;
}

export async function POST(req: Request) {
  const startTime = Date.now();

  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    maxTokens: 2048,

    onFinish: ({ text, usage, finishReason }) => {
      const duration = Date.now() - startTime;

      // Record token usage
      const usageRecord: UsageRecord = {
        timestamp: new Date().toISOString(),
        chatId,
        userId: session?.user?.id,
        model: 'gpt-4o',
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
        finishReason,
        duration,
      };

      // Log for observability
      logger.info('TOKEN_USAGE', usageRecord);

      // Optional: Store in database for analysis
      db.tokenUsage.create({ data: usageRecord }).catch(console.error);
    },
  });

  return result.toDataStreamResponse();
}
```

### Token Usage Dashboard Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TOKEN USAGE METRICS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Total Tokens (Today)          Average Tokens/Request      Cost Estimate
┌──────────────┐              ┌──────────────────────┐    ┌──────────────┐
│   125,430    │              │   340 tokens           │    │   $0.63      │
│   ▲ 12%      │              │   ▲ 5%                │    │   ▲ 15%      │
└──────────────┘              └──────────────────────┘    └──────────────┘

Token Breakdown by Model
┌─────────────────────────────────────────────────────────────────────────────┐
│ gpt-4o        ████████████████████████████████████░░░░░░░░░░  82%           │
│ gpt-4o-mini   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  15%           │
│ claude-3-5    ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   3%           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11.5 Latency Metrics (TTFB)

### Time to First Token Tracking

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const requestStartTime = Date.now();

  let firstTokenTime: number | null = null;

  const result = await streamText({
    model: openai('gpt-4o'),
    messages,

    onStart: () => {
      firstTokenTime = Date.now();
      const ttfb = firstTokenTime - requestStartTime;

      logger.info('TTFB', {
        type: 'latency',
        metric: 'ttfb',
        value: ttfb,
        chatId,
        userId: session?.user?.id,
      });
    },

    onFinish: ({ text, usage, finishReason }) => {
      const totalDuration = Date.now() - requestStartTime;

      logger.info('STREAM_COMPLETE', {
        type: 'latency',
        metric: 'total_duration',
        value: totalDuration,
        ttfb: firstTokenTime ? firstTokenTime - requestStartTime : null,
        tokensPerSecond: usage.totalTokens / (totalDuration / 1000),
        chatId,
        userId: session?.user?.id,
      });
    },
  });

  return result.toDataStreamResponse();
}
```

### TTFB Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| TTFB (First Token) | < 500ms | > 1000ms | > 2000ms |
| Total Stream Duration | < 10s | > 30s | > 60s |
| Tokens/Second | > 50 t/s | < 20 t/s | < 10 t/s |

---

## 11.6 Error Rate Monitoring

```typescript
// lib/metrics.ts
interface ErrorMetrics {
  totalRequests: number;
  errorCount: number;
  errorByType: {
    timeout: number;
    auth: number;
    rate_limit: number;
    llm_provider: number;
    unknown: number;
  };
}

const metrics: ErrorMetrics = {
  totalRequests: 0,
  errorCount: 0,
  errorByType: {
    timeout: 0,
    auth: 0,
    rate_limit: 0,
    llm_provider: 0,
    unknown: 0,
  },
};

export function recordRequest(isError: boolean, errorType?: string) {
  metrics.totalRequests++;
  if (isError && errorType) {
    metrics.errorCount++;
    metrics.errorByType[errorType as keyof typeof metrics.errorByType]++;
  }
}

export function getErrorRate(): number {
  if (metrics.totalRequests === 0) return 0;
  return metrics.errorCount / metrics.totalRequests;
}

// Endpoint to expose metrics (for Prometheus, etc.)
export async function GET(req: Request) {
  return Response.json({
    totalRequests: metrics.totalRequests,
    errorCount: metrics.errorCount,
    errorRate: getErrorRate(),
    errorByType: metrics.errorByType,
    uptime: process.uptime(),
  });
}
```

### Error Rate Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ERROR RATE METRICS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Error Rate (24h)              Errors by Type                    Alerts
┌──────────────┐              ┌──────────────────────┐    ┌──────────────────┐
│   0.42%      │    timeout   ████████████░░░░░░░░  45%  │ ⚠️ TTFB > 1s     │
│   ▼ 0.15%    │    auth      ██████░░░░░░░░░░░░░░░  20%  │   user: 12       │
│              │    rate_lim  ████████░░░░░░░░░░░░░  25%  │                  │
│  Target: <1% │    llm_prov  ████░░░░░░░░░░░░░░░░░  10%  │ 🔴 Error > 1%    │
│              │    unknown   ░░░░░░░░░░░░░░░░░░░░   0%  │   user: 3        │
└──────────────┘              └──────────────────────┘    └──────────────────┘
```

---

## 11.7 Chat Session Tracking

### Request ID Correlation

```typescript
// app/api/chat/route.ts
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || randomUUID();
  const startTime = Date.now();

  // Add to response headers for client correlation
  const responseHeaders = new Headers({
    'X-Request-ID': requestId,
  });

  try {
    const result = await streamText({
      model: openai('gpt-4o'),
      messages,

      onFinish: ({ text, usage }) => {
        logger.info('CHAT_COMPLETE', {
          requestId,
          chatId,
          userId: session?.user?.id,
          messageCount: messages.length,
          totalTokens: usage.totalTokens,
          duration: Date.now() - startTime,
        });
      },
    });

    // Attach request ID to stream
    return new Response(result.toDataStream(), {
      headers: {
        ...Object.fromEntries(responseHeaders),
        'Content-Type': 'text/event-stream',
      },
    });
  } catch (error) {
    logger.error('CHAT_ERROR', {
      requestId,
      chatId,
      userId: session?.user?.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    });

    throw error;
  }
}
```

---

## 11.8 Logging Checklist

| Event | Log Level | Fields |
|-------|-----------|--------|
| Chat started | INFO | requestId, chatId, userId, model |
| Chat completed | INFO | requestId, chatId, userId, tokens, duration, ttfb |
| LLM timeout | ERROR | requestId, chatId, userId, duration, statusCode |
| LLM error | ERROR | requestId, chatId, userId, errorType, error |
| Rate limit hit | WARN | requestId, userId, ip |
| Auth failure | WARN | requestId, ip, reason |
| IDOR attempt | WARN | requestId, ip, requestedChatId |
| Token usage | INFO | requestId, chatId, userId, tokens, cost |

---

## 11.9 Vercel-Specific Observability

### Vercel Analytics

```typescript
// For Vercel deployment, use built-in analytics
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Vercel Speed Insights

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Acceptance Criteria

- [ ] All LLM errors logged with context (chatId, userId, error type)
- [ ] Token usage logged on every onFinish callback
- [ ] TTFB tracked and logged
- [ ] Error rate metrics available
- [ ] Request ID attached to all log entries
- [ ] Rate limit events logged
- [ ] Auth failures logged
- [ ] IDOR attempts logged (as warnings)
- [ ] Logs are structured JSON format
- [ ] Vercel Analytics integrated
- [ ] Vercel Speed Insights integrated
- [ ] Metrics endpoint available (/api/metrics)
- [ ] Error alerts configured for critical errors
