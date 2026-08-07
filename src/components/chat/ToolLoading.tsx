'use client';

/**
 * ToolLoading Component
 *
 * Renders two sub-states for the tool lifecycle:
 * - "streaming"  → skeleton shimmer while AI generates JSON parameters
 * - "executing"  → spinner while tool() is running on the server
 *
 * Dynamic labels based on toolName (research_company vs score_lead).
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToolLoadingProps {
  /** 'streaming' = AI typing params | 'executing' = server running tool */
  phase: 'streaming' | 'executing';
  /** Tool name for dynamic labels */
  toolName?: string;
  className?: string;
}

const TOOL_CONFIG: Record<string, {
  streamingLabel: string;
  executingLabel: string;
  executingHint: string;
  paramKeys: string[];
}> = {
  research_company: {
    streamingLabel: 'Mencari di Google...',
    executingLabel: 'Mencari data...',
    executingHint: 'Researching company via Google',
    paramKeys: ['companyName', 'industry'],
  },
  score_lead: {
    streamingLabel: 'Memproses...',
    executingLabel: 'Memproses data...',
    executingHint: 'Menjalankan score_lead tool',
    paramKeys: ['companyName', 'industry', 'companySize'],
  },
};

function getToolConfig(toolName?: string, phase?: 'streaming' | 'executing') {
  const defaults = {
    label: 'Memproses...',
    hint: 'Menjalankan tool',
    paramKeys: ['...'],
  };
  if (!toolName || !phase) return defaults;
  const cfg = TOOL_CONFIG[toolName];
  if (!cfg) return { ...defaults, label: toolName };
  return {
    label: phase === 'streaming' ? cfg.streamingLabel : cfg.executingLabel,
    hint: cfg.executingHint,
    paramKeys: cfg.paramKeys,
  };
}

export function ToolLoading({ phase, toolName, className }: ToolLoadingProps) {
  const { label, hint, paramKeys } = getToolConfig(toolName, phase);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex flex-col gap-3', className)}
    >
      {/* Tool call header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
        style={{
          background: 'rgba(44, 42, 38, 0.90)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(74,107,124,0.22)',
        }}
      >
        {/* Tool icon */}
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ background: 'rgba(74,107,124,0.18)' }}
        >
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="#4A6B7C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        <span className="text-xs font-semibold" style={{ color: '#4A6B7C' }}>
          {toolName ?? 'tool'}
        </span>

        {/* Phase badge */}
        <motion.span
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(74,107,124,0.12)', color: '#4A6B7C' }}
        >
          {label}
        </motion.span>
      </div>

      {/* Body */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(44, 42, 38, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(44,42,38,0.14)',
        }}
      >
        {phase === 'streaming' ? (
          <StreamingSkeleton paramKeys={paramKeys} />
        ) : (
          <ExecutingBody label={label} hint={hint} />
        )}
      </div>
    </motion.div>
  );
}

function StreamingSkeleton({ paramKeys }: { paramKeys: string[] }) {
  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs shrink-0" style={{ color: '#9E9B94' }}>{'{'}</span>
        <SkeletonBar width="55%" delay={0} />
      </div>
      {paramKeys.map((key, i) => (
        <div key={key} className="flex items-center gap-2 pl-4">
          <span className="text-xs shrink-0" style={{ color: '#9E9B94' }}>
            {'"'}{key}{'": '}
          </span>
          <SkeletonBar width={key === 'companySize' ? '35%' : '50%'} delay={(i + 1) * 0.1} />
          {i < paramKeys.length - 1 && (
            <span className="text-xs" style={{ color: '#9E9B94' }}>,</span>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="text-xs shrink-0" style={{ color: '#9E9B94' }}>{'}'}</span>
      </div>
      <p className="text-xs pt-1" style={{ color: 'rgba(158,155,148,0.6)' }}>
        AI sedang mengetik parameter...
      </p>
    </div>
  );
}

function SkeletonBar({ width, delay }: { width: string; delay: number }) {
  return (
    <motion.div
      className="h-3 rounded-md"
      style={{ background: 'rgba(74,107,124,0.12)', width }}
      animate={{ opacity: [0.4, 0.9, 0.4] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

function ExecutingBody({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="px-4 py-5 flex flex-col items-center gap-3">
      {/* Spinner */}
      <div className="relative w-10 h-10">
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: '3px solid rgba(74,107,124,0.15)' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '3px solid transparent', borderTopColor: '#4A6B7C' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Labels */}
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: '#F2EFE6' }}>{label}</p>
        <p className="text-xs mt-1" style={{ color: '#9E9B94' }}>{hint}</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#4A6B7C' }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
