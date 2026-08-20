import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThinkingIndicator } from '@/components/chat/ThinkingIndicator';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ToolError } from '@/components/chat/ToolError';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

describe('Chat Message Renderer Tests', () => {
  // Test 1: Pending State Test
  it('1. Pending State: renders thinking indicator when waiting for first token', () => {
    render(<ThinkingIndicator />);
    expect(screen.getByText(/AI is thinking/i)).toBeInTheDocument();
  });

  // Test 2: Streaming State Test
  it('2. Streaming State: renders partial text chunks and markdown elements progressively', () => {
    const mockStreamingMessage: ChatMessageType = {
      id: 'msg-stream-1',
      role: 'assistant',
      content: 'Hello! **I am streaming** a response...',
      createdAt: new Date().toISOString(),
    };

    render(<ChatMessage message={mockStreamingMessage} isStreaming={true} />);

    // Text content check
    expect(screen.getByText(/Hello!/i)).toBeInTheDocument();
    // Strong tag rendered via ReactMarkdown
    expect(screen.getByText('I am streaming')).toBeInTheDocument();
  });

  // Test 3: Error State Test
  it('3. Error State: renders visual error message and functional retry button', () => {
    const handleRetry = vi.fn();
    render(
      <ToolError
        message="Request timeout: Server failed to respond"
        onRetry={handleRetry}
        toolName="scoreLeadTool"
      />
    );

    // Visual error description check
    expect(screen.getByText(/Request timeout/i)).toBeInTheDocument();

    // Accessible retry button check
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    // Trigger retry
    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  // Test 4: Markdown & Part Types Test
  it('4. Markdown & Part Types: renders code blocks properly', () => {
    const mockCodeMessage: ChatMessageType = {
      id: 'msg-code-1',
      role: 'assistant',
      content: 'Here is some code:\n```js\nconsole.log("hello world");\n```',
      createdAt: new Date().toISOString(),
    };

    render(<ChatMessage message={mockCodeMessage} isStreaming={false} />);

    // Renders the code content tokens (SyntaxHighlighter tokenizes the text)
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
  });
});
