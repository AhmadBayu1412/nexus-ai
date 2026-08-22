'use client';

/**
 * EmptyState Component
 *
 * Reusable onboarding empty state for AI chat.
 * Renders interactive prompt starters that fill the input and auto-submit.
 * Zero dependency — accepts a callback for prompt selection.
 */

import { motion } from 'framer-motion';
import type { EmptyStateProps } from '@/types/chat';

const STARTER_PROMPTS = [
  'Explain how Server-Sent Events work in 2 sentences',
  'Refactor this React hook to use best practices',
  'Debug my async function and explain the issue',
  'Write a clean TypeScript utility function',
];

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Bot avatar with ambient glow */}
      <div className="relative mb-8">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center animate-float"
          style={{
            background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)',
            border: '1px solid rgba(44,42,38,0.12)',
          }}
        >
          <BotIcon />
        </div>
        <div
          className="absolute inset-0 -z-10 rounded-2xl scale-110 opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(74,107,124,0.5) 0%, transparent 70%)' }}
        />
      </div>

      {/* Heading */}
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
        <span className="text-gradient">How can I help you</span>
        <br />
        <span style={{ color: '#3C3A36' }}>today?</span>
      </h2>
      <p
        className="text-center mb-10 max-w-md leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        I&apos;m your AI assistant — great at coding, writing, analysis,
        and creative tasks.
      </p>

      {/* Prompt starters grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg px-4">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="group relative px-4 py-3.5 rounded-xl text-left text-sm
              transition-all duration-200 hover:-translate-y-0.5 active:scale-98 focus-ring min-h-[56px] flex items-center"
            style={{
              background: 'rgba(255,253,248,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(44,42,38,0.12)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Hover gradient overlay */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(74,107,124,0.07) 0%, transparent 60%)',
                border: '1px solid rgba(74,107,124,0.14)',
              }}
            />

            {/* Content */}
            <div className="relative flex items-start gap-3 w-full">
              <div
                className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5"
                style={{ background: 'rgba(74,107,124,0.14)' }}
              >
                <SparkleIcon />
              </div>
              <span className="flex-1 leading-snug">{prompt}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function BotIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 12 12 6" />
      <path d="M12 12 16 14" />
      <circle cx="18" cy="6" r="3" />
      <path d="M18 3v6" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4A6B7C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
