---
layer: 2
name: UX Audit
tier: 1
purpose: Memastikan pengalaman pengguna terasa seamless, cepat, dan natural selama streaming.
cross_layers: [1, 3, 5]
spec_ref: requirements.md#2-functional-requirements, requirements.md#3-non-functional-requirements
---

# Layer 2: UX Audit

**Tier:** 1 (Mission Critical)
**Purpose:** Memastikan pengalaman pengguna (UX) terasa seamless, cepat, dan natural selama streaming token-by-token.

---

## 2.1 Smart Auto-Scroll

### Behavior Definition

```
Initial State: Pinned to bottom
During Streaming: Pinned to bottom (always show latest token)
User Scrolls Up: UNPIN immediately, show "Jump to latest"
User Clicks "Jump to Latest": Re-pin + smooth scroll to bottom
New Message Starts: If pinned → smooth scroll to new bottom
```

### Implementation Logic (Pseudocode)

```typescript
const [isPinned, setIsPinned] = useState(true);

// On scroll event (scroll container)
const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = container;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

  // If user scrolled up more than 50px from bottom → unpin
  if (distanceFromBottom > 50) {
    setIsPinned(false);
  } else {
    setIsPinned(true);
  }
};

// On new streaming text
useEffect(() => {
  if (isPinned && messagesRef.current) {
    container.scrollTop = container.scrollHeight;
  }
}, [streamingText, isPinned]);
```

### Edge Cases
- **Rapid scrolling:** Debounce scroll handler (16ms / 1 frame)
- **Multiple messages:** Always pin to latest message's bottom
- **Mobile touch:** Swipe-down gesture should NOT unpin (only scroll gesture up)
- **Keyboard navigation:** Tab/scroll keys behave same as mouse scroll

### "Jump to Latest" Button Trigger
- Appears when: `!isPinned && (hasNewMessages || isStreaming)`
- Hidden when: `isPinned` OR no new content
- Animation: fade-in 200ms, subtle shadow pulse

---

## 2.2 Token-by-Token Streaming Feedback

### Time to First Token (TTFB) Optimization
- TTFB target: < 500ms (tergantung provider + network)
- Between submit and TTFB: Show Thinking Indicator
- On first token: Immediately replace Thinking → text (no delay)

### Visual Continuity
- NO white flash between Thinking → text
- NO layout shift (content height should pre-allocate space)
- Token text appears at same position where Thinking was

### Rendering Strategy
```typescript
// Correct: Pre-render container, swap content
<div className="min-h-[24px]">  {/* Reserve space */}
  {isLoading && !text ? <ThinkingIndicator /> : null}
  {text && <MarkdownRenderer content={text} />}
</div>

// Wrong: Conditional render causing layout shift
{isLoading ? <ThinkingIndicator /> : <MarkdownRenderer />}
```

---

## 2.3 Input Feedback & Affordance

### Auto-expanding Textarea
```typescript
const adjustHeight = () => {
  const textarea = ref.current;
  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT);
  textarea.style.height = `${newHeight}px`;
};
```
- MIN height: 1 row
- MAX height: ~5 rows (after that → scrollable)
- Smooth height transition

### Submit Button State
- Disabled state: grayed out, `cursor: not-allowed`
- Loading state: spinner icon + "Stop" label
- Active state: brand color, subtle hover effect

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Enter` | Submit message |
| `Shift + Enter` | New line in textarea |
| `Escape` | Stop generation (if streaming) |
| `Ctrl/Cmd + K` | Focus input (global) |

---

## 2.4 Error State UX

### LLM Provider Failure
- Timeout (> 30s): Show error toast "Response took too long. Please try again."
- API error: Show error toast with generic message (don't expose internal details)
- Rate limit hit: Show "Too many requests. Please wait a moment."

### Error Message Placement
- Toast notification (top-right atau bottom-center)
- Non-blocking (user tetap bisa retry)
- Auto-dismiss after 5 seconds
- Manual dismiss via X button

### Partial Save on Error
- If stream was interrupted by error AFTER partial text:
  - Partial text MUST be saved to database
  - User should see the partial text in chat
  - Error toast explains what happened

---

## 2.5 Performance UX

### 60fps Target During Streaming
- No layout thrashing during token append
- Use CSS `contain: layout style` on message list
- Avoid reflow-triggering properties in streaming loop
- Virtualization: NOT needed for typical chat length (< 1000 messages)

### Loading States
| State | Visual |
|-------|--------|
| Initial page load | Skeleton loading for messages |
| Sending message | Input disabled + Stop button |
| Receiving stream | Tokens appearing + Thinking indicator gone |
| Stream complete | Stop → Send button |
| Stream error | Error toast + partial text visible |

---

## 2.6 Motion & Transitions

### Choreographed Entrances
- New message: `opacity: 0 → 1`, `translateY: 8px → 0`, 200ms ease-out
- Button toggle: `scale: 0.95 → 1`, 100ms
- Error toast: `opacity: 0 → 1`, `translateX: 20px → 0`, 200ms

### Thinking → Text Transition
```css
/* Correct: Cross-fade without layout shift */
.thinking-indicator {
  transition: opacity 150ms ease-out;
}
.chat-message {
  transition: opacity 150ms ease-out;
}
/* Both render simultaneously during transition */
```

---

## Acceptance Criteria

- [ ] Auto-scroll pins to bottom during streaming
- [ ] Auto-scroll releases when user scrolls up manually
- [ ] "Jump to latest" button appears when unpinned
- [ ] "Jump to latest" smoothly scrolls to bottom on click
- [ ] Thinking indicator transitions to text without flicker/shift
- [ ] TTFB < 500ms (with proper Thinking indicator bridging)
- [ ] Textarea auto-expands up to 5 rows
- [ ] Enter submits, Shift+Enter adds newline
- [ ] Escape stops generation
- [ ] Error states show toast without blocking UI
- [ ] Partial text saved on stream interruption
- [ ] 60fps maintained during streaming
- [ ] `prefers-reduced-motion` respected
