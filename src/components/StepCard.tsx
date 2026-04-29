import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import type { SentenceBreakdown } from '../types';

interface StepCardProps {
  breakdown: SentenceBreakdown;
  currentStepIdx: number;
}

export function StepCard({ breakdown, currentStepIdx }: StepCardProps) {
  if (currentStepIdx === -1) {
    return (
      <motion.div
        className="flex flex-col items-center"
        initial={{ backgroundColor: '#ffffff' }}
        animate={{ backgroundColor: '#ffffff' }}
      >
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          <span className="text-ink-muted text-xl font-semibold mb-2 block tracking-tight uppercase">{breakdown.sourceLabel}</span>
        </motion.div>

        <h2 className="text-primary text-xl font-semibold mb-6">Read the full sentence first</h2>

        <motion.div
          className="relative w-full max-w-6xl bg-white p-10 md:p-16 mb-12 overflow-hidden text-center"
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-3xl md:text-5xl font-bold text-zinc-900 leading-tight tracking-tight">{breakdown.targetSentence}</p>
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-6 w-full max-w-6xl"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.45 }}
        >
          <h2 className="text-primary text-xl font-semibold">Then start from the base sentence</h2>
          <div className="w-full bg-[#f5f5f7] p-8 text-center">
            <p className="text-3xl font-bold text-zinc-900 leading-tight tracking-tight mb-4">{breakdown.steps[0].english}</p>
            <p className="text-lg text-ink-muted leading-relaxed font-medium">{breakdown.steps[0].chinese}</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  const step = breakdown.steps[currentStepIdx];

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="relative w-full max-w-6xl bg-[#f5f5f7] p-10 md:p-16 xl:p-20 overflow-hidden text-center"
        initial={{ backgroundColor: '#ffffff' }}
        animate={{ backgroundColor: '#f5f5f7' }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-zinc-900"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.42 }}
        >
          <p className="text-zinc-500 font-bold mb-1">Once the previous page is clear</p>
          <p className="text-xl font-bold mb-12">you can understand this one</p>
        </motion.div>

        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight mb-4 text-zinc-900">
            {step.english}
          </h3>
          <p className="text-xl font-medium text-ink-muted">{step.chinese}</p>
        </motion.div>

        <motion.div
          className="pt-12 border-t border-zinc-200 flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.42 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-focus-blue/10 text-focus-blue font-bold text-sm">
            <Plus size={16} />
            {currentStepIdx + 1} {step.label}
          </span>
          <p className="text-lg text-center font-medium text-zinc-800">
            {step.explanation}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
