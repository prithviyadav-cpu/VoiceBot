'use client';

import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMicLevel } from '@/hooks/useMicLevel';
import { useSpeech } from '@/hooks/useSpeech';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { identity, suggestedQuestions } from '@/lib/profile';
import { askStream } from '@/lib/stream';
import type { Turn } from '@/lib/types';
import { AnswerCard } from './AnswerCard';
import { Composer } from './Composer';
import { MicButton } from './MicButton';
import { QuestionChips } from './QuestionChips';
import { ResumePanel } from './ResumePanel';
import { StatusPill } from './StatusPill';
import { ToastStack, useToasts } from './Toasts';
import { TranscriptPanel } from './TranscriptPanel';
import type { OrbState } from './orb/VoiceOrb';

// WebGL cannot render on the server, and the three.js bundle is large.
const VoiceOrb = dynamic(() => import('./orb/VoiceOrb').then((m) => m.VoiceOrb), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="h-full w-full animate-pulse rounded-full bg-aurora-violet/10" />
  ),
});

/** Prior turns sent as context. Pairs, so this is 6 exchanges. */
const HISTORY_WINDOW = 12;

const SHARE_PARAM = 'q';

export function VoiceBot() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);

  const { toasts, push, dismiss } = useToasts();
  const { levelRef, start: startMic, stop: stopMic } = useMicLevel();
  const speech = useSpeech();

  const abortRef = useRef<AbortController | null>(null);
  const turnId = useRef(0);
  // `ask` is referenced by the recognition callback, which is created before
  // `ask` exists; route through a ref to avoid a circular definition.
  const askRef = useRef<(q: string) => void>(() => {});

  const nextId = () => `t${turnId.current++}`;

  const ask = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || streaming) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      speech.cancel();
      stopMic();

      setQuestion(text);
      setAnswer('');
      setStreaming(true);

      const userTurn: Turn = { id: nextId(), role: 'user', text, at: Date.now() };
      // Snapshot history before appending, so the new question is not duplicated.
      const history = turns.slice(-HISTORY_WINDOW).map((t) => ({ role: t.role, text: t.text }));
      setTurns((current) => [...current, userTurn]);

      void askStream(
        text,
        history,
        {
          onDelta: (delta) => setAnswer((current) => current + delta),
          onDone: (full) => {
            setStreaming(false);
            setAnswer(full);
            setTurns((current) => [
              ...current,
              { id: nextId(), role: 'assistant', text: full, at: Date.now() },
            ]);
            speech.speak(full);
          },
          onError: (message) => {
            setStreaming(false);
            push(message, 'error');
            // Drop the orphaned question so history stays alternating.
            setTurns((current) => current.filter((t) => t.id !== userTurn.id));
            setQuestion('');
          },
        },
        controller.signal,
      );
    },
    [push, speech, stopMic, streaming, turns],
  );

  useEffect(() => {
    askRef.current = ask;
  }, [ask]);

  const recognition = useSpeechRecognition({
    onFinal: (transcript) => askRef.current(transcript),
    onError: (message) => push(message, 'error'),
  });

  // Stop the analyser as soon as dictation ends.
  useEffect(() => {
    if (!recognition.listening) stopMic();
  }, [recognition.listening, stopMic]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // A ?q= link asks its question on load, so answers are shareable.
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    if (shared?.trim()) askRef.current(shared.trim());
    // Intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state: OrbState = useMemo(() => {
    if (recognition.listening) return 'listening';
    if (streaming) return 'thinking';
    if (speech.speaking) return 'speaking';
    return 'idle';
  }, [recognition.listening, speech.speaking, streaming]);

  const handleMicClick = useCallback(async () => {
    if (recognition.listening) {
      recognition.stop();
      return;
    }
    if (!recognition.supported) {
      push('This browser does not support speech recognition. Use the text box instead.', 'error');
      return;
    }
    speech.cancel();
    // Recognition works without the analyser; the orb just stays at its floor.
    const micReady = await startMic();
    if (!micReady) push('Microphone unavailable — the orb will not react to your voice.', 'info');
    recognition.start();
  }, [push, recognition, speech, startMic]);

  const handleShare = useCallback(async () => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ [SHARE_PARAM]: question }).toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      push('Link copied to clipboard.', 'success');
    } catch {
      push('Could not copy the link.', 'error');
    }
  }, [push, question]);

  const handleExport = useCallback(() => {
    const body = turns
      .map((t) => `${t.role === 'user' ? 'Interviewer' : identity.name}: ${t.text}`)
      .join('\n\n');
    const header = `Interview with ${identity.name}\n${new Date().toLocaleString()}\n\n`;

    const url = URL.createObjectURL(new Blob([header + body], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'interview-transcript.txt';
    link.click();
    URL.revokeObjectURL(url);
    push('Transcript downloaded.', 'success');
  }, [push, turns]);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    speech.cancel();
    setTurns([]);
    setQuestion('');
    setAnswer('');
    setStreaming(false);
    push('Conversation cleared.', 'info');
  }, [push, speech]);

  const busy = streaming || recognition.listening;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <ResumePanel
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onAsk={(q) => {
          setResumeOpen(false);
          ask(q);
        }}
      />

      {/* Fixed grid overlay for depth. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-grid-fade bg-grid opacity-[0.35] [mask-image:radial-gradient(70%_60%_at_50%_35%,#000,transparent)]"
      />

      <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
        <Header onOpenResume={() => setResumeOpen(true)} speech={speech} />

        <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[1.55fr_1fr]">
          {/* Conversation column */}
          <div className="flex min-w-0 flex-col items-center gap-7">
            <div className="relative h-56 w-56 sm:h-72 sm:w-72">
              <VoiceOrb state={state} levelRef={levelRef} className="h-full w-full" />
            </div>

            <StatusPill state={state} />

            <MicButton state={state} disabled={streaming} onClick={handleMicClick} />

            {/* Live dictation preview. */}
            <div className="min-h-[1.5rem] text-center">
              <AnimatePresence mode="wait">
                {recognition.interim && (
                  <motion.p
                    key="interim"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm italic text-slate-400"
                  >
                    {recognition.interim}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="w-full max-w-2xl space-y-5">
              <AnimatePresence mode="wait">
                {question && (answer || streaming) ? (
                  <AnswerCard
                    key="answer"
                    question={question}
                    answer={answer}
                    streaming={streaming}
                    speaking={speech.speaking}
                    paused={speech.paused}
                    muted={speech.muted}
                    charIndex={speech.charIndex}
                    onToggleSpeech={speech.toggle}
                    onReplay={() => speech.speak(answer)}
                    onShare={handleShare}
                  />
                ) : (
                  <motion.div
                    key="prompts"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-center font-mono text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
                      Try asking
                    </p>
                    <QuestionChips
                      questions={suggestedQuestions}
                      disabled={busy}
                      onPick={ask}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Composer disabled={busy} onSubmit={ask} />
            </div>
          </div>

          {/* Transcript column */}
          <div className="min-h-[26rem] lg:max-h-[calc(100vh-12rem)] lg:sticky lg:top-8">
            <TranscriptPanel turns={turns} onClear={handleClear} onExport={handleExport} />
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
}

function Header({
  onOpenResume,
  speech,
}: {
  onOpenResume: () => void;
  speech: ReturnType<typeof useSpeech>;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
          AI Interview Persona
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-gradient">{identity.name}</span>
        </h1>
        <p className="mt-1.5 max-w-md text-sm text-slate-400">
          {identity.title} at {identity.company}.{' '}
          <span className="text-gradient-accent">Ask anything</span> — by voice or text.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={speech.toggleMute}
          aria-label={speech.muted ? 'Unmute answers' : 'Mute answers'}
          title={speech.muted ? 'Unmute answers' : 'Mute answers'}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
        >
          {speech.muted ? <MutedIcon /> : <SoundIcon />}
        </button>
        <button
          type="button"
          onClick={onOpenResume}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300 transition-colors hover:border-aurora-cyan/40 hover:text-white"
        >
          Profile
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-6 text-xs text-slate-500">
      <p>Answers are generated by Claude from a curated profile, not scripted.</p>
      <div className="flex gap-4">
        <a
          href={identity.links.github}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-slate-300"
        >
          GitHub
        </a>
        <a
          href={identity.links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-slate-300"
        >
          LinkedIn
        </a>
      </div>
    </footer>
  );
}

const soundIconProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-4 w-4',
};

const SoundIcon = () => (
  <svg {...soundIconProps}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18 6a8 8 0 0 1 0 12" />
  </svg>
);

const MutedIcon = () => (
  <svg {...soundIconProps}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
    <path d="m16 9 5 6M21 9l-5 6" />
  </svg>
);
