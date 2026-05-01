import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import type { ErrorNotice } from '../hooks/useSentenceBreakdown';
import { ParticleReveal } from './ParticleReveal';
import { PretextJumpText } from './PretextJumpText';

interface LandingViewProps {
  input: string;
  loading: boolean;
  generatingSentence: boolean;
  jumpingGeneratedCharacter: {
    character: string;
    index: number;
  } | null;
  isBusy: boolean;
  showSlowMessage: boolean;
  inputHint: string;
  analysisProgress: string;
  errorNotice: ErrorNotice | null;
  analysisReady: boolean;
  onInputChange: (value: string) => void;
  onAnalyze: () => void;
  onGenerateSentence: () => void;
  onStartBreakdown: () => void;
}

export function LandingView({
  input,
  loading,
  generatingSentence,
  jumpingGeneratedCharacter,
  isBusy,
  showSlowMessage,
  inputHint,
  analysisProgress,
  errorNotice,
  analysisReady,
  onInputChange,
  onAnalyze,
  onGenerateSentence,
  onStartBreakdown,
}: LandingViewProps) {
  const sentenceTextarea = (
    <div className="relative">
      <PretextJumpText active={Boolean(jumpingGeneratedCharacter)} text={input} />
      <textarea
        value={input}
        onChange={(event) => {
          onInputChange(event.target.value);
        }}
        placeholder="Enter a complex English sentence here..."
        className="w-full h-44 md:h-64 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-2xl text-ink placeholder:text-zinc-300 resize-none font-medium leading-normal pr-5 [scrollbar-gutter:stable]"
        id="sentence-input"
      />
    </div>
  );

  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl w-full text-center"
    >
      <ParticleReveal
        className="mb-12"
        particleCount={12000}
        revisionKey="landing-title"
        shape="text"
        targetText="Break down a complex English sentence"
        tone="blue"
      >
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">Break down a complex English sentence</h1>
        <p className="text-xl text-ink-muted">Paste a sentence or generate an example, then rebuild it step by step.</p>
      </ParticleReveal>

      {generatingSentence && (
        <ParticleReveal
          className="mb-6 mx-auto max-w-xl"
          particleCount={7000}
          revisionKey="generate-loading"
          shape="text-card"
          targetText="Generating an example sentence"
          tone="blue"
        >
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-primary ring-1 ring-primary/10"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={20} className="animate-spin" />
            <div className="text-left">
              <p className="text-sm font-bold">Generating an example sentence...</p>
              {showSlowMessage && (
                <p className="mt-1 text-xs font-semibold text-ink-muted">This may take a little longer for complex sentences.</p>
              )}
            </div>
          </motion.div>
        </ParticleReveal>
      )}

      <ParticleReveal
        className="mb-8"
        particleCount={14000}
        revisionKey="landing-input-card"
        shape="text-card"
        targetText="English sentence Enter a complex English sentence here"
        tone="light"
      >
        <div className="glass-card p-12 text-left transition-all focus-within:border-primary/20 focus-within:shadow-[0_0_0_4px_rgba(0,78,159,0.08)]">
          <label htmlFor="sentence-input" className="mb-4 block text-sm font-bold uppercase tracking-[0.16em] text-ink-muted">
            English sentence
          </label>
          {sentenceTextarea}
        </div>
      </ParticleReveal>

      {loading && (
        <ParticleReveal
          className="mb-6 mx-auto max-w-xl"
          particleCount={8000}
          revisionKey="analysis-loading"
          shape="text-card"
          targetText="Breaking down the sentence step by step"
          tone="blue"
        >
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 text-white shadow-lg"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={22} className="animate-spin" />
            <div className="text-left">
              <p className="text-base font-bold">{analysisProgress || 'Breaking down the sentence step by step...'}</p>
              {showSlowMessage && (
                <p className="mt-1 text-sm font-medium text-white/80">This may take a little longer for complex sentences.</p>
              )}
            </div>
          </motion.div>
        </ParticleReveal>
      )}

      {inputHint && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center text-sm font-semibold text-primary"
          role="status"
        >
          {inputHint}
        </motion.p>
      )}

      {errorNotice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-left text-red-900 sm:flex-row sm:items-center"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm font-semibold leading-relaxed">{errorNotice.message}</p>
          </div>
          <button
            onClick={errorNotice.action === 'generate' ? onGenerateSentence : onAnalyze}
            disabled={loading || generatingSentence || (errorNotice.action === 'analyze' && !input.trim())}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-100 transition-all hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </motion.div>
      )}

      <ParticleReveal
        particleCount={7000}
        revisionKey={`landing-actions-${analysisReady ? 'ready' : 'idle'}`}
        shape="text-card"
        targetText={analysisReady ? 'Start breakdown Generate another example' : 'Generate an example Analyze this sentence'}
        tone="blue"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGenerateSentence}
            disabled={isBusy}
            className="inline-flex items-center gap-2 text-primary px-6 py-3 rounded-full text-base font-medium hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingSentence ? 'Generating...' : 'Generate an example'}
          </button>
          {analysisReady ? (
            <button
              onClick={onStartBreakdown}
              disabled={isBusy}
              className="bg-primary text-white px-10 py-4 rounded-full text-lg font-medium shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              id="analyze-btn"
            >
              Start breakdown
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              onClick={onAnalyze}
              disabled={isBusy || !input.trim()}
              className="bg-primary text-white px-10 py-4 rounded-full text-lg font-medium shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              id="analyze-btn"
            >
              {loading && !generatingSentence ? 'Analyzing...' : 'Analyze this sentence'}
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </ParticleReveal>
    </motion.div>
  );
}
