'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

type Props = {
  question: string;
  answer: string;
  /** True while tokens are still arriving. */
  streaming: boolean;
  speaking: boolean;
  paused: boolean;
  muted: boolean;
  /** Character offset of the word being spoken, for caption highlighting. */
  charIndex: number;
  onToggleSpeech: () => void;
  onReplay: () => void;
  onShare: () => void;
};

export function AnswerCard({
  question,
  answer,
  streaming,
  speaking,
  paused,
  muted,
  charIndex,
  onToggleSpeech,
  onReplay,
  onShare,
}: Props) {
  // Split once per answer; highlight by comparing each word's offset to charIndex.
  const words = useMemo(() => {
    const out: { text: string; start: number }[] = [];
    const re = /\S+\s*/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(answer)) !== null) {
      out.push({ text: match[0], start: match.index });
    }
    return out;
  }, [answer]);

  const highlight = speaking && !paused;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="glass glass-edge overflow-hidden p-6 sm:p-7"
      aria-live="polite"
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
            You asked
          </p>
          <h2 className="text-balance text-sm font-medium leading-snug text-slate-300">
            {question}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton
            label={muted ? 'Audio muted' : paused ? 'Resume speech' : 'Pause speech'}
            onClick={onToggleSpeech}
            disabled={muted || !speaking}
            active={speaking && !paused}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </IconButton>
          <IconButton label="Replay answer" onClick={onReplay} disabled={muted || streaming}>
            <ReplayIcon />
          </IconButton>
          <IconButton label="Copy link to this answer" onClick={onShare}>
            <ShareIcon />
          </IconButton>
        </div>
      </header>

      <div className="text-[0.975rem] leading-[1.75] text-slate-100">
        {words.map((word, i) => {
          const next = words[i + 1];
          const isCurrent =
            highlight && charIndex >= word.start && (!next || charIndex < next.start);
          return (
            <span
              key={`${word.start}-${i}`}
              className={
                isCurrent
                  ? 'rounded bg-aurora-violet/25 text-white transition-colors duration-150'
                  : 'transition-colors duration-300'
              }
            >
              {word.text}
            </span>
          );
        })}

        <AnimatePresence>
          {streaming && (
            <motion.span
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.25, 1, 0.25] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] bg-aurora-cyan"
            />
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
        active
          ? 'border-aurora-violet/45 bg-aurora-violet/20 text-white'
          : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-white',
        'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10',
        'disabled:hover:text-slate-400',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

const iconProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-4 w-4',
};

const PlayIcon = () => (
  <svg {...iconProps} fill="currentColor" stroke="none">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

const PauseIcon = () => (
  <svg {...iconProps} fill="currentColor" stroke="none">
    <rect x="7" y="5.5" width="3.5" height="13" rx="1.2" />
    <rect x="13.5" y="5.5" width="3.5" height="13" rx="1.2" />
  </svg>
);

const ReplayIcon = () => (
  <svg {...iconProps}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);

const ShareIcon = () => (
  <svg {...iconProps}>
    <path d="M10 13a5 5 0 0 0 7.07 0l2.5-2.5a5 5 0 0 0-7.07-7.07L11 4.93" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-2.5 2.5a5 5 0 0 0 7.07 7.07L13 19.07" />
  </svg>
);
