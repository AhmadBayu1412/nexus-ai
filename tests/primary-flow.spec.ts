import { test, expect } from '@playwright/test';

test.describe('Primary Chat Flow E2E', () => {
  test('should submit message and receive mocked AI response via intercepted network call', async ({ page }) => {
    // 4. Network Intercept (CRITICAL): Intercept POST to /api/chat
    await page.route('**/api/chat', async (route) => {
      const mockStream = `0:"Mocked AI reply"\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        headers: {
          'x-vercel-ai-ui-stream': 'v1',
        },
        body: mockStream,
      });
    });

    // 1. Navigate to chat page
    await page.goto('/chat');

    // 2. Input message via accessible role
    const chatInput = page.getByRole('textbox', { name: /chat input/i });
    await chatInput.fill('Hello AI');

    // 3. Submit message via accessible button role
    const sendButton = page.getByRole('button', { name: /send message/i });
    await sendButton.click();

    // 5. Assertion: Wait for mocked AI response to appear on screen
    await expect(page.getByText('Mocked AI reply')).toBeVisible();
  });
});
