# Nexus AI

A production-grade, streaming AI chat interface built with Next.js 16, featuring real-time token streaming, chat history persistence, multi-provider AI support, and Firebase + NextAuth authentication.

[**Live Demo**](https://nexus-ai-chatbot-opal.vercel.app/) &nbsp;·&nbsp; [**GitHub**](https://github.com/AhmadBayu1412/nexus-ai)

![Nexus AI — Chat Streaming](docs/screenshots/chat-streaming.png)
![Nexus AI — Chat List](docs/screenshots/chat-list.png)

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
- **Security** — IDOR protection, rate limiting, NextAuth session + Firebase auth
- **Responsive Design** — Works on desktop and mobile

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| AI SDK | Vercel AI SDK (`ai` package) |
| LLM Provider | OpenAI / Anthropic (configurable) |
| Authentication | NextAuth v5 + Firebase Admin |
| Database | Prisma ORM + PostgreSQL (Neon, free tier) |
| Rate Limiting | Upstash Redis |
| Styling | Tailwind CSS v4 |
| UI Components | CVA, Lucide React, Framer Motion |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- OpenAI and/or Anthropic API key
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
| `OPENAI_API_KEY` | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | (Optional) Your Anthropic API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App credentials |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth App credentials |

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
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
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
│   │   │   └── page.tsx      # Chat list page
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatUI.tsx           # Main chat interface
│   │   │   ├── ChatInput.tsx         # Message input
│   │   │   ├── ChatMessage.tsx       # Message bubble
│   │   │   ├── ChatSidebar.tsx      # Chat list sidebar
│   │   │   ├── JumpToLatest.tsx      # Jump to bottom button
│   │   │   └── ThinkingIndicator.tsx # AI reasoning display
│   │   ├── providers/
│   │   │   └── AuthProvider.tsx
│   │   └── ui/
│   │       └── Toast.tsx
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── config.ts          # AI model configuration
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
