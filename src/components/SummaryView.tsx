import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, CheckCircle2, ChevronDown, Loader2, RotateCw, Type, Volume2 } from 'lucide-react';
import type { SaveStatus } from '../hooks/useLearningRecords';
import type { GrammarBlock, SentenceBreakdown } from '../types';
import { getAddedTextSegments } from '../utils/highlightDiff';
import { speakText } from '../utils/speech';
import { GrammarBrackets } from './GrammarBrackets';
import { HighlightedSentence } from './HighlightedSentence';
import { VocabularyInsightList } from './VocabularyInsightList';

const ROLE_LABEL_FULL: Record<string, string> = {
  subject: '主语',
  predicate: '谓语',
  object: '宾语',
  modifier: '定语',
  adverbial: '状语',
  complement: '补语',
  connector: '连接词',
  other: '其它',
};

const ROLE_DOT: Record<string, string> = {
  subject: 'bg-blue-500',
  predicate: 'bg-red-500',
  object: 'bg-purple-500',
  modifier: 'bg-amber-500',
  adverbial: 'bg-teal-500',
  complement: 'bg-orange-500',
  connector: 'bg-pink-500',
  other: 'bg-zinc-400',
};

function getUniqueRoles(blocks: GrammarBlock[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const block of blocks) {
    if (!seen.has(block.role)) {
      seen.add(block.role);
      result.push(block.role);
    }
  }
  return result;
}

interface SummaryViewProps {
  breakdown: SentenceBreakdown;
  expandedSummarySteps: ReadonlySet<number>;
  saveStatus: SaveStatus;
  saveError: string;
  isReviewMode: boolean;
  onToggleSummaryStep: (index: number) => void;
  onRetrySave: () => void;
  onReset: () => void;
}

export function SummaryView({
  breakdown,
  expandedSummarySteps,
  saveStatus,
  saveError,
  isReviewMode,
  onToggleSummaryStep,
  onRetrySave,
  onReset,
}: SummaryViewProps) {
  const summarySteps = breakdown.steps.slice(0, -1);
  const finalStep = breakdown.steps[breakdown.steps.length - 1] ?? null;
  const sessionInsights = breakdown.steps.flatMap((step) => step.vocabularyInsights ?? []);
  const collocationCount = sessionInsights.filter((insight) => insight.type === 'collocation').length;
  const meaningShiftCount = sessionInsights.filter((insight) => insight.type === 'meaning-shift').length;
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative mb-12 w-full max-w-[1320px]">
        {summarySteps.map((step, index) => {
          const previousStep = breakdown.steps[index - 1];
          const highlightedSentence = previousStep
            ? getAddedTextSegments(previousStep.english, step.english)
            : [{ text: step.english, highlighted: false }];

          return (
            <motion.article
              key={`${step.pageNumber}-${index}`}
              className="relative z-10 bg-white p-5 md:p-6 border border-zinc-200 flex flex-col gap-4 min-h-[280px]"
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
            <div className="min-w-0 overflow-hidden text-left flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <HighlightedSentence segments={highlightedSentence} grammarBlocks={step.grammarBlocks} compact />
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(step.english)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10 self-start mt-1"
                    aria-label={`Pronounce step ${index + 1}`}
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
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
            className={`relative z-10 bg-white border border-zinc-200 p-5 md:p-6 flex flex-col gap-4 min-h-[260px] ${summaryFinalSpan}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(summarySteps.length * 0.04, 0.32), duration: 0.36 }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-bold text-primary uppercase tracking-widest">{finalStep.label || 'Final Target'}</span>
              <div className="flex items-center gap-2">
                {finalStep.english && (
                  <button
                    type="button"
                    onClick={() => speakText(finalStep.english || breakdown.targetSentence)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10"
                    aria-label="Pronounce final sentence"
                  >
                    <Volume2 size={15} />
                  </button>
                )}
                <div className="w-11 h-11 rounded-full bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100">
                  <CheckCircle2 size={26} className="text-primary" />
                </div>
              </div>
            </div>
              <div className="min-w-0 overflow-hidden text-left flex flex-col gap-3">
              {breakdown.grammarAnatomy && breakdown.grammarAnatomy.length > 0 ? (
                <GrammarBrackets
                  blocks={breakdown.grammarAnatomy}
                  segments={breakdown.grammarAnatomy.map(() => ({ text: '', highlighted: false }))}
                  sentenceText={finalStep.english || breakdown.targetSentence}
                  compact
                />
              ) : (
                <p className="text-2xl md:text-3xl font-bold leading-tight text-zinc-900">{finalStep.english || breakdown.targetSentence}</p>
              )}
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">{finalStep.chinese}</p>

              {breakdown.grammarAnatomy && breakdown.grammarAnatomy.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {getUniqueRoles(breakdown.grammarAnatomy).map((role) => (
                    <span key={role} className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600">
                      <span className={`size-2 rounded-full ${ROLE_DOT[role] ?? ROLE_DOT.other}`} />
                      {ROLE_LABEL_FULL[role] ?? role}
                    </span>
                  ))}
                </div>
              )}

              {breakdown.anatomyNote && (
                <p className="text-sm text-zinc-500 leading-relaxed">{breakdown.anatomyNote}</p>
              )}

              <p className="text-sm text-zinc-700 leading-relaxed">{finalStep.explanation}</p>
            </div>
          </motion.article>
        )}
      </div>

      {sessionInsights.length > 0 && (
        <motion.section
          className="mb-12 w-full max-w-[1320px] bg-zinc-100 p-6 md:p-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.36 }}
        >
          <div className="mb-6 flex flex-col gap-4 text-left md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">This Session</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-500">Vocabulary and phrases surfaced while rebuilding this sentence.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200">
                {sessionInsights.length} insights
              </span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200">
                {collocationCount} collocations
              </span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200">
                {meaningShiftCount} meaning shifts
              </span>
            </div>
          </div>
          <VocabularyInsightList insights={sessionInsights} compact />
        </motion.section>
      )}

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

        {!isReviewMode && (
          <SaveStatusNotice status={saveStatus} error={saveError} onRetrySave={onRetrySave} />
        )}

        <button
          onClick={onReset}
          className="bg-primary text-white px-10 py-4 rounded-full text-lg font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all w-full md:w-auto"
        >
          {isReviewMode ? 'Return to My Learning' : 'Clear and start over'}
        </button>
      </div>
    </div>
  );
}

function SaveStatusNotice({
  status,
  error,
  onRetrySave,
}: {
  status: SaveStatus;
  error: string;
  onRetrySave: () => void;
}) {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary ring-1 ring-zinc-200">
        <Loader2 size={16} className="animate-spin" />
        Saving to My Learning
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary ring-1 ring-zinc-200">
        <CheckCircle2 size={16} />
        Saved to My Learning
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-red-100 bg-red-50 p-4 text-left text-sm font-semibold text-red-800">
      <p>{error || 'Breakdown is ready, but saving failed.'}</p>
      <button
        type="button"
        onClick={onRetrySave}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-100 transition-all hover:bg-red-100"
      >
        <RotateCw size={15} />
        Retry save
      </button>
    </div>
  );
}
