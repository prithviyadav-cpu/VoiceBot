'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { OrbState } from './orb/VoiceOrb';

type Props = {
  state: OrbState;
  disabled: boolean;
  onClick: () => void;
};

const LABEL: Record<OrbState, string> = {
  idle: 'Start recording',
  listening: 'Stop recording',
  thinking: 'Generating answer',
  speaking: 'Answering',
};

export function MicButton({ state, disabled, onClick }: Props) {
  const isListening = state === 'listening';
  const busy = state === 'thinking';

  return (
    <div className="relative flex items-center justify-center">
      {/* Expanding rings while listening. */}
      <AnimatePresence>
        {isListening && (
          <>
            {[0, 0.6].map((delay) => (
              <motion.span
                key={delay}
                aria-hidden
                className="absolute h-16 w-16 rounded-full border border-aurora-cyan/60"
                initial={{ scale: 0.9, opacity: 0.7 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, delay, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={LABEL[state]}
        whileHover={disabled ? undefined : { scale: 1.05 }}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className={[
          'relative flex h-16 w-16 items-center justify-center rounded-full',
          'border text-white transition-colors duration-300',
          'disabled:cursor-not-allowed disabled:opacity-55',
          isListening
            ? 'border-aurora-cyan/70 bg-gradient-to-br from-aurora-cyan/90 to-cyan-600 shadow-glow-cyan'
            : 'border-white/15 bg-gradient-to-br from-aurora-violet to-indigo-700 shadow-glow hover:shadow-glow-lg',
        ].join(' ')}
      >
        {busy ? (
          <motion.span
            aria-hidden
            className="h-6 w-6 rounded-full border-2 border-white/25 border-t-white"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
          />
        ) : isListening ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
      </motion.button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      className="h-7 w-7"
    >
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M5.5 11.5A6.5 6.5 0 0 0 18.5 11.5" />
      <path d="M12 18.5V21" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <rect x="7" y="7" width="10" height="10" rx="2.5" />
    </svg>
  );
}
