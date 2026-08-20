import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from '@/components/chat/ChatInput';

describe('ChatInput Form Validation Test', () => {
  // Test 5: Form Validation Test
  it('5. Form Validation: disables submit button on empty input and triggers onSubmit with text when valid', () => {
    const handleSetInput = vi.fn();
    const handleSubmit = vi.fn((e) => e.preventDefault());
    const handleStop = vi.fn();

    // Condition 1: Empty input
    const { rerender } = render(
      <ChatInput
        input=""
        setInput={handleSetInput}
        onSubmit={handleSubmit}
        isLoading={false}
        onStop={handleStop}
      />
    );

    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeDisabled();

    const inputArea = screen.getByRole('textbox', { name: /chat input/i });
    fireEvent.change(inputArea, { target: { value: '  ' } });
    expect(handleSetInput).toHaveBeenCalledWith('  ');

    // Attempt to submit empty form
    fireEvent.submit(inputArea.closest('form')!);
    expect(handleSubmit).not.toHaveBeenCalled();

    // Condition 2: Valid input
    rerender(
      <ChatInput
        input="Hello AI, evaluate lead Gojek"
        setInput={handleSetInput}
        onSubmit={handleSubmit}
        isLoading={false}
        onStop={handleStop}
      />
    );

    const enabledSubmitButton = screen.getByRole('button', { name: /send message/i });
    expect(enabledSubmitButton).not.toBeDisabled();

    // Submit valid form
    fireEvent.submit(enabledSubmitButton.closest('form')!);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });
});
