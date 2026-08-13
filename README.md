# Nexus AI

A production-grade, streaming AI chat interface built with Next.js 16, featuring real-time token streaming, chat history persistence, multi-provider AI support, and Firebase + NextAuth authentication.

[**Live Demo**]([https://nexus-ai-chatbot-opal.vercel.app/](https://nexus-ai-chat-five.vercel.app/chat)) &nbsp;·&nbsp; [**GitHub**](https://github.com/AhmadBayu1412/nexus-ai)

![Nexus AI — Chat Streaming](docs/screenshots/chat-streaming.png)
![Nexus AI — Chat List](docs/screenshots/chat-list.png)
![Nexus AI — Lead Scoring](docs/screenshots/lead-scoring.png)

## Features

### Core Experience
- **Token-by-Token Streaming** — Real-time responses streamed directly from the LLM as tokens arrive
- **Multi-Turn Conversation State** — Full conversation history preserved across turns
- **Server-Side API Key** — API keys secured on the server, never exposed to the client

### UI & UX
- **Smart Auto-scroll** — Pins to bottom during streaming, releases automatically when you scroll up
- **Stop Button** — Cancel an in-flight streaming response mid-generation
- **Thinking Indicator Handoff** — Smooth transition from "AI is thinking" to final response
- **Chat Bubbles** — Clean, visually distinct user and assistant message bubbles
- **Empty State / Starter Suggestions** — Helpful prompts for new users before any conversation starts
- **Mobile-Friendly Layout** — Fully responsive, adapts cleanly from desktop to mobile

### Platform
- **Markdown Rendering** — Beautiful code blocks with syntax highlighting, lists, tables, and formatting
- **Multi-Provider AI** — OpenAI GPT-4, Anthropic Claude (configurable per request)
- **Chat History** — Persistent conversations with automatic title generation
- **Message Feedback** — Thumbs up/down on AI responses
- **Lead Scoring** — AI-powered company research and lead scoring via Google Search (Tavily API)
- **Security** — IDOR protection, rate limiting, NextAuth session + Firebase auth
- **Responsive Design** — Works on desktop and mobile

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| AI SDK | Vercel AI SDK (`ai` package) |
| LLM Provider | KoboLLM API (OpenAI-compatible) |
| Authentication | NextAuth v5 + Firebase Admin |
| Database | Prisma ORM + PostgreSQL (Neon, free tier) |
| Rate Limiting | Upstash Redis |
| External Search | Tavily API (Google Search for lead research) |
| Styling | Tailwind CSS v4 |
| UI Components | CVA, Lucide React, Framer Motion |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- KoboLLM API key (or OpenAI-compatible key)
- Tavily API key (for lead scoring feature)
- Upstash Redis account (optional for development)

### Environment Setup

```bash
cp .env.example .env.local
```

Fill in the required values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string, e.g. `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_URL` | Your app URL, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `OPENAI_API_KEY` | Your KoboLLM or OpenAI API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App credentials |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth App credentials |
| `TAVILY_API_KEY` | (Optional) Tavily API key for lead scoring — get free at https://app.tavily.com |

### Installation

```bash
npm install
```

### Database Setup

> **Note:** The local dev database uses SQLite (`prisma/dev.db`). For production (Vercel), use Neon PostgreSQL.

```bash
# Push schema to local SQLite database (dev)
npm run db:push

# Generate Prisma client
npm run db:generate

# (Optional) Open Prisma Studio
npm run db:studio
```

For **production (Vercel)**, set `DATABASE_URL` as an environment variable in the Vercel dashboard to your Neon PostgreSQL connection string.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting.

### Build

```bash
npm run build
npm start
```

## Available Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint          # Run ESLint
npm run db:generate   # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema (PostgreSQL)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/         # Chat streaming endpoint
│   │   │   ├── chats/        # Chat CRUD endpoints
│   │   │   └── messages/
│   │   │       └── feedback/  # Message feedback endpoint
│   │   ├── chat/
│   │   │   ├── [id]/         # Individual chat page
│   │   │   ├── new/          # New chat redirect page
│   │   │   └── page.tsx      # Chat list page
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatUI.tsx           # Main chat interface
│   │   │   ├── ChatInput.tsx         # Message input
│   │   │   ├── ChatMessage.tsx       # Message bubble + tool state machine
│   │   │   ├── ChatSidebar.tsx      # Chat list sidebar
│   │   │   ├── JumpToLatest.tsx      # Jump to bottom button
│   │   │   ├── LeadScoreCard.tsx     # Lead scoring result card
│   │   │   ├── ThinkingIndicator.tsx  # AI reasoning display
│   │   │   ├── ToolError.tsx         # Tool error display
│   │   │   └── ToolLoading.tsx        # Tool loading state
│   │   ├── providers/
│   │   │   └── AuthProvider.tsx
│   │   └── ui/
│   │       └── Toast.tsx
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── config.ts          # AI model configuration + system prompts
│   │   │   └── title-generator.ts # Auto title generation
│   │   ├── auth/
│   │   │   ├── firebase.ts       # Firebase client SDK
│   │   │   └── firebaseAdmin.ts  # Firebase Admin SDK
│   │   ├── db/
│   │   │   ├── index.ts          # Prisma client singleton
│   │   │   └── queries.ts        # Database query helpers
│   │   ├── logger.ts
│   │   ├── rate-limit.ts
│   │   └── utils.ts
│   ├── middleware.ts              # Next.js middleware (auth)
│   └── types/
│       └── chat.ts
├── docs/
│   └── screenshots/              # App screenshots
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
└── tailwind.config.ts
```

## Database Schema

Core models in `prisma/schema.prisma`:

- **User** — Authenticated users (NextAuth + Firebase)
- **Chat** — Conversation threads, indexed by `userId + createdAt`
- **Message** — Individual messages with role, content, reasoning, feedback

## Documentation

Detailed documentation is available in the `docs/` directory:

- [Requirements](docs/Requirement.md) — Functional and non-functional requirements
- [Architecture Audit](docs/Architecture-Audit.md) — System architecture overview
- [Layer 1: Visual UI](docs/layers/layer-01-visual-ui.md)
- [Layer 2: UX Audit](docs/layers/layer-02-ux-audit.md)
- [Layer 4: State Management](docs/layers/layer-04-state-management.md)
- [Layer 6: Database Architecture](docs/layers/layer-06-database-architecture.md)
- [Layer 10: Testing Strategy](docs/layers/layer-10-testing-strategy.md)
- [Layer 11: Observability](docs/layers/layer-11-observability.md)

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift + Enter` | New line in textarea |
| `Escape` | Stop generation |
| `Ctrl/Cmd + K` | Focus chat input |

## License

Private / All rights reserved

---

## Lead Scoring (FE-07) — Feature Deep Dive

A production-grade tool-chaining pipeline that researches a company via Google before scoring it as a sales lead. The AI calls `researchCompanyTool` (Tavily API), then uses the results to call `scoreLeadTool` with real data, and finally generates a natural language summary.

### How It Works

**Trigger:** Any message matching `/\b(score|scoring|lead)\b/i` is routed through a custom pipeline.

**Keywords that activate Lead Scoring:**

| Category | Example Prompts |
|---|---|
| Direct scoring | `"Score Gojek, industry: tech"`, `"Score Tokopedia"`, `"Evaluate this lead"` |
| Lead assessment | `"Assess this company as a lead"`, `"Lead scoring: Gojek"` |
| Company analysis | `"Analyze Gojek as a potential customer"`, `"Rate this company"` |
| Sales pipeline | `"Add Gojek to sales pipeline"`, `"Priority score for Gojek"` |

**Flow:**

```
User: "Score Gojek, industry: tech"
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Route detects scoring request (regex match)          │
│  → switches to streamText with tools: TOOLS         │
│     (AI SDK handles SSE formatting + tool results)    │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────▼──────────────────────────┐
          │  Step 1: researchCompanyTool             │
          │  → Tavily API: Google Search            │
          │  → Returns: employees, funding,          │
          │     snippet, sources, rawContent         │
          │  → Result streamed back to AI            │
          └────────────┬──────────────────────────┘
                       │
          ┌────────────▼──────────────────────────┐
          │  Step 2: scoreLeadTool                 │
          │  → Algorithm calculates 1-100 score     │
          │  → Based on: industry + employees +     │
          │     funding stage + content signals     │
          │  → Result: score, verdict, analysis    │
          └────────────┬──────────────────────────┘
                       │
          ┌────────────▼──────────────────────────┐
          │  AI generates natural language summary  │
          │  using the score data                 │
          └────────────┬──────────────────────────┘
                       │
              LeadScoreCard UI (real data)
```

### Scoring Algorithm

The `scoreLeadTool` calculates a 1-100 score using:

| Signal | Rule | Bonus |
|---|---|---|
| **Industry** | tech / finance / retail / other | +70 / +63 / +50 / +45 |
| **Employees** | 500+ or enterprise | +20 |
| **Employees** | 51-500 or midsize | +10 |
| **Funding** | Series D+ / IPO / Unicorn | +15 |
| **Funding** | Series A-C | +10 |
| **Funding** | Series / seed / angel | +5 |
| **Content** | revenue, profit, growth, market leader | +8 |
| **Content** | partner, enterprise, corporate | +5 |

**Verdict thresholds:**

| Score | Verdict | Color |
|---|---|---|
| 75-100 | Hot Lead | Red |
| 50-74 | Warm Lead | Amber |
| 1-49 | Cold Lead | Blue |

### 4-State UI Lifecycle

Each tool call renders a `ToolLoading` then the result:

| State | What shows |
|---|---|
| **1. Input Streaming** | `ToolLoading` with animated dots — model is generating tool arguments |
| **2. Input Available** | Tool name + args preview — arguments confirmed |
| **3. Executing** | Spinner with pulsing label — tool is running (Tavily / scoring) |
| **4. Result** | `LeadScoreCard` or `ToolError` replaces the spinner |

### Components

| File | Role |
|---|---|
| `src/app/api/chat/route.ts` | Tool definitions (`researchCompanyTool`, `scoreLeadTool`), executor functions, streaming logic |
| `src/components/chat/LeadScoreCard.tsx` | Animated score card with verdict badge, progress bar, collapsible research section |
| `src/components/chat/ToolLoading.tsx` | Dynamic loading state per tool (label changes between streaming vs. executing) |
| `src/components/chat/ToolError.tsx` | Graceful error display when a tool fails |
| `src/components/chat/ChatMessage.tsx` | 4-state machine: handles `partial-call` → `result` for all tool types |
| `src/lib/ai/config.ts` | `SCORE_LEAD_TOOL_INSTRUCTIONS` appended to system prompt — governs model behavior |

### Architecture: AI SDK `streamText` + `toDataStreamResponse()`

The scoring pipeline uses AI SDK's `streamText` with `tool()` definitions which handles:
1. Multi-step tool execution (research → score → summarize) via `maxSteps: 10`
2. Correct SSE frame formatting for `useChat` — including tool results via `toDataStreamResponse()`
3. `onStepFinish` callbacks for logging each step

**Important:** `toDataStream()` (not used) only streams text — **no tool results**. `toDataStreamResponse()` is required for tool-assisted responses because it includes tool call and result frames in the SSE stream.

### Error Handling Rules

Tool executors **never `throw`** — they return `{ error: '...' }`. Throwing causes the AI SDK to emit an SSE `error` frame, which triggers `useChat`'s `onError` callback and aborts the stream.

### Environment Variables

```bash
TAVILY_API_KEY=tvly-dev-...   # Get free from https://app.tavily.com
```

Without a valid key, `researchCompanyTool` returns a graceful error message — no crash.

### Testing

```bash
# Start dev server
npm run dev

# In the chat, send any of these prompts:
"Score Gojek, industry: tech"
"Lead scoring: Gojek"
"Evaluate Tokopedia as a lead"

# Expected (in order):
# 1. ToolLoading: "Researching company..." (researchCompanyTool streaming)
# 2. ToolLoading: "Executing research..." (researchCompanyTool executing)
# 3. ToolLoading: "Scoring lead..." (scoreLeadTool executing)
# 4. LeadScoreCard with:
#    - Score number (1-100) with animated counter
#    - Verdict badge: Hot Lead / Warm Lead / Cold Lead
#    - Progress bar colored by score
#    - Collapsible "Research dari Google" section
#    - Analysis bullets
#    - AI-generated natural language summary
```
