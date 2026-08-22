'use client';

/**
 * JumpToLatest Component
 *
 * Floating icon button at bottom-right that appears when auto-scroll is unpinned.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface JumpToLatestProps {
  onClick: () => void;
}

export function JumpToLatest({ onClick }: JumpToLatestProps) {
  return (
    <AnimatePresence>
      <motion.button
        onClick={onClick}
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 8 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        whileTap={{ scale: 0.88 }}
        className="fixed bottom-36 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center min-w-11 min-h-11 focus-ring cursor-pointer"
        style={{
          background: 'rgba(44, 42, 38, 0.94)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(74, 107, 124, 0.40)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
        aria-label="Gulir ke pesan terbaru"
      >
        <motion.div
          animate={{ y: [0, 3, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <ArrowDown className="w-5 h-5 text-white" aria-hidden="true" />
        </motion.div>
      </motion.button>
    </AnimatePresence>
  );
}
