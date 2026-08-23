# Nexus AI — Enterprise-Grade Streaming Chatbot & Agentic Platform

A production-grade, state-of-the-art AI conversational interface and autonomous lead research platform built with **Next.js 16 (App Router)**, **React 19**, **Vercel AI SDK**, **Prisma ORM**, and **Tailwind CSS v4**. Engineered with token-by-token streaming, multi-step tool execution, virtual chat lifecycle management, robust IDOR protection, automated CI/CD testing safety net, production hygiene API rate limiting, and a certified **100/100 Accessibility** audit score.

[**Live Production URL**](https://nexus-ai-chat-five.vercel.app/chat) &nbsp;·&nbsp; [**GitHub Repository**](https://github.com/AhmadBayu1412/nexus-ai) &nbsp;·&nbsp; [**Documentation Index**](#-documentation-index)

---

## 📸 Overview & Visual Showcase

### The Problem Nexus AI Solves
Traditional AI chatbots often suffer from brittle streaming lifecycles, slow time-to-first-token, sidebar clutter from empty abandoned chats, lack of enterprise context or real-time web verification, vulnerable API endpoints susceptible to token-draining abuse, and poor accessibility for keyboard and screen-reader users.

**Nexus AI** solves these challenges by combining:
1. **Real-time SSE token streaming** with zero layout thrashing and smooth thinking indicator handoffs.
2. **Autonomous Lead Scoring (FE-07)** with live Google Search via the Tavily Search API.
3. **Lazy/Virtual Chat Management** preventing empty chat clutter in the database.
4. **Ironclad Production Hygiene & IDOR Defense** protecting API keys, quotas, and user data.
5. **Certified WCAG AA Accessibility** with full keyboard navigation and assistive screen-reader announcements.

---

### Interface Screenshots

| Chat Streaming & Reasoning Handoff | Chat History & Virtual State |
| :---: | :---: |
| ![Nexus AI — Chat Streaming](docs/screenshots/chat-streaming.png) | ![Nexus AI — Chat List](docs/screenshots/chat-list.png) |

| Lead Scoring & Agentic Web Search | Accessibility & Performance Audit |
| :---: | :---: |
| ![Nexus AI — Lead Scoring](docs/screenshots/lead-scoring.png) | ![Lighthouse Audit Score](docs/screenshots/after-audit.png) |

---

## 🌐 Production Deployment & Cross-Browser Validation

- **Live Production URL:** [https://nexus-ai-chat-five.vercel.app/chat](https://nexus-ai-chat-five.vercel.app/chat)
- **Deployment Platform:** Vercel (Edge Network + Serverless Node.js 20 Runtime)
- **Database:** Neon Serverless PostgreSQL with SSL encryption

### Cross-Browser Testing Matrix

| Browser / Client | Platform | Status | Validation Notes |
|---|---|:---:|---|
| **Google Chrome** | macOS / Windows / Linux | ✅ Pass | Full 60fps streaming, WebGL animations, CSS blur filters |
| **Mozilla Firefox** | macOS / Windows / Linux | ✅ Pass | Strict standard scrollbar & layout positioning |
| **Desktop Safari** | macOS (WebKit) | ✅ Pass | Backdrop-filter glassmorphism, popLayout transitions |
| **Mobile Safari (iOS)**| iOS 16+ (iPhone) | ✅ Pass | `100dvh` viewport height & virtual keyboard offset tracking |
| **Mobile Chrome** | Android | ✅ Pass | Responsive drawer sidebar & minimum 44px tap targets |

---

## ⚡ Key Highlights & Certified Metrics

- 🎯 **Lighthouse Mobile Score**: **100/100** Accessibility, **100/100** SEO, **100/100** Agentic Browsing, **89/100** Mobile Performance (Simulated 4G).
- ♿ **WAVE Evaluation (WebAIM)**: **0 Errors**, **0 Contrast Errors**, **0 Alerts**, **10/10 AIM Score** (WCAG AA Compliant).
- 🧪 **Automated Testing Safety Net**: 100% pass rate on Vitest + React Testing Library (accessible query selectors) and isolated Playwright E2E with network route interception.
- 🛡️ **Production Hygiene**: Pre-auth IP rate limiting, Upstash Redis user rate limiting, 4,000 char input caps, 30-message history context window limit, and edge payload guards.
- 🤖 **Multi-Step Agentic Tool Calling**: Autonomous company research via Tavily Search API with dynamic lead scoring and 4-state UI lifecycle transitions.
- 🚀 **Zero Empty-Chat Clutter**: Lazy chat creation pattern initializes conversations virtually (`/chat/new`) and persists them only upon the first message dispatch without stream interruption.

---

## 📑 Table of Contents

1. [Run Instructions (Local Setup)](#-run-instructions-local-setup)
2. [Environment Variables](#-environment-variables)
3. [Architecture & Technical Decisions](#-architecture--technical-decisions)
4. [How AI Tools Built This (Human-AI Collaboration)](#-how-ai-tools-built-this-human-ai-collaboration)
5. [Production Hygiene & API Quota Protection](#-production-hygiene--api-quota-protection)
6. [Agentic Lead Scoring Pipeline (FE-07)](#-agentic-lead-scoring-pipeline-fe-07)
7. [Resilience, Security & Error Matrix (FE-08)](#-resilience-security--error-matrix-fe-08)
8. [Automated Testing & Quality Assurance (FE-09)](#-automated-testing--quality-assurance-fe-09)
9. [Accessibility & Performance Audit (FE-10)](#-accessibility--performance-audit-fe-10)
10. [Database Schema & Data Model](#-database-schema--data-model)
11. [Tech Stack](#-tech-stack)
12. [Available Scripts](#-available-scripts)
13. [Project Directory Structure](#-project-directory-structure)
14. [Git Commit Standards](#-git-commit-standards)
15. [Documentation Index](#-documentation-index)

---

## 🚀 Run Instructions (Local Setup)

Follow these straightforward steps to clone, configure, and run Nexus AI locally:

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm** or **pnpm**
- **LLM API Key**: OpenAI or KoboLLM compatible API key
- **Tavily API Key**: (Optional, for lead scoring) [Get free at app.tavily.com](https://app.tavily.com)

### Step 1: Clone Repository
```bash
git clone https://github.com/AhmadBayu1412/nexus-ai.git
cd nexus-ai
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy the `.env.example` template to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the parameters as detailed in the [Environment Variables](#-environment-variables) section.

### Step 4: Initialize the Database
Push the Prisma schema to create the local database (`dev.db`):
```bash
# Push schema to SQLite database (dev)
npm run db:push

# Generate Prisma Client bindings
npm run db:generate

# (Optional) Open Prisma Studio database viewer
npm run db:studio
```

### Step 5: Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to start chatting.

### Step 6: Run Automated Tests
```bash
# Run unit & component tests (Vitest)
npm run test

# Run End-to-End browser tests (Playwright)
npm run test:e2e
```

---

## 🔑 Environment Variables

The following environment variables configure database connectivity, authentication, AI providers, and rate limiting:

| Variable Name | Required | Description | Example / Format |
|---|:---:|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (production) or SQLite path (local dev) | `file:./dev.db` or `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_URL` | **Yes** | Canonical URL of your deployment | `http://localhost:3000` or `https://nexus-ai-chat-five.vercel.app` |
| `NEXTAUTH_SECRET` | **Yes** | Encryption secret for NextAuth sessions | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | **Yes** | API key for KoboLLM or OpenAI LLM provider | `sk-proj-...` or `kobo-...` |
| `OPENAI_BASE_URL` | Optional | Custom base URL for OpenAI-compatible LLM endpoints | `https://api.kobollm.com/v1` |
| `TAVILY_API_KEY` | Optional | API key for autonomous web research & lead scoring | `tvly-dev-xxxx...` |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis REST endpoint for distributed rate limiting | `https://xxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN`| Optional | Upstash Redis REST access token | `AXxxxx...` |
| `AUTH_GITHUB_ID` | Optional | GitHub OAuth Application Client ID | `Iv1.xxxxxxxx` |
| `AUTH_GITHUB_SECRET` | Optional | GitHub OAuth Application Client Secret | `xxxxxxxxxxxxxxxx` |
| `AUTH_GOOGLE_ID` | Optional | Google Cloud OAuth Client ID | `xxxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Optional | Google Cloud OAuth Client Secret | `GOCSPX-xxxx` |

---

## 🏛 Architecture & Technical Decisions

The codebase adheres to an 11-layer modular architecture defined in [`docs/layers/`](docs/layers/):

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

### Architectural Decisions & Stack Rationale

1. **Next.js 16 (App Router) & React 19**:
   - *Rationale:* Leverages React Server Components for fast initial page load and SEO while isolating interactive streaming interfaces to Client Components (`'use client'`). Turbopack provides lightning-fast local compilation.
2. **Vercel AI SDK (`ai` package)**:
   - *Rationale:* Standardizes token-by-token Server-Sent Events (SSE) via `toDataStreamResponse()`, provides native hook abstractions (`useChat`), and simplifies multi-step tool execution (`maxSteps: 10`) for autonomous agents.
3. **Lazy / Virtual Chat Lifecycle (Layer 03)**:
   - *Rationale:* Initiates new chats in memory at `/chat/new`. The database record is only generated upon the first message dispatch. Stream continuity is preserved using `window.history.replaceState` and `useChatIdRef`, eliminating empty chat records and page re-mount flickers.
4. **IDOR Defense & 404 Masking (Layer 09)**:
   - *Rationale:* Every chat query (`GET`, `POST`, `DELETE`) verifies ownership against the authenticated Firebase/NextAuth user ID. Unauthorized queries return `404 Not Found` (rather than `403 Forbidden`) to prevent leaking the existence of other users' session IDs.
5. **Tailwind CSS v4 + Framer Motion (Layer 01 & 02)**:
   - *Rationale:* CSS design tokens manage high-contrast light/dark themes with zero runtime CSS-in-JS overhead. Framer Motion handles GPU-accelerated micro-interactions while respecting `prefers-reduced-motion`.

---

## 🤖 How AI Tools Built This (Human-AI Collaboration)

This project was built through a structured, iterative collaboration between the **Human Engineer** and **Advanced AI Coding Agents**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HUMAN-AI COLLABORATIVE WORKFLOW                      │
├────────────────────────────────────┬────────────────────────────────────┤
│         HUMAN ENGINEER             │         AI CODING AGENT            │
│       (Director & Critic)          │      (Architect & Executor)        │
├────────────────────────────────────┼────────────────────────────────────┤
│ • Requirements definition & scope  │ • Layer-by-layer implementation    │
│ • UI aesthetic & UX evaluation     │ • Strict architectural compliance  │
│ • Spotting visual glitches/errors  │ • Writing clean TypeScript & CSS   │
│ • Deciding enhancements/refactors  │ • Generating Vitest & E2E suites   │
│ • Evaluating human-centric A11y    │ • Running tests & compiler checks  │
│ • Orchestrating next iteration     │ • Refactoring & fixing regressions │
└────────────────────────────────────┴────────────────────────────────────┘
```

### 1. The Role of the AI Agent
- **Full Architectural Implementation**: The AI systematically executed all requirements layer-by-layer (from visual tokens and state machines to database schemas and rate limiters) based on the PRDs and technical plans.
- **Efficient & Type-Safe Code Generation**: Translated complex streaming flows, SSE handlers, multi-step tool definitions, and regex-routed workflows into maintainable, idiomatic TypeScript and Next.js App Router code.
- **Automated Testing Suite Execution**: Generated comprehensive unit, component, and E2E test suites using Vitest and Playwright with accessibility-first queries and network route mocking, ensuring 100% test pass rates before commit.

### 2. The Role of the Human Engineer
- **UI & UX Quality Control**: Served as the visual and experiential critic—evaluating animations, color contrast, layout hierarchy, and mobile responsive behavior against real-world human expectations.
- **Visual Glitch & Error Spotting**: Identified subtle layout shifts, viewport jumps during mobile keyboard activation, contrast failures in dark mode, and state desynchronizations during stream aborts.
- **Strategic Direction & Decision Making**: Decided which features to add (e.g., Lead Scoring, SmartButton state machines, Lazy Chat Promotion, Production Hygiene) and evaluated whether AI-generated solutions were intuitive, accessible, and acceptable for human end-users.
- **Prompting & Task Orchestration**: Outlined specific requirements, articulated error symptoms observed in the UI/UX, and defined the next tactical steps for the AI to implement and verify.

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

---

## 🛡️ Resilience, Security & Error Matrix (FE-08)

Based on the [FE-08 Resilience Specification](docs/FE-08-RESILIENCE_AND_SECURITY_REQUIREMENTS.md), the application implements surgical error recovery rather than catastrophic page crashes:

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
- ♿ **Strict ARIA Queries**: No brittle CSS classes or `data-testid` attributes; tests query by `getByRole`, `getByText`, and `getByLabelText`.

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

## 🏷 Git Commit Standards

This repository strictly adheres to the **Conventional Commits** specification:

- `feat:` Introduces a new user-facing feature or tool capability (e.g. `feat(lead-scoring): add Tavily search pipeline`).
- `fix:` Patches a bug or regression (e.g. `fix(chat): prevent unmount during virtual chat promotion`).
- `docs:` Updates or expands technical documentation (e.g. `docs(readme): add production hygiene and architecture specs`).
- `test:` Adds or modifies unit, component, or E2E tests (e.g. `test(a11y): add RTL form validation tests`).
- `refactor:` Code restructuring without altering behavior or fixing bugs (e.g. `refactor(rate-limit): add in-memory fallback`).
- `perf:` Performance and rendering optimizations (e.g. `perf(css): optimize contrast and composite-only animations`).
- `chore:` Dependency maintenance or configuration adjustments (e.g. `chore: configure Turbopack and Vitest setup`).

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
