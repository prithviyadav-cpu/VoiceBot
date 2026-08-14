'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';

type Props = {
  disabled: boolean;
  onSubmit: (question: string) => void;
};

/**
 * Text entry fallback. Keeps the app usable without a microphone, and in
 * browsers with no Web Speech support.
 */
export function Composer({ disabled, onSubmit }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const question = value.trim();
    if (!question || disabled) return;
    onSubmit(question);
    setValue('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  // Enter sends; Shift+Enter inserts a newline.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass glass-edge flex items-end gap-2 p-2">
      <label htmlFor="composer" className="sr-only">
        Type an interview question
      </label>
      <textarea
        id="composer"
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Or type a question…"
        maxLength={1000}
        className={[
          'max-h-32 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-2.5',
          'text-sm text-slate-100 placeholder:text-slate-500',
          'focus:outline-none disabled:opacity-50',
        ].join(' ')}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send question"
        className={[
          'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          'bg-gradient-to-br from-aurora-violet to-indigo-700 text-white',
          'transition-all hover:shadow-glow',
          'disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-60',
        ].join(' ')}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
