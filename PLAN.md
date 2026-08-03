# Plan: Claude-like Chat UI Layout

## Context

Styling the chat UI to match Claude's interface (dark theme, glassmorphism, thinking display, feedback buttons) without touching stable backend logic (Firebase auth, KoboLLM streaming, Firestore persistence).

## User Requirements
- **Reasoning display**: Show actual AI reasoning text if API supports it
- **Like/Dislike**: Store in Firestore (persistent)
- **Instruct button**: Hidden from chat history (system-level instruction)
- **Copy, Regenerate buttons**: Per-message action bar
- **Claude-like visual style**: Dark, glassmorphism, clean sidebar

---

## Implementation Steps

### Step 1: Add Types (`src/types/chat.ts`)

```ts
export interface MessageFeedback {
  type: 'like' | 'dislike';
  timestamp: number;
}

export interface ChatMessageExtended extends ChatMessage {
  reasoning?: string;
  feedback?: MessageFeedback;
}
```

### Step 2: Update API Route (`src/app/api/chat/route.ts`)

- Add `reasoning` field extraction from `onFinish` callback
- Save `reasoning` to Firestore alongside message
- Try: Check if `onFinish({ reasoning })` is populated from KoboLLM
- Modify `saveChatAndMessages` to accept `reasoning` param

### Step 3: Update Firestore Queries (`src/lib/db/queries.ts`)

- Add `updateMessageFeedback(chatId, messageId, feedback)` function
- Update `saveChatAndMessages` to store `reasoning` field on assistant message

### Step 4: Update ChatMessage Component (`src/components/chat/ChatMessage.tsx`)

**New action bar (assistant messages, visible on hover):**
- **Copy** — clipboard copy with "Copied!" feedback
- **Thumbs Up / Thumbs Down** — toggle, call Firestore, active = indigo fill
- **Regenerate** — trigger parent re-submit handler
- **Instruct** — open floating textarea popup below message

**Reasoning block (above response, collapsible):**
```tsx
{reasoning ? (
  <div className="reasoning-block glass rounded-lg p-3 mb-3 border border-white/5">
    <div className="flex items-center gap-2 text-xs text-indigo-400 mb-2">
      <SparklesIcon className="w-3 h-3" />
      <span>Thinking</span>
    </div>
    <p className="text-xs text-gray-400 font-mono whitespace-pre-wrap">{reasoning}</p>
  </div>
) : (
  <ThinkingIndicator />
)}
```

**Instruct popup:**
- Small textarea appears below message on button click
- Submit sends hidden instruction as user message (marked `hidden: true` in metadata)
- UI filters out `hidden: true` messages from rendering

### Step 5: Update ChatUI Component (`src/components/chat/ChatUI.tsx`)

- Extract reasoning from Vercel AI SDK stream (via `onFinish` or custom SSE event)
- Pass `onRegenerate` and `onInstruct` handlers to ChatMessage
- **Regenerate**: stop stream → remove last assistant msg → re-submit with stored input
- **Instruct**: append hidden user message → trigger send → model gets instruction context

### Step 6: Update ChatSidebar (`src/components/chat/ChatSidebar.tsx`)

- Clean chat list items: title + relative timestamp + hover
- Active chat: indigo left border highlight
- Delete button (trash icon) on hover with confirmation
- "Chat baru" gradient button at top
- Mobile: slide-in drawer with backdrop

### Step 7: Update ChatInput (`src/components/chat/ChatInput.tsx`)

- Model selector pill below input (e.g., "Sonnet 5 Sedang")
- Placeholder: "Ketik pesan..."
- Cmd/Ctrl + Enter to send

### Step 8: Update globals.css (`src/app/globals.css`)

New classes:
- `.reasoning-block` — reasoning display panel
- `.message-action-bar` — action buttons row
- `.message-action-btn` — glass icon button with hover
- `.thumbs-active` — active like/dislike (indigo fill)
- `.instruct-popup` — floating instruct textarea
- `.hidden-message` — display:none for instruct messages
- Sidebar item hover/active states

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/chat.ts` | Add MessageFeedback, reasoning/feedback fields |
| `src/app/api/chat/route.ts` | Extract + save reasoning to Firestore |
| `src/lib/db/queries.ts` | Add updateMessageFeedback, reasoning field |
| `src/components/chat/ChatMessage.tsx` | Action bar, reasoning block, instruct popup |
| `src/components/chat/ChatUI.tsx` | Reasoning handling, regenerate + instruct logic |
| `src/components/chat/ChatSidebar.tsx` | Cleaner list, delete on hover, mobile drawer |
| `src/components/chat/ChatInput.tsx` | Model pill, keyboard shortcut |
| `src/app/globals.css` | New CSS classes |

---

## Verification

1. `npm run dev` → open `/chat/new`
2. Send message → thinking dots appear during generation
3. After response → action bar appears on hover
4. Thumbs up → Firestore document updates with feedback
5. Instruct → hidden instruction sent, no visible message in chat
6. Regenerate → last response replaced with new one
7. Old chat → messages load with feedback state restored
8. Mobile sidebar collapses correctly
9. No console errors
