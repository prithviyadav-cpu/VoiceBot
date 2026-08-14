'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';

export type ToastKind = 'info' | 'success' | 'error';

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

const STYLE: Record<ToastKind, string> = {
  info: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  error: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
};

const DURATION_MS = 4200;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, kind, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS),
      );
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            onClick={() => onDismiss(toast.id)}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            className={[
              'pointer-events-auto max-w-md rounded-2xl border px-4 py-2.5',
              'text-sm shadow-lift backdrop-blur-xl',
              STYLE[toast.kind],
            ].join(' ')}
          >
            {toast.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
