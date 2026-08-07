'use client';

/**
 * ToolError Component
 *
 * Renders the `output error` state.
 * Designed to never crash — handles null/undefined/NetworkError/Timeout gracefully.
 * Includes an optional retry button.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type ErrorVariant = 'network' | 'timeout' | 'rate_limit' | 'unknown';

interface ToolErrorProps {
  /**
   * Raw error message from tool execution.
   * If undefined/null, renders a generic fallback message.
   */
  message?: string | null;
  /**
   * Optional retry callback. If provided, renders a retry button.
   */
  onRetry?: () => void;
  className?: string;
  toolName?: string;
}

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: ErrorVariant;
}

function detectVariant(message: string | null | undefined): ErrorConfig {
  if (!message) {
    return {
      icon: <AlertTriangleIcon />,
      title: 'Terjadi kesalahan',
      description: 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
      variant: 'unknown',
    };
  }
  const lower = message.toLowerCase();
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('econnrefused') || lower.includes('dns')) {
    return {
      icon: <WifiOffIcon />,
      title: 'Koneksi terputus',
      description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      variant: 'network',
    };
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout') || lower.includes('deadline')) {
    return {
      icon: <ClockIcon />,
      title: 'Request timeout',
      description: 'Server tidak merespons dalam waktu yang ditentukan. Coba lagi sebentar.',
      variant: 'timeout',
    };
  }
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many request')) {
    return {
      icon: <GaugeIcon />,
      title: 'Terlalu banyak permintaan',
      description: 'Batas request tercapai. Mohon tunggu sebentar sebelum mencoba lagi.',
      variant: 'rate_limit',
    };
  }
  return {
    icon: <AlertTriangleIcon />,
    title: 'Terjadi kesalahan',
    description: message || 'Terjadi kesalahan saat menjalankan tool. Silakan coba lagi.',
    variant: 'unknown',
  };
}

export function ToolError({ message, onRetry, className, toolName }: ToolErrorProps) {
  const [retrying, setRetrying] = useState(false);
  const config = detectVariant(message);

  const handleRetry = () => {
    if (!onRetry) return;
    setRetrying(true);
    onRetry();
    // Reset after a short delay even if parent doesn't clear it
    setTimeout(() => setRetrying(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex flex-col gap-0 rounded-2xl overflow-hidden w-fit', className)}
      style={{
        background: 'rgba(44, 42, 38, 0.92)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(239,68,68,0.20)',
        boxShadow: '0 0 32px rgba(239,68,68,0.08), 0 4px 20px rgba(0,0,0,0.20)',
        minWidth: 300,
        maxWidth: 440,
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2">
          {/* Tool badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: '#f87171' }}>
              {toolName === 'scoreLeadTool' ? 'score_lead' : toolName}
            </span>
          </div>

          {/* Error badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-xs font-semibold text-red-400">
              Error
            </span>
          </div>
        </div>
      </div>

      {/* Error body */}
      <div className="px-5 pb-5 flex flex-col items-center gap-4 text-center">
        {/* Animated icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.18)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={config.variant}
              initial={{ opacity: 0, rotate: -10 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 10 }}
              transition={{ duration: 0.15 }}
            >
              {config.icon}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold" style={{ color: '#F2EFE6' }}>
            {config.title}
          </h3>
          <p className="text-sm leading-relaxed max-w-[320px]" style={{ color: '#9E9B94' }}>
            {config.description}
          </p>
        </div>

        {/* Retry button */}
        {onRetry && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171',
            }}
          >
            <AnimatePresence mode="wait">
              {retrying ? (
                <motion.span
                  key="retrying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <RetrySpinner />
                  <span>Retrying...</span>
                </motion.span>
              ) : (
                <motion.span
                  key="retry"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <RefreshIcon />
                  <span>Try Again</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Icon helpers ─────────────────────────────────────────────────────────────────

function AlertTriangleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function WifiOffIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
      <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
      <path d="M5 13a10 10 0 0 1 5.24-2.76" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" />
      <path d="m16.24 7.76-2.12 2.12" />
      <path d="M20.49 12H22" />
      <path d="m7.76 16.24 2.12-2.12" />
      <path d="M12 18.5V22" />
      <path d="m4.93 19.07 2.12-2.12" />
      <path d="M2 12h3.5" />
      <path d="m16.24 7.76 2.12-2.12" />
      <path d="M12 2a10 10 0 1 0 10 10" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function RetrySpinner() {
  return (
    <motion.div
      className="w-3.5 h-3.5 rounded-full"
      style={{ border: '2px solid rgba(248,113,113,0.2)', borderTopColor: '#f87171' }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
    />
  );
}
