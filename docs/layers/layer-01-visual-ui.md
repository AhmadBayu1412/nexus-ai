---
layer: 1
name: Visual UI
tier: 1
purpose: Mendifinisikan semua komponen antarmuka pengguna yang terlihat dan interaktif pada layar chat.
cross_layers: [2, 4]
spec_ref: requirements.md#5-ui-ux-requirements, requirements.md#2-functional-requirements
---

# Layer 1: Visual UI

**Tier:** 1 (Mission Critical)
**Purpose:** Mendefinisikan semua komponen UI visual yang dilihat dan diinteraksi pengguna.

---

## 1.1 Komponen Utama

### Sidebar (Chat History)
- Berada di sisi kiri layar
- Menampilkan daftar percakapan sebelumnya milik user
- Setiap item menampilkan: chat title, timestamp
- Klik item → navigasi ke `/chat/[id]`
- Tombol "New Chat" di bagian atas sidebar
- Responsif: collapsible di mobile (hamburger menu)

### Main Chat Area
- Area tengah layar untuk menampilkan pesan
- Message list: scrollable container
- Setiap pesan dibungkus `<ChatMessage />` component
- User message: right-aligned, menggunakan brand color background
- Assistant message: left-aligned, neutral background
- Support markdown rendering via `react-markdown` + `remark-gfm`

### Chat Input
- `<textarea>` yang auto-expand berdasarkan konten
- Maximum height: ~5 baris (scrollable jika lebih)
- Sticky di bagian bawah layar (`position: sticky; bottom: 0`)
- Placeholder text: "Ask me anything..."
- Keyboard shortcut: `Enter` untuk submit, `Shift+Enter` untuk newline

### Submit / Stop Toggle Button
- Posisi: di samping kanan textarea
- Dua state:
  - **Send Mode:** Icon panah ke atas / "Send" label → trigger submit
  - **Stop Mode:** Icon stop / "Stop" label → trigger `stop()` dari useChat
- Toggle berdasarkan state `isLoading || isStreaming`
- Choreographed entrance animation (scale + fade)
- Respect `prefers-reduced-motion`

### Thinking Indicator
- Muncul SEBELUM token pertama arrives (antara submit dan TTFB)
- Representasi visual: animated dots atau spinner
- Smooth transition → hilang saat text mulai streaming
- NO flickering atau layout shift saat berganti ke real text
- Implement via conditional render di message list

### Scroll-to-Bottom Affordance
- "Jump to latest" button muncul di bottom-right area scroll
- Muncul HANYA ketika user scroll up dan ada pesan baru
- Animasi: fade-in, subtle pulse
- Klik → smooth scroll ke bottom + dismiss button

---

## 1.2 Styling & Visual Language

- **Framework:** Tailwind CSS
- **Color Scheme:**
  - User bubble: brand primary color (customizable)
  - Assistant bubble: neutral gray scale
  - Input area: elevated surface (subtle shadow/border)
  - Sidebar: slightly darker / muted background
- **Typography:**
  - Sans-serif font stack (system default atau custom)
  - Code blocks: monospace font, syntax highlighting
- **Spacing:**
  - Consistent padding (16px / 24px)
  - Gap antar pesan: 12px
- **Border Radius:**
  - Message bubbles: rounded-xl
  - Buttons: rounded-lg
  - Input: rounded-xl

---

## 1.3 Mobile Responsiveness

- Full-width chat area di mobile
- Sidebar: slide-in drawer di mobile (overlay)
- Input area: sticky bottom, respects mobile browser toolbar
- Gunakan `dvh` (dynamic viewport height) unit untuk menghindari iOS Safari toolbar issues
- Breakpoints: mobile-first approach
  - `< 768px`: Sidebar as drawer
  - `>= 768px`: Sidebar always visible

---

## 1.4 Motion & Animation

- **Entrance:** New messages fade-in + slide-up (150-200ms)
- **Button toggle:** Scale transition (100ms ease-out)
- **Scroll:** Smooth scroll-behavior
- **Thinking → Text:** Cross-fade (no layout shift)
- **Respect:** `prefers-reduced-motion` → disable all animations

---

## 1.5 Safe Markdown Rendering

- Gunakan `react-markdown` dengan `remark-gfm`
- Cakupkan: headings, bold, italic, lists, code blocks, inline code, links
- Prevents broken layouts dari unclosed markdown tags
- Code blocks: horizontal scroll jika overflow

---

## Acceptance Criteria

- [ ] Sidebar menampilkan chat history dengan title + timestamp
- [ ] User message right-aligned dengan brand color
- [ ] Assistant message left-aligned dengan neutral color
- [ ] Textarea auto-expand hingga max 5 baris
- [ ] Submit/Stop button toggle berfungsi sesuai isLoading state
- [ ] Thinking indicator muncul dan cross-fade ke text tanpa flicker
- [ ] "Jump to latest" button muncul saat user scroll up
- [ ] Layout responsif dan functional di mobile (dvh-aware)
- [ ] Markdown rendering aman (code blocks, lists, etc)
- [ ] `prefers-reduced-motion` respected
