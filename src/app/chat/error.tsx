'use client';

/**
 * chat/error.tsx
 *
 * Next.js App Router Error Boundary untuk segment /chat/.
 * Menangkap semua crash yang tidak tertangkap oleh useChat.onError.
 * Ini adalah safety net terakhir — last resort recovery.
 */

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to observability system
    logger.error('Uncaught chat segment error', {
      type: 'boundary_error',
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: 'rgba(239,68,68,0.10)',
          border: '1px solid rgba(239,68,68,0.20)',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f87171"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>

      {/* Text */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Terjadi kesalahan
        </h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {error.message || 'Error tidak diketahui. Silakan coba lagi.'}
        </p>
        {error.digest && (
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>

      {/* Recovery action */}
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)' }}
      >
        Coba Lagi
      </button>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Conversation state akan di-reset saat retry.
      </p>
    </div>
  );
}
