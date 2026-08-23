# Nexus AI — Intelligent Streaming Chatbot & Agentic Platform

A production-grade, state-of-the-art AI chat interface and agentic research platform built with **Next.js 16 (App Router)**, **React 19**, **Vercel AI SDK**, **Prisma ORM**, and **Tailwind CSS v4**. Features token-by-token streaming, multi-step tool execution, virtual chat lifecycle management, robust IDOR protection, automated CI/CD testing safety net, and a certified **100/100 Accessibility** audit score.

[**Live Demo**](https://nexus-ai-chat-five.vercel.app/chat) &nbsp;·&nbsp; [**GitHub Repository**](https://github.com/AhmadBayu1412/nexus-ai) &nbsp;·&nbsp; [**Documentation Index**](#-documentation-index)

---

## 📸 Visual Showcase

| Chat Streaming & Reasoning | Chat History & Virtual State |
| :---: | :---: |
| ![Nexus AI — Chat Streaming](docs/screenshots/chat-streaming.png) | ![Nexus AI — Chat List](docs/screenshots/chat-list.png) |

| Lead Scoring & Agentic Web Search | Accessibility & Performance Audit |
| :---: | :---: |
| ![Nexus AI — Lead Scoring](docs/screenshots/lead-scoring.png) | ![Lighthouse Audit Score](docs/screenshots/after-audit.png) |

---

## ⚡ Key Highlights & Metrics

- 🎯 **Lighthouse Mobile Score**: **100/100** Accessibility, **100/100** SEO, **100/100** Agentic Browsing, **89/100** Mobile Performance (Simulated 4G).
- ♿ **WAVE Evaluation (WebAIM)**: **0 Errors**, **0 Contrast Errors**, **0 Alerts**, **10/10 AIM Score** (WCAG AA Compliant).
- 🧪 **Automated Testing Safety Net**: 100% pass rate on Vitest + React Testing Library (accessible query selectors) and isolated Playwright E2E with network mocking.
- 🤖 **Multi-Step Agentic Tool Calling**: Autonomous company research via Tavily Search API with dynamic lead scoring and 4-state UI lifecycle transitions.
- 🚀 **Zero Empty-Chat Clutter**: Lazy chat creation pattern initializes conversations virtually (`/chat/new`) and persists them only upon the first message dispatch without stream interruption.

---

## 📑 Table of Contents

1. [System Architecture & 11-Layer Engineering](#-system-architecture--11-layer-engineering)
2. [Core Features & Capabilities](#-core-features--capabilities)
3. [Agentic Lead Scoring Pipeline (FE-07)](#-agentic-lead-scoring-pipeline-fe-07)
4. [Resilience, Security & Error Matrix (FE-08)](#-resilience-security--error-matrix-fe-08)
5. [Automated Testing & Quality Assurance (FE-09)](#-automated-testing--quality-assurance-fe-09)
6. [Production Hygiene & API Quota Protection](#-production-hygiene--api-quota-protection)
7. [Accessibility & Performance Audit (FE-10)](#-accessibility--performance-audit-fe-10)
8. [SmartButton Motion & State Rationale](#-smartbutton-motion--state-rationale)
9. [Database Schema & Data Model](#-database-schema--data-model)
10. [Tech Stack](#-tech-stack)
11. [Getting Started & Installation](#-getting-started--installation)
12. [Available Scripts](#-available-scripts)
13. [Project Directory Structure](#-project-directory-structure)
14. [Keyboard Shortcuts](#-keyboard-shortcuts)
15. [Documentation Index](#-documentation-index)

---

## 🏛 System Architecture & 11-Layer Engineering

The project is architected following an 11-layer modular engineering specification detailed in the `docs/layers/` directory:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  [Layer 01: Visual UI]  ─  [Layer 02: UX Audit]  ─  [Layer 04: State]  │
│  Glassmorphism Tokens       Smart Auto-Scroll        useChat + Refs    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Client-Server Boundary (SSE Stream)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        BUSINESS & ORCHESTRATION                        │
│  [Layer 03: Business Flow]         ─      [Layer 05: API Contract]     │
│  Virtual/Lazy Chat Lifecycle              SSE DataStream Protocol      │
│  [Layer 07: Business Rules]        ─      [Layer 08: Architecture]     │
│  Spam Cooldown & Bounds                   Next.js App Router Core      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Server-Side Security & Data Layer
┌───────────────────────────────────▼────────────────────────────────────┐
│                       SECURITY, DATA & OPERATIONS                      │
│  [Layer 06: Database]  ─  [Layer 09: Security]  ─  [Layer 10 & 11: QA] │
│  Prisma + PostgreSQL      NextAuth + IDOR Guard    Vitest, E2E & Logs  │
└────────────────────────────────────────────────────────────────────────┘
```

### 11-Layer Specification Breakdown

- **[Layer 01: Visual UI Design System](docs/layers/layer-01-visual-ui.md)** — Dark/light glassmorphic tokens, WCAG AA high-contrast palette (`--text-muted`, `--sidebar-text-secondary`), dynamic viewport height units (`100dvh`), and responsive drawer navigation.
- **[Layer 02: UX Audit & Micro-interactions](docs/layers/layer-02-ux-audit.md)** — Frictionless auto-scroll pinning with unpin detection, "Jump to Latest" indicator, thinking indicator handoff, and immediate generation abort (Escape / Stop button).
- **[Layer 03: Business Flow & Lifecycle](docs/layers/layer-03-business-flow.md)** — Virtual chat promotion flow (`/chat/new` $\to$ `/chat/[id]`), silent URL synchronization via `window.history.replaceState`, eliminating empty database records.
- **[Layer 04: State Management & React Lifecycle](docs/layers/layer-04-state-management.md)** — Vercel AI SDK `useChat` integration, `useChatIdRef` hook synchronization preventing component unmounting during promotion, and optimistic UI mutations.
- **[Layer 05: API Contracts & Communication](docs/layers/layer-05-api-contract.md)** — Server-Sent Events (SSE) data stream contract (`toDataStreamResponse`), tool call and result payloads, structured error boundaries, and chat management endpoints.
- **[Layer 06: Database Architecture & Prisma ORM](docs/layers/layer-06-database-architecture.md)** — PostgreSQL relational schema with compound indices (`userId + createdAt`), non-blocking asynchronous message persistence inside `onFinish` callbacks.
- **[Layer 07: Business Rules & Edge Cases](docs/layers/layer-07-business-rules.md)** — Context window bounds, 3-second button debounce spam protection, message size limits, and graceful degradation on API failures.
- **[Layer 08: System Architecture & Topology](docs/layers/layer-08-system-architecture.md)** — Serverless/Edge compute model on Vercel, server-only secret isolation, Turbopack bundling, and structured modular boundaries.
- **[Layer 09: Security & Access Control](docs/layers/layer-09-security-access-control.md)** — IDOR (Insecure Direct Object Reference) defense returning 404 for unauthorized attempts, NextAuth v5 session validation, Firebase Admin verification, and Upstash Redis rate limiting.
- **[Layer 10: Testing Strategy & QA](docs/layers/layer-10-testing-strategy.md)** — Vitest component testing with accessible ARIA queries, mock-intercepted Playwright E2E suite, and GitHub Actions CI gatekeeper.
- **[Layer 11: Observability & Telemetry](docs/layers/layer-11-observability.md)** — Structured backend logging, step-by-step tool tracing, and performance monitoring.

---

## ✨ Core Features & Capabilities

### 💬 Real-Time Streaming & Conversational Intelligence
- **Token-by-Token SSE Streaming**: Real-time response streaming powered by Vercel AI SDK and OpenAI-compatible KoboLLM.
- **Collapsible Reasoning Display**: Transparent AI thought-process rendering (`<ThinkingIndicator />` and `<SparklesIcon />` reasoning cards).
- **Safe Streaming Markdown**: Syntax-highlighted code blocks with copy-to-clipboard, formatted tables, lists, and sanitized markdown rendering.
- **Smart Auto-Scroll**: Sticky bottom tracking during token arrival with manual user unpin detection and a floating "Jump to Latest" button.
- **Persistent Feedback**: Thumbs up / Thumbs down message rating persisted to the database.
- **Regenerate & Instruction Modals**: Per-message action bar allowing quick retries or prompt steering.

### 🛡️ Resilience, Security & Virtual State
- **Virtual (Lazy) Chat Creation**: New chats start in memory (`/chat/new`) without creating database records until the first message is sent, preventing sidebar clutter.
- **Zero-Flicker Chat Promotion**: Active streams transition seamlessly into real chat URLs using `window.history.replaceState` and `useChatIdRef`.
- **IDOR Protection**: Strict ownership verification across all chat endpoints (`GET`, `POST`, `DELETE`); unauthorized requests receive masked `404 Not Found` responses.
- **Rate Limiting**: Distributed Upstash Redis sliding window algorithm protecting endpoints against brute-force spam and billing abuse.
- **Isolated API Credentials**: Server-side only key storage — no secrets are ever exposed in client JavaScript bundles.

---

## 🔍 Agentic Lead Scoring Pipeline (FE-07)

A multi-step autonomous tool pipeline that conducts live web research on companies and generates calculated lead evaluation scores.

```
User Prompt: "Score Gojek, industry: tech"
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Route Regex Matching (/\b(score|scoring|lead)\b/i)      │
│     Switches to streamText with tools: TOOLS (maxSteps: 10) │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────▼────────────────────────┐
               │  Step 1: researchCompanyTool           │
               │  → Tavily API (Google Search Engine)   │
               │  → Extracts: Employees, Funding, Info  │
               └───────────────┬────────────────────────┘
                               │
               ┌───────────────▼────────────────────────┐
               │  Step 2: scoreLeadTool                 │
               │  → Algorithm computes 1-100 score      │
               │  → Verdict: Hot / Warm / Cold Lead     │
               └───────────────┬────────────────────────┘
                               │
               ┌───────────────▼────────────────────────┐
               │  Step 3: AI Natural Language Summary   │
               │  → Summarizes metrics & key findings   │
               └───────────────┬────────────────────────┘
                               │
              LeadScoreCard Animated UI Component
```

### Lead Scoring Algorithm Matrix

| Factor | Criterion | Point Allocation |
|---|---|---|
| **Industry** | Tech / Finance / Retail / Other | `+70` / `+63` / `+50` / `+45` |
| **Headcount** | 500+ (Enterprise) / 51–500 (Midsize) | `+20` / `+10` |
| **Funding Stage** | Series D+ / IPO / Unicorn / Series A–C / Seed | `+15` / `+10` / `+5` |
| **Growth Signals** | Keywords: *revenue, profit, growth, leader* | `+8` |
| **Enterprise Fit** | Keywords: *partner, enterprise, corporate* | `+5` |

| Score Range | Verdict Category | Badge Color |
|---|---|---|
| **75 – 100** | 🔥 Hot Lead | Red / Rose |
| **50 – 74** | ⚡ Warm Lead | Amber / Yellow |
| **1 – 49** | ❄️ Cold Lead | Blue / Gray |

### 4-State Tool UI Lifecycle

1. **Input Streaming**: `ToolLoading` indicator with pulsing dots while the LLM generates JSON parameters.
2. **Input Available**: Parameter confirmation preview.
3. **Executing**: High-precision spinner indicating active network queries (Tavily Search / Score Calculation).
4. **Result / Error**: Animated `LeadScoreCard` with progress bar, expandable sources, and analysis bullets (or graceful `ToolError` on network failure).

---

## 🛡️ Resilience, Security & Error Matrix (FE-08)

Based on the [FE-08 Resilience Specification](docs/FE-08-RESILIENCE_AND_SECURITY_REQUIREMENTS.md), the application implements surgical error recovery rather than catastrophic page crashes.

| Scenario | Root Cause | System Response | UX Representation |
|---|---|---|---|
| **Network Flakiness (4G / Offline)** | Fetch abort / socket drop | Retains partial tokens received | Toast warning + inline "Try Again" retry button |
| **Agentic Timeout (> 15s)** | Deep web research latency | Custom fetch timeout set to 60s | Persistent spinner with step-status messages |
| **Rate Limit Exceeded** | Upstash Redis threshold | 429 Too Many Requests | Non-blocking Toast notification with reset timer |
| **Tool Execution Failure** | Invalid search / API limit | Executor returns `{ error }` (no throw) | `ToolError` card with isolated retry action |
| **Mobile Keyboard Opening** | iOS Safari viewport shift | `100dvh` CSS containment | Fixed input bar remains anchored without layout jump |

---

## 🧪 Automated Testing & Quality Assurance (FE-09)

Enforces strict [Architecture Decision Records](docs/TESTING_REQUIREMENTS.md) to guarantee stability during rapid iterations:

| Test Suite | Runner / Library | Coverage & Scenarios | Result |
|---|---|---|---|
| **Component & Unit** | Vitest + React Testing Library | `ThinkingIndicator`, `ChatMessage`, `ToolError`, `ChatInput`, `LeadScoreCard` | **100% Pass** (6/6) |
| **End-to-End (E2E)** | Playwright | Full primary chat lifecycle, virtual chat promotion, and tool execution with network route interception | **Configured & Isolated** |
| **Continuous Integration** | GitHub Actions (`test.yml`) | Automated validation running unit, component, and E2E suites on every pull request | **Active** |

### Ironclad Testing Rules:
- 🔒 **Zero Real API Calls**: All LLM streams and external APIs are mocked using deterministic fixtures.
---

## 🛡️ Production Hygiene & API Quota Protection

To prevent bot scrapers, resource flooding attacks, and AI billing spikes, the platform incorporates strict production hygiene guards across edge middleware, API endpoints, and client interfaces:

```
 Incoming Request
        │
        ├──► 1. Edge Middleware Guard
        │       • 512 KB Payload Limit (Rejects Oversized Floods: 413)
        │       • Production Security Headers (nosniff, DENY, Referrer-Policy)
        │
        ├──► 2. Pre-Auth IP Rate Limiter
        │       • Upstash Redis Sliding Window (30 req / 60s per IP)
        │       • Resilient In-Memory Fallback Map
        │
        ├──► 3. Auth Token Verification
        │       • Firebase Admin JWT Validation & IDOR Protection
        │
        ├──► 4. User-Level Rate Limiter
        │       • 10 requests / 10s per User (429 Rate Limit Exceeded)
        │
        ├──► 5. Input Caps & Context Bounds
        │       • Max 4,000 Chars per Message (Client & Server Validation)
        │       • Max 30 History Context Window (Prevents Token Draining)
        │
        └──► 6. Serverless Execution Guard
                • export const maxDuration = 60 (Clean Lifecycle Termination)
                • AbortSignal.timeout(15000) on External Tools (Tavily)
```

### Production Hygiene Guard Breakdown

| Layer | Guard Mechanism | Specification | Failure Response |
|---|---|---|---|
| **Edge / Middleware** | Payload Size Limit | Maximum `512 KB` request body size | `413 Payload Too Large` |
| **Pre-Auth IP** | IP Throttling | `30 requests / 60s` per IP address | `429 Rate Limit Exceeded` |
| **Authenticated User** | User Throttling | `10 requests / 10s` per verified user | `429 Rate Limit Exceeded` (`Retry-After`) |
| **Input Caps** | Message Length Cap | Maximum `4,000` characters per message | `400 Bad Request` (`MESSAGE_TOO_LONG`) |
| **Context Bounds** | History Token Flooding Guard | Bound conversation context to `30` most recent messages | Automatic tail slicing |
| **Serverless Compute** | `maxDuration` Config | `export const maxDuration = 60` for streaming, `30s` for CRUD | Graceful worker termination |
| **Tool Execution** | Network Timeout | `AbortSignal.timeout(15000)` on Tavily search | Fallback error card without crash |
| **Client UI** | Dynamic Counter & Lock | `maxLength={4000}`, live warning counter ($\ge 3000$ chars) | Submit button disabled |

---

## ♿ Accessibility & Performance Audit (FE-10)

Documented in detail in [AUDIT.md](AUDIT.md), the application underwent rigorous audit cycles using **Google Lighthouse Mobile**, **WAVE WebAIM**, and manual keyboard navigation testing:

```
╔═══════════════════════════════════════════════════════════════════════╗
║                      LIGHTHOUSE AUDIT (MOBILE)                        ║
║                                                                       ║
║  Accessibility: 100/100     SEO: 100/100     Agentic Web: 100/100     ║
║  Performance:   89/100      FCP: 1.2s        CLS: 0.000 (Zero Shift)  ║
║                                                                       ║
║                      WAVE WEBAIM EVALUATION                           ║
║                                                                       ║
║  Errors: 0    Contrast Errors: 0    Alerts: 0    AIM Score: 10.0/10   ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Remediation Highlights:
- **WCAG AA Contrast Compliance**: Updated `--text-muted` to `#5C5952` (contrast ratio **5.3:1**) and sidebar muted text to `rgba(255,255,255,0.70)` (contrast ratio **5.8:1+**).
- **Keyboard Navigation & Landmarks**: Integrated `<a href="#main-content" className="skip-to-content">`, distinct `aria-label` tags on all `<nav>` elements, and visible focus rings.
- **Assistive Technology for AI Streaming**: Configured `aria-live="polite"`, `aria-atomic="false"`, and `aria-busy={isStreaming}` on assistant message containers.

---

## 🎨 SmartButton Motion & State Rationale

The `SmartButton` component implements a robust 5-state lifecycle (`idle` $\to$ `hover` $\to$ `loading` $\to$ `success` / `error` $\to$ `idle`):

- **Mechanical Transitions**: Elements exit via `y: -10px, opacity: 0` and enter via `y: 10px, opacity: 0` using Framer Motion's `mode="popLayout"`.
- **Micro-Interaction Timings**: 150ms hover/tap for tactile response; 200ms state transitions; 400ms error shake (`[-6px, 6px, -4px, 4px, 0]`).
- **GPU Compositor Only**: All keyframe animations operate strictly on `transform` and `opacity` to preserve 60fps rendering.
- **Accessibility Safeguard**: Automatically zeroes out positional movement when `prefers-reduced-motion` is detected.

---

## 🗄 Database Schema & Data Model

Core relational models in [prisma/schema.prisma](prisma/schema.prisma):

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  chats         Chat[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Chat {
  id        String    @id @default(cuid())
  title     String    @default("Percakapan Baru")
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([userId, createdAt(sort: Desc)])
}

model Message {
  id        String   @id @default(cuid())
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  role      String   // "user" | "assistant" | "system"
  content   String
  reasoning String?  // AI thought-process / reasoning data
  feedback  String?  // "like" | "dislike"
  createdAt DateTime @default(now())

  @@index([chatId, createdAt(sort: Asc)])
}
```

---

## 🛠 Tech Stack

| Category | Technology | Description |
|---|---|---|
| **Core Framework** | [Next.js 16](https://nextjs.org/) (App Router) | Server Components, Turbopack, Streaming API Handlers |
| **UI Library** | [React 19](https://react.dev/) | React Server Components & latest hooks |
| **AI Orchestration** | [Vercel AI SDK](https://sdk.vercel.ai/) (`ai`) | `streamText`, `useChat`, SSE `toDataStreamResponse` |
| **LLM Provider** | KoboLLM / OpenAI Compatible | High-speed multi-model language processing |
| **External Search** | [Tavily Search API](https://tavily.com/) | Real-time web and company intelligence |
| **Database & ORM** | [Prisma ORM](https://www.prisma.io/) + PostgreSQL | Relational modeling with Neon PostgreSQL / SQLite dev |
| **Authentication** | [NextAuth v5](https://authjs.dev/) + Firebase Admin | OAuth providers (GitHub, Google) & Admin SDK |
| **Rate Limiting** | [Upstash Redis](https://upstash.com/) | Sliding-window distributed request throttling |
| **Styling & Motion** | [Tailwind CSS v4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) | Utility styling, GPU animations, CVA, Lucide Icons |
| **Unit & E2E Testing**| [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) | RTL accessible unit tests and full browser E2E flows |
| **Deployment** | [Vercel](https://vercel.com/) | Edge networking, automated preview branches, CI/CD |

---

## 🚀 Getting Started & Installation

### Prerequisites

- **Node.js**: v18.18+ or v20+
- **Package Manager**: `npm` or `pnpm`
- **LLM API Key**: OpenAI or KoboLLM compatible API key
- **Tavily API Key**: (Optional, for lead scoring) [Free at tavily.com](https://app.tavily.com)
- **Upstash Redis**: (Optional in development, recommended in production)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/AhmadBayu1412/nexus-ai.git
cd nexus-ai
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure your `.env.local` parameters:

```env
# Database (SQLite for local dev, Neon PostgreSQL for production)
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-random-key"

# AI Provider Credentials
OPENAI_API_KEY="your-llm-api-key"
OPENAI_BASE_URL="https://api.kobollm.com/v1" # Or custom OpenAI-compatible endpoint

# External Search (Lead Scoring)
TAVILY_API_KEY="tvly-dev-your-tavily-api-key"

# Upstash Redis Rate Limiting (Optional in local dev)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# OAuth Authentication (Optional for local testing)
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

### 3. Database Initialization

```bash
# Push schema to local dev database
npm run db:push

# Generate Prisma Client
npm run db:generate

# (Optional) Launch Prisma Studio GUI
npm run db:studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts local Next.js dev server with Turbopack |
| `npm run build` | Compiles optimized production build |
| `npm run start` | Boots production server |
| `npm run lint` | Executes ESLint analysis |
| `npm run test` | Runs Vitest unit and component tests |
| `npm run test:e2e` | Runs Playwright end-to-end browser tests |
| `npm run db:generate` | Re-generates Prisma client artifacts |
| `npm run db:push` | Syncs schema directly with database |
| `npm run db:studio` | Launches visual Prisma Studio database manager |

---

## 📂 Project Directory Structure

```
nexus-ai/
├── .github/
│   └── workflows/
│       └── test.yml                 # GitHub Actions CI automated testing pipeline
├── docs/
│   ├── layers/                      # 11-Layer Engineering Specification
│   │   ├── layer-01-visual-ui.md
│   │   ├── layer-02-ux-audit.md
│   │   ├── layer-03-business-flow.md
│   │   ├── layer-04-state-management.md
│   │   ├── layer-05-api-contract.md
│   │   ├── layer-06-database-architecture.md
│   │   ├── layer-07-business-rules.md
│   │   ├── layer-08-system-architecture.md
│   │   ├── layer-09-security-access-control.md
│   │   ├── layer-10-testing-strategy.md
│   │   └── layer-11-observability.md
│   ├── screenshots/                 # Application & audit screenshots
│   ├── Architecture-Audit.md        # Comprehensive system architecture audit
│   ├── FE-08-RESILIENCE_AND_SECURITY_REQUIREMENTS.md # Resilience & edge case specs
│   ├── Requirement.md               # Product & technical requirements
│   └── TESTING_REQUIREMENTS.md      # Testing ADR & quality requirements
├── prisma/
│   └── schema.prisma                # PostgreSQL / SQLite relational data schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts        # SSE streaming & agentic tool executor endpoint
│   │   │   ├── chats/               # Chat management & IDOR protected CRUD
│   │   │   └── messages/feedback/   # Thumbs up/down feedback handler
│   │   ├── chat/
│   │   │   ├── [id]/page.tsx        # Individual persistent chat session
│   │   │   ├── new/page.tsx         # Virtual new chat landing route
│   │   │   └── page.tsx             # Main chat redirector
│   │   ├── layout.tsx               # Root layout & skip-to-content landmark
│   │   ├── page.tsx                 # Landing page
│   │   └── globals.css              # Global styles, tokens, and WCAG variables
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatUI.tsx           # Main chat orchestration component
│   │   │   ├── ChatInput.tsx        # Dynamic input with keyboard shortcuts
│   │   │   ├── ChatMessage.tsx      # Markdown bubble with 4-state tool machine
│   │   │   ├── ChatSidebar.tsx      # Sidebar with optimistic chat deletion
│   │   │   ├── EmptyState.tsx       # Prompt suggestions for new sessions
│   │   │   ├── JumpToLatest.tsx     # Floating auto-scroll release button
│   │   │   ├── LeadScoreCard.tsx    # Interactive lead evaluation card
│   │   │   ├── ThinkingIndicator.tsx# AI thought process indicator
│   │   │   ├── ToolError.tsx        # Resilient tool failure display
│   │   │   └── ToolLoading.tsx      # Multi-step tool execution state
│   │   ├── providers/
│   │   │   └── AuthProvider.tsx     # NextAuth session context provider
│   │   └── ui/
│   │       ├── SmartButton.tsx      # 5-state Framer Motion button
│   │       └── Toast.tsx            # Accessible floating toast notification
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── config.ts            # System prompt & tool definitions
│   │   │   └── title-generator.ts   # Auto chat title generator
│   │   ├── auth/
│   │   │   ├── firebase.ts          # Firebase client SDK
│   │   │   └── firebaseAdmin.ts     # Firebase Admin SDK
│   │   ├── db/
│   │   │   ├── index.ts             # Prisma client singleton
│   │   │   └── queries.ts           # Database persistence query helpers
│   │   ├── logger.ts                # Structured JSON logging
│   │   ├── rate-limit.ts            # Upstash Redis rate limiter
│   │   └── utils.ts                 # Class merger & UI helpers
│   ├── middleware.ts                # Authentication & route boundary middleware
│   └── types/
│       └── chat.ts                  # TypeScript definitions for chats & tools
├── src/__tests__/                   # Vitest component test suites
├── tests/
│   └── primary-flow.spec.ts         # Playwright E2E test specs
├── AUDIT.md                         # Accessibility & Performance Audit Report
├── PLAN.md                          # Claude-like Chat UI layout roadmap
├── vitest.config.ts                 # Vitest testing configuration
├── playwright.config.ts             # Playwright testing configuration
├── next.config.ts                   # Next.js configuration
└── package.json                     # Project manifest & dependencies
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `Enter` | Send message / trigger tool call | Chat Input |
| `Shift + Enter` | Insert newline in message input | Chat Input |
| `Escape` | Abort active streaming generation | Global Chat View |
| `Ctrl + K` / `Cmd + K` | Instantly focus chat message input | Global View |
| `Tab` / `Shift + Tab` | Navigate accessible landmarks & action buttons | Global Accessible Navigation |

---

## 📚 Documentation Index

All technical documents, architectural specifications, audits, and guides are organized below:

| Document | Purpose & Summary |
|---|---|
| [**AUDIT.md**](AUDIT.md) | **Accessibility & Performance Audit Report (FE-10)** — Lighthouse 100/100 A11y, 89/100 Mobile Performance, WAVE 10/10 zero errors report, and WCAG AA contrast logs. |
| [**PLAN.md**](PLAN.md) | **Claude-like UI Implementation Plan** — Thinking display, message rating, instruct popup, and styling roadmap. |
| [**Architecture Audit**](docs/Architecture-Audit.md) | **System Overview & Architectural Review** — High-level analysis of components, data flow, and server-client splits. |
| [**System Requirements**](docs/Requirement.md) | **Core System Specifications** — Functional, non-functional, security, UI/UX, and database requirements. |
| [**Resilience & Security (FE-08)**](docs/FE-08-RESILIENCE_AND_SECURITY_REQUIREMENTS.md) | **Resilience & Security Engineering Spec** — Comprehensive error matrices, surgical recovery, timeout tolerance, and sabotage testing. |
| [**Testing Requirements (FE-09)**](docs/TESTING_REQUIREMENTS.md) | **Automated Testing ADR** — Architecture Decision Record, testing rules, and Vitest/Playwright requirements. |
| [**Layer 01: Visual UI**](docs/layers/layer-01-visual-ui.md) | Design tokens, color schemes, typography, glassmorphism, and responsive CSS variables. |
| [**Layer 02: UX Audit**](docs/layers/layer-02-ux-audit.md) | User interaction patterns, auto-scrolling, generation control, and thinking state transitions. |
| [**Layer 03: Business Flow**](docs/layers/layer-03-business-flow.md) | Virtual chat lifecycle, lazy persistence, and session promotion flow. |
| [**Layer 04: State Management**](docs/layers/layer-04-state-management.md) | Vercel AI SDK integration, `useChatIdRef`, optimistic mutations, and component synchronization. |
| [**Layer 05: API Contract**](docs/layers/layer-05-api-contract.md) | Server-Sent Events (SSE) streaming format, tool call protocols, and CRUD endpoints. |
| [**Layer 06: Database Architecture**](docs/layers/layer-06-database-architecture.md) | Relational schema design, Prisma ORM, indexing strategy, and asynchronous write pipelines. |
| [**Layer 07: Business Rules**](docs/layers/layer-07-business-rules.md) | Cooldowns, anti-spam mechanisms, context length limits, and edge case policies. |
| [**Layer 08: System Architecture**](docs/layers/layer-08-system-architecture.md) | High-level system topology, boundary isolation, Next.js App Router layout, and Vercel hosting. |
| [**Layer 09: Security & Access Control**](docs/layers/layer-09-security-access-control.md) | NextAuth + Firebase authentication, IDOR mitigation, XSS prevention, and Redis rate limiting. |
| [**Layer 10: Testing Strategy**](docs/layers/layer-10-testing-strategy.md) | Unit, component, and E2E testing hierarchies, mock strategies, and CI/CD gating. |
| [**Layer 11: Observability**](docs/layers/layer-11-observability.md) | Structured logging, tool invocation traces, error telemetry, and performance monitoring. |

---

## 📄 License

Private & Proprietary — All rights reserved © 2026 Nexus AI Team.
