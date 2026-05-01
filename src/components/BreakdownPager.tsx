import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SentenceBreakdown } from '../types';
import { ParticleReveal } from './ParticleReveal';
import { StepCard } from './StepCard';
import { SummaryView } from './SummaryView';

interface BreakdownPagerProps {
  breakdown: SentenceBreakdown;
  currentStepIdx: number;
  slideDirection: number;
  expandedSummarySteps: ReadonlySet<number>;
  onGoToPage: (index: number) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onReset: () => void;
  onToggleSummaryStep: (index: number) => void;
}

export function BreakdownPager({
  breakdown,
  currentStepIdx,
  slideDirection,
  expandedSummarySteps,
  onGoToPage,
  onNextStep,
  onPrevStep,
  onReset,
  onToggleSummaryStep,
}: BreakdownPagerProps) {
  const isSummary = currentStepIdx === breakdown.steps.length;
  const totalPages = breakdown.steps.length + 2;
  const activePage = currentStepIdx + 2;
  const pageLabel = currentStepIdx === -1
    ? 'Base sentence'
    : currentStepIdx === breakdown.steps.length
      ? 'Final summary'
      : `Step ${currentStepIdx + 1} of ${breakdown.steps.length}`;
  const activeStep = currentStepIdx >= 0 && currentStepIdx < breakdown.steps.length
    ? breakdown.steps[currentStepIdx]
    : null;
  const targetText = currentStepIdx === -1
    ? `${breakdown.sourceLabel} ${breakdown.targetSentence} ${breakdown.steps[0]?.english ?? ''}`
    : isSummary
      ? `Sentence Assembly ${breakdown.targetSentence}`
      : `${activeStep?.english ?? ''} ${activeStep?.chinese ?? ''} ${activeStep?.label ?? ''}`;

  return (
    <>
      <motion.div
        key={`step-${currentStepIdx}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[min(1440px,calc(100vw-48px))]"
      >
        <div className="mb-8 flex flex-wrap items-center justify-center gap-1" aria-label="Breakdown progress">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              aria-label={`Go to page ${index + 1}`}
              aria-current={index + 1 === activePage ? 'step' : undefined}
              aria-disabled={index + 1 === activePage}
              onClick={() => {
                onGoToPage(index);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-all hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index + 1 === activePage ? 'w-10 bg-primary' : 'w-1.5 bg-zinc-300'
                }`}
              />
            </button>
          ))}
        </div>

        <p className="mb-6 text-center text-sm font-bold uppercase tracking-[0.18em] text-ink-muted">
          {pageLabel}
        </p>

        <button
          onClick={onPrevStep}
          disabled={currentStepIdx === -1}
          className="hidden md:flex absolute left-[-72px] top-1/2 z-20 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-zinc-900 ring-1 ring-black/5 backdrop-blur-xl transition-all hover:bg-white active:scale-95 disabled:opacity-20"
          aria-label="Previous card"
        >
          <ArrowLeft size={20} />
        </button>

        <button
          onClick={isSummary ? onReset : onNextStep}
          className="hidden md:flex absolute right-[-72px] top-1/2 z-20 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-all hover:brightness-110 active:scale-95"
          aria-label={isSummary ? 'Start over' : 'Next card'}
        >
          <ArrowRight size={20} />
        </button>

        <ParticleReveal
          key={`particles-${currentStepIdx}`}
          flowDirection={slideDirection > 0 ? 1 : -1}
          particleCount={isSummary ? 17000 : 15000}
          revisionKey={`card-${currentStepIdx}-${slideDirection}-${targetText.length}`}
          shape="text-card"
          targetText={targetText}
          tone={isSummary ? 'dark' : 'blue'}
        >
          {currentStepIdx === -1 && (
            <StepCard breakdown={breakdown} currentStepIdx={currentStepIdx} />
          )}

          {currentStepIdx >= 0 && currentStepIdx < breakdown.steps.length && (
            <StepCard breakdown={breakdown} currentStepIdx={currentStepIdx} />
          )}

          {isSummary && (
            <SummaryView
              breakdown={breakdown}
              expandedSummarySteps={expandedSummarySteps}
              onToggleSummaryStep={onToggleSummaryStep}
              onReset={onReset}
            />
          )}
        </ParticleReveal>
      </motion.div>

      <footer className="md:hidden bg-white/80 backdrop-blur-md border-t border-zinc-200 fixed bottom-0 w-full h-20 flex items-center justify-between px-8 z-50">
        <button
          onClick={onPrevStep}
          disabled={currentStepIdx === -1}
          className="flex flex-col items-center gap-1 text-zinc-400 disabled:opacity-30"
        >
          <ArrowLeft size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Previous</span>
        </button>
        <button
          onClick={isSummary ? onReset : onNextStep}
          className="flex flex-col items-center gap-1 text-primary disabled:opacity-30"
        >
          <ArrowRight size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{isSummary ? 'Start over' : 'Next'}</span>
        </button>
      </footer>
    </>
  );
}
