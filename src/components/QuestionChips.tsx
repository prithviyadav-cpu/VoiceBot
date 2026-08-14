'use client';

import { motion } from 'framer-motion';

type Props = {
  questions: string[];
  disabled: boolean;
  onPick: (question: string) => void;
};

export function QuestionChips({ questions, disabled, onPick }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {questions.map((question, i) => (
        <motion.button
          key={question}
          type="button"
          onClick={() => onPick(question)}
          disabled={disabled}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * i, duration: 0.32, ease: 'easeOut' }}
          whileHover={disabled ? undefined : { y: -2 }}
          className={[
            'rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5',
            'text-xs text-slate-300 backdrop-blur-md transition-colors',
            'hover:border-aurora-cyan/40 hover:bg-white/[0.08] hover:text-white',
            'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/10',
            'disabled:hover:bg-white/[0.04] disabled:hover:text-slate-300',
          ].join(' ')}
        >
          {question}
        </motion.button>
      ))}
    </div>
  );
}
