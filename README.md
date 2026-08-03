# Nexus AI Chatbot

A production-grade, streaming AI chat interface built with Next.js 16, featuring real-time token streaming, chat history persistence, multi-provider AI support, and Firebase + NextAuth authentication.

## Features

- **Real-Time Streaming** — Token-by-token responses streamed directly from the LLM
- **Chat History** — Persistent conversations with automatic title generation
- **Smart Auto-scroll** — Pins to bottom during streaming, releases when you scroll up
- **Markdown Rendering** — Beautiful code blocks, lists, tables, and formatting
- **Thinking Indicator** — Shows AI reasoning/thinking process before response
- **Multi-Provider AI** — OpenAI GPT-4, Anthropic Claude (configurable per request)
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
| Database | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
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
| `DATABASE_URL` | SQLite path, e.g. `file:./dev.db` |
| `NEXTAUTH_URL` | Your app URL, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | (Optional) Your Anthropic API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REIS_REST_TOKEN` | Upstash Redis REST Token |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App credentials |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth App credentials |

### Installation

```bash
npm install
```

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

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
│   └── schema.prisma          # Database schema (SQLite dev / PostgreSQL prod)
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
│   └── layers/                    # Architecture documentation
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
