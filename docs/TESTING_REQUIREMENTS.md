# 📄 ARCHITECTURE DECISION RECORD (ADR) & TESTING REQUIREMENTS
**Context:** FE-09 Testing Pass (Frontend AI Engineering)  
**Objective:** Establish an automated testing safety net for AI-assisted development.  
**Target Application:** AI Chatbot Interface (Next.js / React)  

## 🏗️ 1. Tech Stack
- [x] **Unit/Component Tests:** Vitest + React Testing Library (RTL) + `@testing-library/jest-dom`
- [x] **End-to-End (E2E) Tests:** Playwright (`@playwright/test`)
- [x] **CI/CD:** GitHub Actions (`.github/workflows/test.yml`)

## 🛑 2. IRONCLAD RULES (ATURAN KETAT UNTUK AI)
You, the AI Assistant, MUST follow these rules when generating test code:

1. [x] **NO REAL AI API CALLS:** Never trigger real network requests to OpenAI/Anthropic/LLM providers. You MUST mock all AI streams and route handlers.
2. [x] **ACCESSIBILITY-FIRST SELECTORS ONLY:**
   - **DO NOT** use `data-testid`.
   - **DO NOT** use CSS class selectors (e.g., `.chat-bubble`, `#submit-btn`). Renaming a Tailwind class must not break the test!
   - **MUST USE:** `getByRole`, `getByLabelText`, `getByText`, or `findByRole`. Test the UI exactly how a screen reader or human user interacts with it.
3. [x] **ISOLATION:** Mock functions (`vi.fn()`) for form submissions and external hooks where necessary.

---

## 🧪 3. COMPONENT TESTS SPECIFICATION (VITEST + RTL)
Write at least **6 Unit/Component Tests** covering the following mandatory scenarios. Place them in `__tests__` or alongside the components (e.g., `ChatRenderer.test.tsx`).

### A. Chat Message Renderer (Minimum 4 Tests)
Component: The UI that renders user and AI messages.
- [x] 1. **Pending State Test:**
  - *Condition:* Waiting for the first token.
  - *Expectation:* Render a thinking indicator / loading skeleton. Find it via `getByRole('status')` or accessible text (e.g., "AI is thinking...").
- [x] 2. **Streaming State Test:**
  - *Condition:* Receiving partial text chunks.
  - *Expectation:* Render the text progressively. Ensure Markdown elements (like `p`, `strong`, `code`) are correctly parsed and rendered in the DOM.
- [x] 3. **Error State Test:**
  - *Condition:* Stream is interrupted or API throws a 500/offline error.
  - *Expectation:* Render a visual error message AND a functional "Retry" button (`getByRole('button', { name: /retry/i })` or `getByRole('button', { name: /try again/i })`).
- [x] 4. **Markdown & Part Types Test:**
  - *Condition:* Message contains code blocks or lists.
  - *Expectation:* Code blocks are rendered properly (findable via `code` or `pre` roles or matching text tokens).

### B. Validated Form (Minimum 1 Test)
Component: The Chat Input Form.
- [x] 5. **Form Validation Test:**
  - *Condition 1 (Empty):* User submits without typing. *Expectation:* Submit button is disabled OR an error message appears. Handler is NOT called.
  - *Condition 2 (Valid):* User types text and submits. *Expectation:* Form submission handler (`onSubmit`) is called with the correct text.

### C. Generative UI Tool Result (Minimum 1 Test)
Component: The UI component that renders structured data from an AI Tool Call (e.g., LeadScoreCard, Weather Widget).
- [x] 6. **Tool Call Render Test:**
  - *Condition:* Pass mock structured JSON data (e.g., `{ score: 85, reason: "Good lead" }`) as props to the tool component.
  - *Expectation:* The component correctly maps and displays the mock data in the UI (e.g., `getByText('85')`, `getByText(/Hot Lead/i)`).

---

## 🎭 4. END-TO-END TEST SPECIFICATION (PLAYWRIGHT)
Create `tests/primary-flow.spec.ts`. This test must walk through the primary happy path of the application.

**E2E Scenario:**
- [x] 1. **Navigate:** Open the chat page (`/` or `/chat`).
- [x] 2. **Input:** Locate the chat input via `getByRole('textbox')` and type "Hello AI".
- [x] 3. **Submit:** Click the send button via `getByRole('button', { name: /send/i })`.
- [x] 4. **Network Intercept (CRITICAL):** Use `page.route('/api/chat', ...)` to intercept the POST request. DO NOT hit the real server. Return a mock Server-Sent Events (SSE) stream or a mock JSON response.
- [x] 5. **Assertion:** Wait for the mocked AI response to appear on the screen (`expect(page.getByText('Mocked AI reply')).toBeVisible()`).

---

## ⚙️ 5. CI PIPELINE SPECIFICATION
Create `.github/workflows/test.yml`.
The CI must block PRs/merges if tests fail.

**Workflow Steps:**
- [x] 1. Setup Node.js (v20).
- [x] 2. Install dependencies (`npm ci` or `pnpm install`).
- [x] 3. Run Component Tests: `npm run test` (Vitest).
- [x] 4. Install Playwright browsers: `npx playwright install --with-deps chromium`.
- [x] 5. Run E2E Tests: `npm run test:e2e` (Playwright).