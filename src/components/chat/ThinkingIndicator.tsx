'use client';

/**
 * ThinkingIndicator Component
 *
 * Animated state shown while waiting for first token.
 * Nexus AI — teal/sage dot orbs, solid text for maximum legibility.
 */

export function ThinkingIndicator() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl animate-fade-in w-fit"
      role="status"
      aria-live="polite"
      aria-label="AI sedang memproses respon"
      style={{
        background: 'rgba(44, 42, 38, 0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(74, 107, 124, 0.28)',
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)' }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 12 12 6" />
            <path d="M12 12 16 14" />
            <circle cx="18" cy="6" r="3" />
            <path d="M18 3v6" />
          </svg>
        </div>
      </div>

      {/* Glowing orbs — teal / sage, larger for visibility */}
      <div className="flex items-center gap-2.5">
        <span className="thinking-dot w-2 h-2 rounded-full" style={{ background: '#4A6B7C' }} />
        <span className="thinking-dot w-2 h-2 rounded-full" style={{ background: '#5C7A5E' }} />
        <span className="thinking-dot w-2 h-2 rounded-full" style={{ background: '#4A6B7C' }} />
      </div>

      {/* Text — solid white for maximum legibility on dark bg */}
      <span className="text-sm font-semibold" style={{ color: '#ffffff' }}>
        AI is thinking
      </span>
      <span style={{ color: 'rgba(255,255,255,0.55)' }}>...</span>
    </div>
  );
}
