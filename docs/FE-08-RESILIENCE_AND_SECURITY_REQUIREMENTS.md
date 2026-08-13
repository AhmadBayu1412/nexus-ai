# FE-08 — RESILIENCE AND SECURITY REQUIREMENTS
> **Frontend AI Engineering — Spec Document**
> **Stack:** Next.js 16 (App Router) · Vercel AI SDK 3.4.33 · Tailwind CSS v4 · Framer Motion
> **Status:** Draft · Audience: FE Engineers · Version: 1.0

---

## Table of Contents

1. [Tinjauan Umum & Filosofi Sistem](#1-tinjauan-umum--filosofi-sistem)
2. [Matriks Pemetaan Error & Edge Cases](#2-matriks-pemetaan-error--edge-cases)
3. [Arsitektur Penanganan Error](#3-arsitektur-penanganan-error)
4. [UX Empty States & Skeleton Loading](#4-ux-empty-states--skeleton-loading)
5. [Optimasi Mobile & Safari iOS Specifics](#5-optimasi-mobile--safari-ios-specifics)
6. [Protokol Pengujian / Sabotage Testing Checklist](#6-protokol-pengujian--sabotage-testing-checklist)
7. [Deliverables & Checkpoint 1 Checklist](#7-deliverables--checkpoint-1-checklist)

---

## 1. Tinjauan Umum & Filosofi Sistem

### 1.1 Mengapa Graceful Degradation Sangat Krusial pada Aplikasi LLM Streaming

Aplikasi yang menggunakan model bahasa besar (LLM) dengan **streaming response** menghadapi kelas error yang secara fundamental berbeda dari aplikasi CRUD tradisional. Berikut perbandingan antara konteks demo dan produksi:

| Dimensi | Demo / Prototype | Produksi |
|---|---|---|
| **Error surface** | Biasanya diabaikan — asumsi "akan berjalan" | Setiap error harus dipulihkan tanpa kehilangan konteks |
| **Stream interruption** | Acceptable — user bisa reload | partial response harus dipertahankan, pesan terakhir bisa di-retry |
| **User expectation** | Tolerant — "belum selesai" | Intolerant — error tanpa konteks = hilang trust |
| **Recovery model** | Page reload | Retry surgical (hanya pesan terakhir), bukan full reset |
| **Tool call failure** | Diabaikan atau log | Tool error harus memiliki UI spesifik + retry button |
| **Network reliability** | Lab environment | Real-world: 4G flakiness, VPN dropout, plane mode |

**Prinsip filosofi yang mendasari standar ini:**

1. **Zero assumption**: Jangan pernah berasumsi network akan stabil — tangani semua failure case.
2. **Surgical recovery**: Error recovery harus targeted — retry hanya komponen/pesan yang gagal, bukan seluruh percakapan.
3. **Never crash silently**: Setiap error harus memiliki representasi visual yang bermakna bagi user.
4. **Progressive enhancement**: Empty state bukan sekadar "tidak ada data", tapi on-ramp yang mengarahkan user ke aksi pertama.
5. **Mobile-first stress**: Testing utama dilakukan di kondisi terburuk — iOS Safari, jaringan lemah, virtual keyboard aktif.

### 1.2 Alur Error Propagation dalam Arsitektur

```
User Action
    │
    ▼
ChatInput (form submit)
    │
    ▼
customFetch (Firebase token injection)
    │
    ▼
useChat hook (ai/react) ───────────────────────────────► onError callback
    │                                                   (→ error state → toast)
    ▼
/api/chat route handler
    │
    ├── try: streamText → toAIStreamResponse
    │
    └── catch: logger.error → HTTP 502
                   │
                   ▼
            useChat onError fires
```

Setiap layer memiliki responsibility yang jelas. Dokumen ini mencakup semua layer kecuali `streamText` business logic (backend concern).

---

## 2. Matriks Pemetaan Error & Edge Cases

### 2.1 Inventory Matrix

| # | Skenario | Root Cause | UI/UX Strategy | Recovery Strategy |
|---|---|---|---|---|
| **E1** | Network failure sebelum kirim | `navigator.onLine` false, CORS, DNS fail,机场 mode | Disable submit button + inline helper text. Jika sudah submit, tampilkan toast error dengan pesan spesifik | Auto-retry on reconnect via `online` event listener. Fallback: manual retry button |
| **E2** | API Error mid-stream disconnect | Server 502/503, connection reset, upstream timeout | Truncate partial message. Tampilkan `ToolError` variant `network` di dalam bubble | `handleRegenerate` — drop last assistant message, re-submit last user input |
| **E3** | Rate limit HTTP 429 | Upstash Redis: 10 req / 10s exceeded | Toast "Batas tercapai. Coba lagi dalam X detik" dengan countdown. Disable input bar sementara | Exponential backoff: 1s → 2s → 4s → 8s. Auto-enable setelah cooldown |
| **E4** | Tool Call JSON malformed/rusak | LLM output `{{` tak terduga, incomplete JSON, server parse error | `ToolError` dengan pesan spesifik dari error object. Tool badge merah di header | `handleRetryTool` — append ulang pesan user ke conversation untuk restart tool chain |
| **E5** | Input kosong | User menekan Enter tanpa isi | `preventDefault` + button tetap disabled. Textarea retain focus | — |
| **E6** | Slow response / latency tinggi | Model cold start, network jitter, large context | `ThinkingIndicator` aktif setelah 500ms. Skeleton shimmer di 2s+. Route handler `AbortSignal.timeout(30000)` | Timeout → `ToolError` variant `timeout`. User bisa retry |
| **E7** | Authentication failure mid-session | Firebase token expired, `verifyIdToken` return 401 | Redirect ke landing page + toast "Session expired. Please sign in again." | User sign-in ulang, conversation state preserved di localStorage |
| **E8** | Chat not found (404) | Chat di-delete collaborator / IDOR | Redirect ke `/chat/new` + toast "Chat tidak ditemukan" | User bikin chat baru |

### 2.2 AI SDK Error Object Contract

`useChat` dari `ai/react` melempar error dengan struktur berikut — dokumentasi ini sebagai kontrak:

```typescript
// useChat onError callback signature
onError: (err: Error) => void

// err.message bisa berupa:
// 1. Plain string: "An error occurred"
// 2. JSON string: '{"error":"RATE_LIMIT_EXCEEDED","message":"Too many requests"}'
// 3. Network error: "Failed to fetch" / "Network request failed"
// 4. Firebase error: "Firebase ID token expired"

```

**Konvensi parsing di `ChatUI.tsx`** — sudah terimplementasi, dokumentasi ini sebagai referensi:

```typescript
// src/components/chat/ChatUI.tsx — onError handler
onError: (err) => {
  let message = err.message || 'An error occurred';
  // Try parse JSON error dari route handler
  try {
    const parsed = JSON.parse(message);
    message = parsed.message || parsed.error || message;
  } catch { /* keep original */ }
  // Firebase auth error detection
  if (
    message.includes('ID token') ||
    message.includes('UNAUTHORIZED') ||
    message.includes('Firebase')
  ) {
    message = 'Authentication required. Please sign in again.';
  }
  setError(message);           // → error toast (auto-dismiss 5s)
},
```

### 2.3 Tool Error Variant Detection

`ToolError` component menggunakan `detectVariant()` untuk mapping error message ke UI yang sesuai:

```typescript
// src/components/chat/ToolError.tsx
type ErrorVariant = 'network' | 'timeout' | 'rate_limit' | 'unknown';

function detectVariant(message: string | null | undefined): ErrorConfig {
  const lower = (message || '').toLowerCase();
  if (/network|fetch|econnrefused|dns/.test(lower)) return 'network';
  if (/timeout|timed out|etimedout|deadline/.test(lower)) return 'timeout';
  if (/rate limit|429|too many request/.test(lower)) return 'rate_limit';
  return 'unknown';
}
```

---

## 3. Arsitektur Penanganan Error

### 3.1 Route Boundary — `error.tsx` (Next.js App Router)

**File target:** `src/app/chat/error.tsx`

Next.js App Router menangkap semua crash yang terjadi di dalam segment `chat/`. Ini adalah safety net terakhir — error yang tidak tertangkap oleh `useChat.onError` akan sampai di sini.

**Spesifikasi implementasi:**

```tsx
// src/app/chat/error.tsx
'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to observability system
    logger.error('Uncaught chat segment error', {
      type: 'boundary_error',
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: 'rgba(239,68,68,0.10)',
          border: '1px solid rgba(239,68,68,0.20)',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f87171"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Terjadi kesalahan
        </h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {error.message || 'Error tidak diketahui. Silakan coba lagi.'}
        </p>
        {error.digest && (
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)' }}
      >
        Coba Lagi
      </button>
    </div>
  );
}
```

**Catatan integrasi:**
- Error boundary ini hanya menangkap error di segment `chat/`. Root layout error handling ( untuk crash di luar chat) harus dibuat di `src/app/global-error.tsx` secara terpisah.
- `reset()` akan me-remount entire segment — conversation state akan hilang. Ini adalah last resort, bukan first recovery.

---

### 3.2 Stream & Hook Boundary — `onError` Callback

**File yang sudah ada:** `src/components/chat/ChatUI.tsx` — baris 160-179

Implementasi `onError` di `useChat` hook adalah primary error handler untuk semua streaming error. Error yang sampai di sini sudah melewati `customFetch` Firebase token injection dan sampai ke server.

**Kontrak perilaku:**

| Property | Value |
|---|---|
| Error auto-dismiss | 5000ms via `setTimeout` |
| User action required | Dismissing manual via X button |
| Auth error detection | Keyword-based (`ID token`, `UNAUTHORIZED`, `Firebase`) |
| Error toast position | Fixed top-right (`top-16 right-4`) |
| Animation | Framer Motion `AnimatePresence` + fade + scale |

---

### 3.3 Spesifikasi Tombol Retry

#### 3.3.1 Retry Pesan Terakhir (`handleRegenerate`)

**File:** `src/components/chat/ChatUI.tsx` — baris 302-319

Retry di level conversation hanya boleh retry **pesan terakhir yang gagal**, bukan reset seluruh percakapan. Berikut spesifikasi lengkap:

```typescript
// Kontrak handleRegenerate:
// 1. stop() — hentikan stream yang sedang berjalan
// 2. setMessages(prev => prev.slice(0, -1)) — drop partial assistant message
// 3. Simpan lastInputRef.current untuk di-reinject
// 4. setTimeout chain: setInput → form.requestSubmit
// 5. Toast: "🔄 Regenerating..." (duration 2000ms)

const handleRegenerate = useCallback(() => {
  if (!lastInputRef.current) return;
  stop();                                          // 1. Abort current stream
  setMessages((prev) => {                          // 2. Drop partial message
    if (prev.length === 0) return prev;
    return prev.slice(0, -1);
  });
  const inputToRetry = lastInputRef.current;       // 3. Capture input
  setTimeout(() => {
    setInput(inputToRetry);                        // 4. Re-inject
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) form.requestSubmit();               // 5. Re-submit
    }, 30);
  }, 50);
}, [stop, setMessages, setInput]);
```

**Proteksi double-click:**

Debouncing dilakukan via:
1. `lastInputRef.current` guard — jika kosong, tombol tidak melakukan apa-apa
2. `canRegenerate` prop ke `ChatMessage` — hanya `true` jika `isLastAssistant && !isLoading`
3. `stop()` dipanggil pertama — memastikan tidak ada double stream

#### 3.3.2 Retry Tool Call (`handleRetryTool`)

**File:** `src/components/chat/ChatMessage.tsx` — dipanggil dari `ToolError.onRetry`

Retry tool berbeda dari retry conversation — tool failure biasanya terjadi setelah pesan user sudah tersimpan. Strategi: append pesan user baru dengan intent yang sama untuk memicu ulang tool chain.

```typescript
// handleRetryTool signature:
// Memanggil append() dengan pesan user baru yang merekonstruksi tool call

const handleRetryTool = useCallback(
  async (_toolCallId: string, _toolName: string, args: Record<string, unknown>) => {
    toast({ message: '🔄 Retrying...', type: 'info', duration: 2000 });
    const companyName = args.companyName as string | undefined;
    const industry = args.industry as string | undefined;
    const companySize = args.companySize as string | undefined;
    const sizeText = companySize ? `, company size: ${companySize}` : '';
    const text = `Score lead: ${companyName}, industry: ${industry}${sizeText}`;
    append({
      id: `retry-${Date.now()}`,
      role: 'user',
      content: text,
    });
  },
  [append]
);
```

#### 3.3.3 Visual Feedback Retry

| State | Visual |
|---|---|
| Idle (can retry) | Tombol Regenerate aktif, icon `RefreshCw` |
| Retrying | Spinner + "Regenerating..." text, tombol disabled |
| Success | Toast menghilang otomatis |
| Failed (secondary error) | Error toast baru muncul |

---

## 4. UX Empty States & Skeleton Loading

### 4.1 Empty State sebagai Onboarding

**Prinsip:** Empty state bukan placeholder, tapi on-ramp. User yang datang ke chat baru harus langsung tahu apa yang bisa dilakukan tanpa membaca dokumentasi.

**Komponen target:** `src/components/chat/EmptyState.tsx` (buat baru)

**Spesifikasi:**

```tsx
// src/components/chat/EmptyState.tsx
'use client';

import { motion } from 'framer-motion';

interface EmptyStateProps {
  onPromptClick: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  'Explain how Server-Sent Events work in 2 sentences',
  'Refactor this React hook to use best practices',
  'Debug my async function and explain the issue',
  'Write a clean TypeScript utility function',
];

const BUSINESS_PROMPTS = [
  'Score this lead: [company name]',
  'Research a company and summarize their funding',
  'Compare funding stages of two startups',
  'Analyze this lead from the last chat',
];

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center min-h-[60vh]"
    >
      {/* Bot avatar with floating animation */}
      <div className="relative mb-8">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center animate-float"
          style={{
            background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)',
            border: '1px solid rgba(44,42,38,0.12)',
          }}
        >
          <BotIcon />
        </div>
        <div
          className="absolute inset-0 -z-10 rounded-2xl scale-110 opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(74,107,124,0.5) 0%, transparent 70%)' }}
        />
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
        <span className="text-gradient">How can I help you</span>
        <br />
        <span style={{ color: '#3C3A36' }}>today?</span>
      </h2>
      <p className="text-center mb-10 max-w-md leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        I&apos;m your AI assistant — great at coding, writing, analysis,
        and creative tasks.
      </p>

      {/* Prompt starters grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg px-4">
        {STARTER_PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPromptClick(prompt)}
            className="group relative px-4 py-3.5 rounded-xl text-left text-sm
              transition-all duration-200 focus-ring min-h-[56px] flex items-center"
            style={{
              background: 'rgba(255,253,248,0.90)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(44,42,38,0.10)',
              color: 'var(--text-secondary)',
            }}
          >
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(74,107,124,0.07) 0%, transparent 60%)',
                border: '1px solid rgba(74,107,124,0.14)',
              }}
            />
            <div className="relative flex items-start gap-3 w-full">
              <div
                className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5"
                style={{ background: 'rgba(74,107,124,0.14)' }}
              >
                <SparkleIcon />
              </div>
              <span className="flex-1 leading-snug">{prompt}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
```

**Integrasi di `ChatUI.tsx`:**

Empty state saat ini adalah inline JSX di `ChatUI.tsx` baris 436-502. Refactor ke komponen terpisah:

```tsx
// Di ChatUI.tsx — replace inline empty state dengan:
{messages.length === 0 ? (
  <EmptyState onPromptClick={handleStarterClick} />
) : (
  // ... message list
)}
```

**Prompt starters harus:**
- Jelas dan actionable (bukan "halo" tapi "Refactor this React hook...")
- Berkaitan langsung dengan use case aplikasi (coding assistant)
- Bisa diklik langsung — mengisi textarea dan auto-submit tanpa perlu user ketik manual

---

### 4.2 Zero-CLS Skeleton Loading

**Masalah:** Saat response streaming mulai masuk, browser mengukur ulang layout — ini menyebabkan Cumulative Layout Shift (CLS). CLS di Core Web Vitals直接影响 SEO dan UX score.

**Prinsip Zero-CLS:**
> "Skeleton UI harus memiliki dimensi yang **persis sama** dengan komponen asli yang akan menggantikannya."

#### 4.2.1 Chat Bubble Skeleton

**File target:** `src/components/chat/ChatSkeleton.tsx` (buat baru)

```tsx
// src/components/chat/ChatSkeleton.tsx
'use client';

/**
 * Zero-CLS skeleton for initial chat message list.
 * Dimensi persis sama dengan ChatMessage bubble.
 * Menggunakan Tailwind animate-shimmer (sudah ada di globals.css).
 */

export function ChatBubbleSkeleton({ role = 'assistant' }: { role?: 'user' | 'assistant' }) {
  const isUser = role === 'user';

  return (
    <div className="flex gap-3 animate-pulse">
      {/* Avatar placeholder */}
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full shrink-0 mt-0.5"
          style={{ background: 'rgba(74,107,124,0.12)' }}
        />
      )}

      {/* Bubble skeleton */}
      <div
        className={`flex flex-col gap-2 ${isUser ? 'ml-auto items-end' : ''}`}
        style={{ maxWidth: isUser ? '75%' : '80%' }}
      >
        {/* Line 1 */}
        <div
          className="h-4 rounded shimmer"
          style={{
            width: isUser ? '70%' : '90%',
            background: 'rgba(44,42,38,0.08)',
          }}
        />
        {/* Line 2 */}
        <div
          className="h-4 rounded shimmer"
          style={{
            width: isUser ? '50%' : '75%',
            background: 'rgba(44,42,38,0.08)',
          }}
        />
        {/* Line 3 */}
        <div
          className="h-4 rounded shimmer"
          style={{
            width: isUser ? '60%' : '55%',
            background: 'rgba(44,42,38,0.08)',
          }}
        />
      </div>
    </div>
  );
}

/** Full message list skeleton — untuk initial load di chat/[id]/page.tsx */
export function ChatMessageListSkeleton() {
  return (
    <div className="space-y-5">
      <ChatBubbleSkeleton role="user" />
      <ChatBubbleSkeleton role="assistant" />
      <ChatBubbleSkeleton role="assistant" />
      <ChatBubbleSkeleton role="user" />
      <ChatBubbleSkeleton role="assistant" />
    </div>
  );
}
```

**Integrasi di `chat/[id]/page.tsx`:**

Replace spinner dengan skeleton:

```tsx
// src/app/chat/[id]/page.tsx
import { ChatMessageListSkeleton } from '@/components/chat/ChatSkeleton';

if (loading || isLoadingChat) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4">
      <ChatMessageListSkeleton />
    </div>
  );
}
```

#### 4.2.2 Tool Loading Skeleton

**File yang sudah ada:** `src/components/chat/ToolLoading.tsx`

Tool skeleton untuk fase streaming dan executing sudah terimplementasi. Pola shimmer-nya menggunakan CSS animation `shimmer` (globals.css baris 276-278) dengan `background-size: 200% 0` + `background-position` animation.

**Spesifikasi dimensi untuk tool skeleton:**

| Tool | Parameter skeleton |
|---|---|
| `research_company` | `companyName` → baris pertama 60%, `industry` → baris kedua 40% |
| `score_lead` | `companyName` → 70%, `industry` → 50%, `employees` → 40% |

---

## 5. Optimasi Mobile & Safari iOS Specifics

### 5.1 Viewport `100vh` Fix untuk iOS Safari

**Masalah:** iOS Safari melaporkan `100vh` yang lebih besar dari tinggi viewport sebenarnya — termasuk address bar yang tersembunyi. Ini menyebabkan konten terpotong atau ter-scroll secara tidak sengaja.

**Solusi: CSS Custom Property + Fallback Chain**

```css
/* src/app/globals.css — Tambahan di section Dynamic Viewport Units */

.chat-layout {
  /* 1. Dynamic viewport height — real estate minus keyboard */
  height: 100dvh;
  /* 2. Fallback: standard viewport height */
  height: 100vh;
  /* 3. iOS Safari legacy fix: fill available vertical space */
  min-height: -webkit-fill-available;
}

/* Applied to main chat container in chat/[id]/page.tsx */
.main-container {
  height: 100dvh;
  height: 100vh;
  min-height: -webkit-fill-available;
  overflow: hidden;
}
```

**Integrasi di `chat/[id]/page.tsx`:**

```tsx
// Ganti:
// <div className="flex h-dvh overflow-hidden">

// Menjadi:
<div className="flex chat-layout overflow-hidden">
```

> **Catatan:** `h-dvh` (Tailwind) hanya cover `100dvh`. Untuk iOS Safari lama, kelas `.chat-layout` dari globals.css menangani fallback `100vh` + `-webkit-fill-available`.

---

### 5.2 Virtual Keyboard Handling

**Masalah:** Keyboard maya iOS menimpa input bar yang di-`pin` ke bottom. Input menjadi tidak terlihat saat keyboard aktif.

**Solusi: `visualViewport` API + CSS Transform**

`visualViewport` API (didukung di iOS Safari 16+) memberikan tinggi viewport yang sebenarnya saat keyboard terbuka. Fallback ke `window.innerHeight` untuk browser lain.

**Implementasi di `ChatInput.tsx`:**

```typescript
// src/components/chat/ChatInput.tsx — Tambahan useEffect

useEffect(() => {
  // Cek dukungan visualViewport API
  const vp = window.visualViewport;
  if (!vp) return;

  let pendingAnimationFrame: number | null = null;

  const handleViewportChange = () => {
    // Cancel previous frame — debounce resize events
    if (pendingAnimationFrame !== null) {
      cancelAnimationFrame(pendingAnimationFrame);
    }
    pendingAnimationFrame = requestAnimationFrame(() => {
      if (!vp) return;
      const keyboardHeight = window.innerHeight - vp.height - (vp.offsetTop || 0);
      if (keyboardHeight > 0) {
        // Keyboard terbuka — geser input bar ke atas
        document.documentElement.style.setProperty(
          '--kb-offset',
          `${keyboardHeight}px`
        );
      } else {
        // Keyboard tertutup — reset
        document.documentElement.style.setProperty('--kb-offset', '0px');
      }
    });
  };

  vp.addEventListener('resize', handleViewportChange);
  vp.addEventListener('scroll', handleViewportChange);

  return () => {
    vp.removeEventListener('resize', handleViewportChange);
    vp.removeEventListener('scroll', handleViewportChange);
    if (pendingAnimationFrame !== null) {
      cancelAnimationFrame(pendingAnimationFrame);
    }
  };
}, []);
```

**CSS untuk keyboard offset:**

```css
/* src/app/globals.css */

.chat-input-offset {
  /* translateY mengompensasi tinggi keyboard virtual */
  transform: translateY(calc(-1 * var(--kb-offset, 0px)));
  transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
}

/* Fallback: untuk browser tanpa CSS custom property support */
/* scrollIntoView akan dipakai sebagai fallback di ChatInput.tsx */
```

**Integrasi di JSX `ChatInput.tsx`:**

```tsx
// Tambahkan className di form container:
<form
  ref={formRef}
  onSubmit={handleSubmit}
  className="
    sticky bottom-0 z-10 w-full
    px-3 pb-3 pt-2
    safe-area-inset-bottom
    chat-input-offset          // ← Tambahan ini
  "
>
```

**Fallback behavior (tanpa visualViewport):**

Jika `window.visualViewport` tidak tersedia, gunakan `Element.scrollIntoView()` dengan behavior `smooth`:

```typescript
// Di ChatInput.tsx — focus handler sebagai fallback
const handleFocus = () => {
  if (!window.visualViewport) {
    // Scroll input ke dalam viewport dengan delay kecil (keyboard animasi)
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 350);
  }
};
```

---

### 5.3 Rubber-band Scrolling & Auto-scroll Conflict

**Masalah:** iOS Safari memiliki rubber-band effect bawaan (overscroll bounce). Saat user scroll ke atas di message list dan mencapai batas, browser "memantul" — ini berkonflik dengan auto-scroll behavior percakapan.

**Solusi:**

```typescript
// Di ChatUI.tsx — handleScroll callback

const handleScroll = useCallback(() => {
  const container = containerRef.current;
  if (!container) return;

  const { scrollTop, scrollHeight, clientHeight } = container;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

  if (distanceFromBottom > 50) {
    setIsPinned(false);
    setShowJumpToLatest(true);
  } else {
    setIsPinned(true);
    setShowJumpToLatest(false);
  }
}, []);

// Pasif event listener — tidak memblokir scroll performance
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  container.addEventListener('scroll', handleScroll, { passive: true });
  return () => container.removeEventListener('scroll', handleScroll);
}, [handleScroll]);
```

**CSS: `overscroll-behavior`**

```css
/* src/app/globals.css */

.scroll-container {
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
  /* Cegah rubber-band di level container — parent handle sendiri */
  overscroll-behavior: contain;
}
```

**JumpToLatest button:**

Ketika user scroll ke atas (bukan karena auto-scroll), `isPinned = false` → `JumpToLatest` button muncul. Ini adalah indikasi visual bahwa ada pesan baru dan user sedang tidak di bottom. Prinsip: **auto-scroll adalah hak prerogative user**, bukan aplikasi.

---

## 6. Protokol Pengujian / Sabotage Testing Checklist

Setiap engineer **WAJIB** menjalankan checklist ini sebelum merge. Lakukan berurutan dari yang paling merusak ke paling ringan.

### Precondition
```bash
# Pastikan dev server berjalan
npm run dev
# Buka http://localhost:3000/chat/new
```

---

### [ ] Test 1: Network Offline Sebelum Kirim

**Target:** Empty state, input validation

**Langkah:**
1. Buka DevTools → Network tab
2. Pilih dropdown "No throttling" → **Offline**
3. Ketik pesan di textarea
4. Klik tombol kirim / tekan Enter

**Ekspektasi:**
- [ ] Tombol kirim disabled SAAT offline (via `navigator.onLine` check) **ATAU**
- [ ] Jika tetap bisa submit: error toast muncul dalam < 3s dengan pesan network error
- [ ] Pesan user **tidak** masuk ke message list (karena tidak pernah sampai server)
- [ ] Input dikembalikan ke textarea setelah error (preserve draft)

** kode validasi:**

```typescript
// Di ChatInput.tsx — tambahkan online check
const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
// canSubmit = isOnline && input.trim().length > 0 && !isLoading;
```

---

### [ ] Test 2: Mid-Stream Disconnect

**Target:** `onError` callback, `handleRegenerate`, partial message truncation

**Langkah:**
1. Kirim pesan yang menghasilkan response panjang
2. Saat streaming aktif, DevTools → Network → **Slow 3G**
3. Tunggu 2-3 detik
4. Klik **"No throttling"** → **Offline** secara tiba-tiba

**Ekspektasi:**
- [ ] Partial assistant message tetap tampil (tidak crash)
- [ ] Error toast muncul: "Connection interrupted" atau network error
- [ ] Tombol **Regenerate** muncul di message action bar
- [ ] Klik Regenerate → pesan berhasil di-retry
- [ ] Tidak ada console.error (error sudah handled)

**Aksi yang DILARANG:**
- ❌ Hapus seluruh conversation history
- ❌ Redirect ke halaman lain
- ❌ Tampilkan blank screen

---

### [ ] Test 3: Rate Limit HTTP 429 Injection

**Target:** Rate limit handling, countdown UI, input disable

**Langkah manual (tanpa mock server):**
1. Buat 12 request cepat ke `/api/chat` (loop di console):
```javascript
// Jalankan di browser console saat di /chat/new
for (let i = 0; i < 15; i++) {
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: `ping ${i}` }], chatId: 'test' })
  });
}
```
2. Request ke-11+ akan menghasilkan HTTP 429

**Ekspektasi:**
- [ ] Toast: "Terlalu banyak permintaan. Coba lagi dalam X detik"
- [ ] Countdown timer memperbarui setiap detik
- [ ] Input bar disabled selama cooldown
- [ ] Setelah countdown selesai, input auto-enable
- [ ] Request berikutnya berhasil

**Untuk testing dengan injection (dev mode):**

Tambahkan temporary log di `src/app/api/chat/route.ts`:

```typescript
// TEMPORARY: inject 429 after 10 requests (REMOVE AFTER TESTING)
const testCount = parseInt(
  req.headers.get('x-test-count') || '0'
);
if (testCount >= 10) {
  return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '10' },
  });
}
```

---

### [ ] Test 4: JSON Malformed dari Tool Call

**Target:** `ToolError`, variant detection, `handleRetryTool`

**Langkah:**
1. Inject malformed JSON via mock tool executor di `src/app/api/chat/route.ts`:

```typescript
// TEMPORARY: inject malformed tool result (REMOVE AFTER TESTING)
if (messages.at(-1)?.content.includes('score malformed')) {
  return new Response(
    'data: {"tool_call":{"toolName":"score_lead","args":{}},"error":"Unexpected token"}\n',
    { headers: { 'Content-Type': 'text/event-stream' } }
  );
}
```
2. Kirim pesan: "Score malformed test: companyX, tech, 50 employees"
3. Perhatikan response

**Ekspektasi:**
- [ ] `ToolError` component tampil dengan variant `unknown`
- [ ] Retry button terlihat
- [ ] Klik retry → tool di-re-execute
- [ ] No crash / no blank screen

---

### [ ] Test 5: First-Run Empty State

**Target:** Empty state, prompt starters, interactive onboarding

**Langkah:**
1. Clear local storage: `localStorage.clear()`
2. Buka `/chat/new` di private/incognito window
3. Pastikan tidak ada message (fresh state)

**Ekspektasi:**
- [ ] Animated bot avatar tampil dengan float animation
- [ ] Heading "How can I help you today?" terlihat
- [ ] 4 prompt starter buttons tampil dalam grid
- [ ] Klik prompt starter → textarea terisi + auto-submit
- [ ] Conversation stream mulai tanpa perlu user tekan Enter
- [ ] Tidak ada loading spinner (streaming sudah dimulai)

---

### [ ] Test 6: iOS Safari Mobile (atau DevTools Device Mode)

**Target:** 100dvh, keyboard handling, safe area

**Langkah (DevTools):**
1. DevTools → Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
2. Pilih **iPhone 15 Pro** atau **iOS Safari**
3. Buka `/chat/new`
4. Ketik pesan panjang → aktifkan keyboard
5. Observe: apakah input bar terlihat / tertekan keyboard?

**Ekspektasi:**
- [ ] Viewport tidak "jump" saat halaman load
- [ ] Input bar tetap terlihat di atas keyboard
- [ ] Keyboard dismiss → layout kembali normal tanpa glitch
- [ ] Safe area inset bottom terlihat (home indicator area)

---

## 7. Deliverables & Checkpoint 1 Checklist

### 7.1 Deliverables

| Deliverable | Format | Keterangan |
|---|---|---|
| Dokumen ini | `docs/FE-08-RESILIENCE_AND_SECURITY_REQUIREMENTS.md` | Spesifikasi teknis lengkap |
| Happy Path recording | Video MP4 / GIF / Screenshots | Console bersih, no errors |
| Failure State recordings | Minimal 2 video/screenshot | Mid-stream disconnect + Rate limit |
| Source code | Pull Request | Semua komponen yang dibuat/dimodifikasi |

### 7.2 Checkpoint 1 Criteria

**Functional Requirements:**

- [ ] `src/app/chat/error.tsx` dibuat dan berfungsi (test: throw new Error di console, verify boundary catches it)
- [ ] Error toast auto-dismiss setelah 5000ms
- [ ] Retry hanya retry pesan terakhir (verify: kirim 3 pesan, error di pesan ke-3, cek pesan 1 & 2 tetap ada)
- [ ] `handleRegenerate` tidak reset seluruh conversation
- [ ] `handleRetryTool` tidak duplikat pesan (verify: cek message count sebelum dan sesudah retry)
- [ ] Empty state dengan prompt starters berfungsi (klik → textarea terisi → auto-submit)
- [ ] Skeleton loading untuk initial chat fetch (bukan spinner)
- [ ] `visualViewport` keyboard handling terimplementasi di `ChatInput.tsx`
- [ ] CSS `100dvh` / `.chat-layout` diterapkan di main container

**Non-Functional Requirements:**

- [ ] Zero console errors pada Happy Path (buka `/chat/new`, kirim 3 pesan, verify console)
- [ ] Build succeeds: `npm run build` tanpa TypeScript errors
- [ ] Framer Motion animations: reduced-motion respected (`prefers-reduced-motion: reduce`)
- [ ] Accessibility: semua interactive element punya `aria-label`, focus ring visible

**Performance Requirements:**

- [ ] CLS = 0 pada initial load dan first streaming message (ukur di Lighthouse)
- [ ] Skeleton → real content transition tidak menyebabkan reflow
- [ ] `contain: layout style` pada scroll container (sudah ada — verify tidak dihapus)

### 7.3 Files Reference Summary

| File | Action | Alasan |
|---|---|---|
| `docs/FE-08-RESILIENCE_AND_SECURITY_REQUIREMENTS.md` | **Create** | Dokumen utama tugas |
| `src/components/chat/EmptyState.tsx` | **Create** | Reusable empty state dengan prompt starters |
| `src/components/chat/ChatSkeleton.tsx` | **Create** | Zero-CLS skeleton untuk message list |
| `src/app/chat/error.tsx` | **Create** | Route-level error boundary |
| `src/app/chat/[id]/page.tsx` | **Modify** | Integrate `ChatSkeleton`, apply `chat-layout` class |
| `src/components/chat/ChatUI.tsx` | **Modify** | Integrate `EmptyState`, `visualViewport` handler |
| `src/components/chat/ChatInput.tsx` | **Modify** | Add `visualViewport` keyboard handling |
| `src/app/globals.css` | **Modify** | Add `.chat-layout`, `.chat-input-offset` CSS rules |

### 7.4 Existing Patterns to Reuse

Pola-pola berikut **sudah ada** di codebase — jangan ditulis ulang:

| Pola | Lokasi | Digunakan Untuk |
|---|---|---|
| `onError` callback | `ChatUI.tsx:160` | Primary stream error handling |
| `handleRegenerate` | `ChatUI.tsx:302` | Retry last failed message |
| `handleRetryTool` | `ChatUI.tsx:323` | Retry tool call |
| `ToolError` component | `ToolError.tsx` | Tool error UI dengan variant detection |
| `ToolLoading` shimmer | `ToolLoading.tsx` | Tool execution skeleton |
| `ThinkingIndicator` | `ThinkingIndicator.tsx` | First-token latency indicator |
| `JumpToLatest` | `JumpToLatest.tsx` | Scroll-to-bottom FAB |
| Rate limiter | `lib/rate-limit.ts` | Upstash Redis 10 req/10s |
| `logger.error` | `lib/logger.ts` | Structured error logging |
| `cn()` utility | `lib/utils.ts` | Class name merging |
| `safe-area-inset-bottom` | `globals.css:408` | iOS home indicator padding |
| `animate-shimmer` | `globals.css:321` | Skeleton shimmer animation |

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-08-08 | Initial draft — targeting FE-08 implementation |
