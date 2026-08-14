'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { Turn } from '@/lib/types';

type Props = {
  turns: Turn[];
  onClear: () => void;
  onExport: () => void;
};

export function TranscriptPanel({ turns, onClear, onExport }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Follow the conversation as it grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length]);

  const exchanges = turns.filter((t) => t.role === 'user').length;

  return (
    <section className="glass glass-edge flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Transcript</h2>
          <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
            {exchanges === 0 ? 'No questions yet' : `${exchanges} question${exchanges === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <TextButton onClick={onExport} disabled={turns.length === 0}>
            Export
          </TextButton>
          <TextButton onClick={onClear} disabled={turns.length === 0}>
            Clear
          </TextButton>
        </div>
      </header>

      <div ref={scrollRef} className="scroll-subtle min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {turns.length === 0 ? (
          <p className="py-8 text-center text-sm leading-relaxed text-slate-500">
            Ask a question by voice or text.
            <br />
            Follow-ups keep the earlier context.
          </p>
        ) : (
          <ol className="space-y-4">
            <AnimatePresence initial={false}>
              {turns.map((turn) => (
                <motion.li
                  key={turn.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={turn.role === 'user' ? 'pl-6' : ''}
                >
                  <p
                    className={[
                      'mb-1 font-mono text-[0.6rem] uppercase tracking-[0.16em]',
                      turn.role === 'user' ? 'text-aurora-cyan/80' : 'text-aurora-magenta/80',
                    ].join(' ')}
                  >
                    {turn.role === 'user' ? 'Interviewer' : 'Prithvi'}
                  </p>
                  <div
                    className={[
                      'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      turn.role === 'user'
                        ? 'bg-aurora-cyan/[0.08] text-slate-300'
                        : 'bg-white/[0.04] text-slate-100',
                    ].join(' ')}
                  >
                    {turn.text}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>
    </section>
  );
}

function TextButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1',
        'font-mono text-[0.65rem] uppercase tracking-[0.12em] text-slate-400',
        'transition-colors hover:border-white/20 hover:text-white',
        'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10',
        'disabled:hover:text-slate-400',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
