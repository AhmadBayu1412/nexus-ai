'use client';

/**
 * ChatInput Component
 *
 * Premium auto-expanding textarea with:
 * - Floating glassmorphism container
 * - Framer Motion morphing send ↔ stop button
 * - Sticky at bottom with safe-area padding
 * - 44x44px minimum tap targets
 * - Model selector pill
 * - Indonesian placeholder
 */

import { useRef, useEffect, useState, KeyboardEvent, FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  onStop: () => void;
}

const MAX_HEIGHT = 200;
const MIN_HEIGHT = 24;

const MAX_INPUT_LENGTH = 4000;

export function ChatInput({ input, setInput, onSubmit, isLoading, onStop }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = newHeight >= MAX_HEIGHT ? 'auto' : 'hidden';
  }, [input]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ── iOS Safari Virtual Keyboard Handling ────────────────────────────────────
  // visualViewport API (iOS Safari 16+) memberikan tinggi viewport actual
  // saat keyboard terbuka. Fallback: scrollIntoView untuk browser lain.
  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;

    let rafId: number | null = null;

    const handleViewportChange = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!vp) return;
        const keyboardHeight = window.innerHeight - vp.height - (vp.offsetTop || 0);
        if (keyboardHeight > 0) {
          document.documentElement.style.setProperty('--kb-offset', `${keyboardHeight}px`);
        } else {
          document.documentElement.style.setProperty('--kb-offset', '0px');
        }
      });
    };

    vp.addEventListener('resize', handleViewportChange);
    vp.addEventListener('scroll', handleViewportChange);

    return () => {
      vp.removeEventListener('resize', handleViewportChange);
      vp.removeEventListener('scroll', handleViewportChange);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Fallback scrollIntoView saat focus tanpa visualViewport
  const handleFocus = () => {
    if (!window.visualViewport && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && input.length <= MAX_INPUT_LENGTH && !isLoading) {
        formRef.current?.requestSubmit();
      }
    }
    if (e.key === 'Escape' && isLoading) {
      e.preventDefault();
      onStop();
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || input.length > MAX_INPUT_LENGTH || isLoading) return;
    setSubmitting(true);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSubmit(e);
    setTimeout(() => setSubmitting(false), 100);
  };

  const handleStop = () => {
    if (isLoading) onStop();
  };

  const canSubmit = input.trim().length > 0 && input.length <= MAX_INPUT_LENGTH && !isLoading;

  return (
    <div className="relative">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="
          sticky bottom-0 z-10
          w-full
          px-3 pb-3 pt-2
          safe-area-inset-bottom
          chat-input-offset
        "
      >
        {/* Floating glass container */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: 'rgba(255, 253, 248, 0.96)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(44, 42, 38, 0.10)',
          }}
        >
          {/* Inner border */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(44, 42, 38, 0.05)',
            }}
          />

          <div className="flex items-end gap-2 px-3 py-2.5">
            {/* Textarea */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                maxLength={MAX_INPUT_LENGTH}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                placeholder="Ketik pesan..."
                disabled={isLoading}
                rows={1}
                style={{ minHeight: `${MIN_HEIGHT}px`, color: 'var(--text-primary)' }}
                className="w-full resize-none bg-transparent px-1 py-1.5 pr-2 placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-base leading-relaxed scrollbar-thin"
                aria-label="Chat input"
              />
            </div>

            {/* Send / Stop Button — morphing animation */}
            <div className="flex-shrink-0 flex items-end pb-0.5">
              <button
                type={isLoading ? 'button' : 'submit'}
                onClick={isLoading ? handleStop : undefined}
                disabled={!canSubmit && !isLoading && !submitting}
                className={cn(
                  'relative flex-shrink-0',
                  'w-11 h-11 rounded-xl',
                  'flex items-center justify-center',
                  'transition-all duration-150',
                  'focus-ring btn-press',
                  'min-w-[44px] min-h-[44px]', // accessibility
                  isLoading
                    ? 'text-white shadow-lg bg-[#4A6B7C]'
                    : canSubmit
                      ? 'text-white shadow-lg'
                      : 'text-white/30 cursor-not-allowed'
                )}
                style={{
                  pointerEvents: 'auto',
                  cursor: (!canSubmit && !isLoading && !submitting) ? 'not-allowed' : 'pointer',
                  ...(canSubmit && !isLoading
                    ? {
                        background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)',
                      }
                    : {}),
                }}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                ) : (
                  <ArrowUp className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row: model pill + character counter + shortcut hints */}
        <div className="flex items-center justify-between mt-1.5 px-1">
          {/* Model selector pill */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,253,248,0.95)', border: '1px solid rgba(44,42,38,0.14)', color: 'var(--text-secondary)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#5C7A5E' }} />
              <span>Sonnet 5</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Input Caps Counter Indicator when user types lengthy content */}
            {input.length >= 3000 && (
              <span
                className={cn(
                  'text-xs font-mono transition-colors',
                  input.length >= 3800 ? 'text-rose-600 font-semibold' : 'text-amber-700'
                )}
                aria-live="polite"
              >
                {input.length}/{MAX_INPUT_LENGTH}
              </span>
            )}

            {/* Keyboard shortcut hint */}
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ background: 'rgba(255,253,248,0.95)', border: '1px solid rgba(44,42,38,0.12)', color: 'var(--text-primary)' }}>Enter</kbd>
              {' '}kirim
              <span className="mx-1.5" style={{ color: 'var(--text-muted)' }}>·</span>
              <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ background: 'rgba(255,253,248,0.95)', border: '1px solid rgba(44,42,38,0.12)', color: 'var(--text-primary)' }}>Shift+Enter</kbd>
              {' '}baris baru
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
