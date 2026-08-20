'use client';

/**
 * SmartButton Component
 *
 * Stateful FSM button: idle → loading → success/error → idle
 * Adapted to Nexus AI warm-neutral design system.
 *
 * Design decisions:
 * - Colors use CSS vars from globals.css (--brand-primary, --brand-secondary, --color-error)
 *   NOT Tailwind utilities, matching the project''s inline-style approach.
 * - variant="sidebar" targets dark sidebar context (white-tinted colors).
 * - useReducedMotion() disables translate/shake but preserves color + opacity fades.
 * - AnimatePresence mode="popLayout" ensures smooth icon+label swaps (no DOM flash).
 * - Shake on error: Framer Motion x keyframes, zeroed out if prefers-reduced-motion.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Send, Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonState = 'idle' | 'loading' | 'success' | 'error';

interface SmartButtonProps {
  /** Async function to call on click. Throw to trigger error state. */
  onClick?: () => Promise<void>;
  idleLabel?: string;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  className?: string;
  /**
   * "default" — warm-paper context (light background)
   * "sidebar" — dark sidebar context (inverted / white-tinted)
   */
  variant?: 'default' | 'sidebar';
  /**
   * Dev/test only: pin button to a specific state externally.
   * When set, internal FSM is bypassed.
   */
  forceState?: ButtonState;
  /** Milliseconds before auto-resetting from success. Default: 1800 */
  successResetMs?: number;
  /** Milliseconds before auto-resetting from error. Default: 2400 */
  errorResetMs?: number;
  /** Additional icon to show alongside idleLabel (defaults to Send) */
  idleIcon?: React.ReactNode;
  /** Show idle icon at all. Default: true */
  showIcon?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** Optional inline style overrides — merged on top of state-based colors. */
  style?: React.CSSProperties;
}

export function SmartButton({
  onClick,
  idleLabel = 'Chat baru',
  loadingLabel = 'Memuat...',
  successLabel = 'Berhasil!',
  errorLabel = 'Gagal. Coba lagi?',
  className = '',
  variant = 'default',
  forceState,
  successResetMs = 1800,
  errorResetMs = 2400,
  idleIcon,
  showIcon = true,
  disabled = false,
  type = 'button',
  style: styleProp,
}: SmartButtonProps) {
  const [internalState, setInternalState] = useState<ButtonState>('idle');
  const currentState = forceState ?? internalState;
  const shouldReduceMotion = useReducedMotion();

  const handleClick = async () => {
    if (currentState === 'loading' || disabled) return;
    if (!onClick) return;

    setInternalState('loading');
    try {
      await onClick();
      setInternalState('success');
      setTimeout(() => setInternalState('idle'), successResetMs);
    } catch {
      setInternalState('error');
      setTimeout(() => setInternalState('idle'), errorResetMs);
    }
  };

  // ── State-based inline styles ─────────────────────────────────────────────────
  const stateStyles: Record<ButtonState, React.CSSProperties> = variant === 'sidebar'
    ? {
        idle: {
          color: 'rgba(255,255,255,0.75)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
        },
        loading: {
          color: 'rgba(255,255,255,0.50)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'wait',
        },
        success: {
          color: 'rgba(255,255,255,0.90)',
          background: 'rgba(92,122,94,0.30)',
          border: '1px solid rgba(92,122,94,0.40)',
          cursor: 'pointer',
        },
        error: {
          color: '#fca5a5',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.25)',
          cursor: 'pointer',
        },
      }
    : {
        idle: {
          color: 'var(--user-bubble-text)',
          background: 'var(--brand-primary)',
          border: '1px solid rgba(74,107,124,0.4)',
          cursor: 'pointer',
        },
        loading: {
          color: 'var(--user-bubble-text)',
          background: 'var(--brand-primary)',
          border: '1px solid rgba(74,107,124,0.3)',
          opacity: 0.7,
          cursor: 'wait',
        },
        success: {
          color: 'var(--user-bubble-text)',
          background: 'var(--brand-secondary)',
          border: '1px solid rgba(92,122,94,0.5)',
          cursor: 'pointer',
        },
        error: {
          color: '#ffffff',
          background: 'var(--color-error)',
          border: '1px solid rgba(239,68,68,0.5)',
          cursor: 'pointer',
        },
      };

  // ── Shake animation (error state) ─────────────────────────────────────────────
  const shakeAnimation = {
    x: shouldReduceMotion ? 0 : [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.4, ease: 'easeInOut' as const },
  };

  const resolvedIcon = idleIcon ?? <Send className="h-4 w-4" aria-hidden="true" />;

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={currentState === 'loading' || disabled}
      animate={currentState === 'error' ? shakeAnimation : { x: 0 }}
      whileHover={
        shouldReduceMotion || currentState === 'loading' || disabled
          ? {}
          : {
              scale: 1.02,
              // Subtle brightness boost — GPU composited via filter (no layout)
              filter: 'brightness(1.08)',
            }
      }
      whileTap={
        shouldReduceMotion || currentState === 'loading' || disabled
          ? {}
          : { scale: 0.98 }
      }
      transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden',
        'rounded-xl px-3 py-2.5 text-sm font-medium',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variant === 'sidebar'
          ? 'focus-visible:ring-white/30 focus-visible:ring-offset-transparent'
          : 'focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-[var(--background)]',
        'disabled:cursor-not-allowed',
        className
      )}
      style={{ ...stateStyles[currentState], ...styleProp }}
      aria-live="polite"
      aria-busy={currentState === 'loading'}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {currentState === 'idle' && (
          <motion.span
            key="idle"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-2"
          >
            {showIcon && resolvedIcon}
            <span>{idleLabel}</span>
          </motion.span>
        )}

        {currentState === 'loading' && (
          <motion.span
            key="loading"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{loadingLabel}</span>
          </motion.span>
        )}

        {currentState === 'success' && (
          <motion.span
            key="success"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-2 font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{successLabel}</span>
          </motion.span>
        )}

        {currentState === 'error' && (
          <motion.span
            key="error"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-2 font-semibold"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>{errorLabel}</span>
            <RotateCcw className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
