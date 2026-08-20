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
      if (input.trim() && !isLoading) {
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
    if (!input.trim() || isLoading) return;
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

  const canSubmit = input.trim().length > 0 && !isLoading;

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
              <motion.button
                type={isLoading ? 'button' : 'submit'}
                onClick={isLoading ? handleStop : undefined}
                disabled={!canSubmit && !isLoading && !submitting}
                className={cn(
                  'relative flex-shrink-0',
                  'w-11 h-11 rounded-xl',
                  'flex items-center justify-center',
                  'transition-all duration-200',
                  'focus-ring btn-press',
                  'min-w-[44px] min-h-[44px]', // accessibility
                  isLoading
                    ? 'text-white shadow-lg'
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
                    : isLoading
                      ? {
                          background: '#4A6B7C',
                        }
                      : {}),
                }}
                aria-label={isLoading ? 'Stop generation' : 'Send message'}
                whileHover={
                  shouldReduceMotion || (!canSubmit && !isLoading)
                    ? {}
                    : { scale: 1.06, filter: 'brightness(1.10)' }
                }
                whileTap={isLoading || canSubmit ? { scale: 0.92 } : {}}
                transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isLoading ? (
                    <motion.div
                      key="stop"
                      initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="send"
                      initial={{ scale: 0.5, opacity: 0, y: 4 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{ scale: 0.5, opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <ArrowUp
                        className={cn(
                          'w-4 h-4',
                          canSubmit && 'animate-bounce-subtle'
                        )}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom row: model pill + shortcut hints */}
        <div className="flex items-center justify-between mt-1.5 px-1">
          {/* Model selector pill */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]" style={{ background: 'rgba(255,253,248,0.90)', border: '1px solid rgba(44,42,38,0.10)', color: 'var(--text-muted)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#5C7A5E' }} />
              <span>Sonnet 5</span>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'rgba(255,253,248,0.90)', color: 'var(--text-secondary)' }}>Enter</kbd>
            {' '}kirim
            <span className="mx-1.5" style={{ color: '#C8C5BC' }}>·</span>
            <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'rgba(255,253,248,0.90)', color: 'var(--text-secondary)' }}>Shift+Enter</kbd>
            {' '}baris baru
          </p>
        </div>
      </form>
    </div>
  );
}
