'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { OrbState } from './orb/VoiceOrb';

const COPY: Record<OrbState, { label: string; dot: string }> = {
  idle: { label: 'Ready', dot: 'bg-slate-400' },
  listening: { label: 'Listening', dot: 'bg-aurora-cyan' },
  thinking: { label: 'Thinking', dot: 'bg-aurora-violet' },
  speaking: { label: 'Speaking', dot: 'bg-aurora-magenta' },
};

export function StatusPill({ state }: { state: OrbState }) {
  const { label, dot } = COPY[state];
  const animated = state !== 'idle';

  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {animated && (
          <motion.span
            aria-hidden
            className={`absolute inset-0 rounded-full ${dot}`}
            animate={{ scale: [1, 2.2], opacity: [0.65, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className={`relative h-2 w-2 rounded-full ${dot}`} />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="font-mono text-xs uppercase tracking-[0.16em] text-slate-300"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
