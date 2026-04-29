import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, CheckCircle2, ChevronDown, Type } from 'lucide-react';
import type { SentenceBreakdown } from '../types';
import { getAddedTextSegments } from '../utils/highlightDiff';
import { HighlightedSentence } from './HighlightedSentence';

interface SummaryViewProps {
  breakdown: SentenceBreakdown;
  expandedSummarySteps: ReadonlySet<number>;
  onToggleSummaryStep: (index: number) => void;
  onReset: () => void;
}

export function SummaryView({
  breakdown,
  expandedSummarySteps,
  onToggleSummaryStep,
  onReset,
}: SummaryViewProps) {
  const summarySteps = breakdown.steps.slice(0, -1);
  const finalStep = breakdown.steps[breakdown.steps.length - 1] ?? null;
  const summaryFinalSpan = [
    (breakdown.steps.length - 1) % 2 === 0 ? 'md:col-span-2' : 'md:col-span-1',
    (breakdown.steps.length - 1) % 3 === 0
      ? 'xl:col-span-3'
      : (breakdown.steps.length - 1) % 3 === 1
        ? 'xl:col-span-2'
        : 'xl:col-span-1',
  ].join(' ');

  return (
    <div className="flex flex-col items-center w-full">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4">Sentence Assembly</h1>
        <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">The complete rebuild path from the base sentence to the final target.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative mb-12 w-full max-w-[1320px]">
        {summarySteps.map((step, index) => {
          const previousStep = breakdown.steps[index - 1];
          const highlightedSentence = previousStep
            ? getAddedTextSegments(previousStep.english, step.english)
            : [{ text: step.english, highlighted: false }];

          return (
            <motion.article
              key={`${step.pageNumber}-${index}`}
              className="relative z-10 bg-white p-5 md:p-6 border border-zinc-200 flex flex-col gap-4 min-h-[260px]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.28), duration: 0.36 }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-bold text-primary uppercase tracking-widest">{step.label}</span>
                <div className="w-11 h-11 rounded-full bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100">
                  <span className="text-sm font-bold text-primary">{String(index + 1).padStart(2, '0')}</span>
                </div>
              </div>
              <div className="min-w-0 text-left flex flex-col gap-3">
                <p className="text-lg font-bold text-zinc-900 leading-snug">
                  <HighlightedSentence segments={highlightedSentence} />
                </p>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">{step.chinese}</p>
                <button
                  onClick={() => {
                    onToggleSummaryStep(index);
                  }}
                  aria-expanded={expandedSummarySteps.has(index)}
                  className="mt-1 inline-flex w-fit items-center gap-1 rounded-full text-sm font-bold text-primary transition-all hover:text-primary-container focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  Why this step matters
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${expandedSummarySteps.has(index) ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expandedSummarySteps.has(index) && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden text-sm text-zinc-700 leading-relaxed"
                    >
                      {step.explanation}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.article>
          );
        })}

        {finalStep && (
          <motion.article
            className={`relative z-10 bg-primary p-5 md:p-6 flex flex-col gap-4 min-h-[260px] ${summaryFinalSpan}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(summarySteps.length * 0.04, 0.32), duration: 0.36 }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-bold text-primary-fixed uppercase tracking-widest">{finalStep.label || 'Final Target'}</span>
              <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <CheckCircle2 size={26} className="text-white" />
              </div>
            </div>
            <div className="text-white min-w-0 text-left flex flex-col gap-3">
              <p className="text-2xl md:text-3xl font-bold leading-tight">{finalStep.english || breakdown.targetSentence}</p>
              <p className="text-base md:text-lg text-white/80 font-medium leading-relaxed">{finalStep.chinese}</p>
              <p className="text-sm text-white/75 leading-relaxed">{finalStep.explanation}</p>
            </div>
          </motion.article>
        )}
      </div>

      <div className="w-full max-w-[760px] bg-zinc-100 p-10 md:p-12 text-center border border-zinc-200">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BookOpen size={32} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">Final Takeaway</h2>
        <p className="text-zinc-600 text-lg mb-8 font-medium leading-relaxed">
          Complex sentences aren't inherently difficult; they are simply stacks of simple components.
          By isolating the core structure from the modifying layers, we decode the underlying logic of the language.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <div className="bg-white px-6 py-2.5 rounded-full border border-zinc-200 text-sm font-bold text-zinc-800 shadow-sm flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            Steps completed <strong className="text-primary">{breakdown.steps.length}</strong>
          </div>
          <div className="bg-white px-6 py-2.5 rounded-full border border-zinc-200 text-sm font-bold text-zinc-800 shadow-sm flex items-center gap-2">
            <Type size={16} className="text-primary" />
            Total words <strong className="text-primary">{breakdown.totalWords}</strong>
          </div>
        </div>

        <button
          onClick={onReset}
          className="bg-primary text-white px-10 py-4 rounded-full text-lg font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all w-full md:w-auto"
        >
          Clear and start over
        </button>
      </div>
    </div>
  );
}
