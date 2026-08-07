'use client';

/**
 * LeadScoreCard Component
 *
 * Renders the `output available` state: a polished score card
 * displaying score (1-100), verdict (Hot/Warm/Cold Lead),
 * and 3 analysis points.
 *
 * Also displays a collapsible "Research Summary" section with:
 * - Company metadata (employees, funding)
 * - Top sources from Tavily
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnalysisPoint {
  text: string;
}

interface LeadScoreCardProps {
  score: number;
  verdict: string;
  analysis: AnalysisPoint[] | string[];
  companyName?: string;
  /** True if score was calculated from real research data */
  hasResearch?: boolean;
  /** Top sources from Tavily research */
  researchSources?: Array<{ title: string; url: string }>;
  className?: string;
}

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  'Hot Lead': { label: 'Hot Lead', color: '#f87171', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', glow: 'rgba(239,68,68,0.20)' },
  'Warm Lead': { label: 'Warm Lead', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', glow: 'rgba(251,191,36,0.15)' },
  'Cold Lead': { label: 'Cold Lead', color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)', border: 'rgba(110,231,183,0.18)', glow: 'rgba(110,231,183,0.10)' },
};

function getScoreColor(score: number): string {
  if (score >= 75) return '#f87171';
  if (score >= 50) return '#fbbf24';
  return '#6ee7b7';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Weak';
  return 'Poor';
}

export function LeadScoreCard({
  score,
  verdict,
  analysis,
  companyName,
  hasResearch,
  researchSources,
  className,
}: LeadScoreCardProps) {
  const [showResearch, setShowResearch] = useState(false);
  const verdictCfg = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG['Cold Lead'];
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const formattedAnalysis: string[] = analysis.map((a) => (typeof a === 'string' ? a : a.text));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn('flex flex-col gap-0 rounded-2xl overflow-hidden w-fit', className)}
      style={{
        background: 'rgba(44, 42, 38, 0.92)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(44,42,38,0.14)',
        boxShadow: `0 0 40px ${verdictCfg.glow}, 0 4px 24px rgba(0,0,0,0.25)`,
        minWidth: 320,
        maxWidth: 480,
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(74,107,124,0.14)', border: '1px solid rgba(74,107,124,0.20)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4A6B7C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span className="text-xs font-semibold" style={{ color: '#4A6B7C' }}>score_lead</span>
            </div>
            {companyName && (
              <span className="text-xs px-2 py-0.5 rounded-md truncate max-w-[140px]"
                style={{ background: 'rgba(255,253,248,0.06)', color: '#9E9B94' }}>
                {companyName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: verdictCfg.bg, border: `1px solid ${verdictCfg.border}` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: verdictCfg.color }} />
            <span className="text-xs font-semibold" style={{ color: verdictCfg.color }}>{verdictCfg.label}</span>
          </div>
        </div>
      </div>

      {/* Score Section */}
      <div className="px-5 pb-4">
        <div className="flex items-end gap-4">
          <div className="flex items-baseline gap-1">
            <motion.span
              key={score}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-5xl font-bold leading-none"
              style={{ color: scoreColor, fontVariantNumeric: 'tabular-nums' }}
            >
              {score}
            </motion.span>
            <span className="text-lg font-medium pb-1" style={{ color: 'rgba(158,155,148,0.5)' }}>/100</span>
          </div>
          <div className="flex-1 flex flex-col gap-1 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: scoreColor }}>{scoreLabel}</span>
              <span className="text-xs" style={{ color: '#9E9B94' }}>Lead Score</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,253,248,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: scoreColor }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5" style={{ height: 1, background: 'rgba(44,42,38,0.14)' }} />

      {/* Research Summary (collapsible) */}
      {hasResearch && researchSources && researchSources.length > 0 && (
        <div className="px-5 py-3">
          <button
            onClick={() => setShowResearch((v) => !v)}
            className="w-full flex items-center gap-2 text-left"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4A6B7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: '#4A6B7C' }}>Research dari Google</span>
            <span className="ml-auto transition-transform duration-200" style={{ color: '#9E9B94', transform: showResearch ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          <AnimatePresence>
            {showResearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pt-2.5 space-y-2">
                  {researchSources.map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 group"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9E9B94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="shrink-0 mt-0.5">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span className="text-xs leading-snug group-hover:underline" style={{ color: '#9E9B94' }}>
                        {source.title}
                      </span>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Analysis Points */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A6B7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A6B7C' }}>Analysis</span>
        </div>
        {formattedAnalysis.map((point, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut', delay: 0.2 + index * 0.08 }}
            className="flex items-start gap-3"
          >
            <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
              style={{ background: 'rgba(74,107,124,0.14)', border: '1px solid rgba(74,107,124,0.20)' }}>
              <span className="text-xs font-bold" style={{ color: '#4A6B7C' }}>{index + 1}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,239,230,0.85)' }}>{point}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
