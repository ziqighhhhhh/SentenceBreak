import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, BookOpen, Type, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { generateBreakdown, generateComplexSentence } from './services/aiService';
import { SentenceBreakdown } from './types';

type ErrorAction = 'analyze' | 'generate';

function hasChineseText(value: string): boolean {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);
}

function getFriendlyErrorMessage(error: unknown, action: ErrorAction): string {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('chinese text')) {
    return '请输入英文句子，不要包含中文。';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('econnrefused') ||
    normalized.includes('http 502')
  ) {
    return '无法连接分析服务，请稍后重试。';
  }

  if (
    normalized.includes('token') ||
    normalized.includes('api_key') ||
    normalized.includes('unauthorized') ||
    normalized.includes('401')
  ) {
    return '服务暂时不可用，请检查服务器配置。';
  }

  if (action === 'generate') {
    return '句子生成失败，请重试。';
  }

  return '句子分析失败，请重试。';
}

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingSentence, setGeneratingSentence] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [inputHint, setInputHint] = useState('');
  const [errorNotice, setErrorNotice] = useState<{ message: string; action: ErrorAction } | null>(null);
  const [breakdown, setBreakdown] = useState<SentenceBreakdown | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1); // -1 is the "Page 1" (Target + Garbage)
  const [slideDirection, setSlideDirection] = useState(1);
  const isBusy = loading || generatingSentence;

  useEffect(() => {
    if (!isBusy) {
      setShowSlowMessage(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSlowMessage(true);
    }, 8000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isBusy]);
  
  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setInputHint('');
    setErrorNotice(null);

    if (hasChineseText(input)) {
      setErrorNotice({ message: '请输入英文句子，不要包含中文。', action: 'analyze' });
      return;
    }

    setLoading(true);
    try {
      const data = await generateBreakdown(input);
      setBreakdown(data);
      setSlideDirection(1);
      setCurrentStepIdx(-1);
    } catch (err) {
      setErrorNotice({ message: getFriendlyErrorMessage(err, 'analyze'), action: 'analyze' });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (breakdown && currentStepIdx < breakdown.steps.length) {
      setSlideDirection(1);
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const handleGenerateSentence = async () => {
    setInputHint('');
    setErrorNotice(null);
    setGeneratingSentence(true);
    try {
      const sentence = await generateComplexSentence();
      setInput(sentence);
      setInputHint('Example generated. Review it, then click Analyze.');
    } catch (err) {
      setErrorNotice({ message: getFriendlyErrorMessage(err, 'generate'), action: 'generate' });
    } finally {
      setGeneratingSentence(false);
    }
  };

  const prevStep = () => {
    if (currentStepIdx > -1) {
      setSlideDirection(-1);
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const reset = () => {
    setBreakdown(null);
    setInput('');
    setInputHint('');
    setErrorNotice(null);
    setSlideDirection(-1);
    setCurrentStepIdx(-1);
  };

  const isSummary = breakdown && currentStepIdx === breakdown.steps.length;

  const totalPages = breakdown ? breakdown.steps.length + 2 : 0;
  const activePage = breakdown ? currentStepIdx + 2 : 0;
  const summaryFinalSpan = breakdown
    ? [
        (breakdown.steps.length - 1) % 2 === 0 ? 'md:col-span-2' : 'md:col-span-1',
        (breakdown.steps.length - 1) % 3 === 0
          ? 'xl:col-span-3'
          : (breakdown.steps.length - 1) % 3 === 1
            ? 'xl:col-span-2'
            : 'xl:col-span-1',
      ].join(' ')
    : '';
  const summarySteps = breakdown ? breakdown.steps.slice(0, -1) : [];
  const finalStep = breakdown ? breakdown.steps[breakdown.steps.length - 1] : null;
  const pageLabel = breakdown
    ? currentStepIdx === -1
      ? 'Base sentence'
      : currentStepIdx === breakdown.steps.length
        ? 'Final summary'
        : `Step ${currentStepIdx + 1} of ${breakdown.steps.length}`
    : '';

  const goToPage = (index: number) => {
    if (!breakdown) return;
    const nextStepIdx = index === 0
      ? -1
      : index === totalPages - 1
        ? breakdown.steps.length
        : index - 1;

    setSlideDirection(nextStepIdx >= currentStepIdx ? 1 : -1);
    setCurrentStepIdx(nextStepIdx);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className={`flex-grow flex flex-col items-center px-4 ${breakdown ? 'justify-start py-12 pb-28 md:justify-center md:py-20' : 'justify-center py-10 md:py-16'}`}>
        <AnimatePresence mode="wait">
          {!breakdown ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl w-full text-center"
            >
              <h1 className="text-6xl font-bold tracking-tight mb-4">Break down a complex English sentence</h1>
              <p className="text-xl text-ink-muted mb-12">Paste a sentence or generate an example, then rebuild it step by step.</p>

              {generatingSentence && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 mx-auto flex max-w-xl items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-primary ring-1 ring-primary/10"
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
              )}
              
              <div className="glass-card p-12 text-left mb-8 transition-all focus-within:border-primary/20 focus-within:shadow-[0_0_0_4px_rgba(0,78,159,0.08)]">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setInputHint('');
                    setErrorNotice(null);
                  }}
                  placeholder="Enter a complex English sentence here..."
                  className="w-full h-64 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-2xl text-ink placeholder:text-zinc-300 resize-none font-medium leading-normal"
                  id="sentence-input"
                />
              </div>

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 mx-auto flex max-w-xl items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 text-white shadow-lg"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 size={22} className="animate-spin" />
                  <div className="text-left">
                    <p className="text-base font-bold">Breaking down the sentence step by step...</p>
                    {showSlowMessage && (
                      <p className="mt-1 text-sm font-medium text-white/80">This may take a little longer for complex sentences.</p>
                    )}
                  </div>
                </motion.div>
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
                    onClick={errorNotice.action === 'generate' ? handleGenerateSentence : handleAnalyze}
                    disabled={loading || generatingSentence || (errorNotice.action === 'analyze' && !input.trim())}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-100 transition-all hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw size={15} />
                    Retry
                  </button>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleGenerateSentence}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 text-primary px-6 py-3 rounded-full text-base font-medium hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingSentence ? 'Generating...' : 'Generate an example'}
                  {generatingSentence && <Loader2 size={17} className="animate-spin" />}
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={isBusy || !input.trim()}
                  className="bg-primary text-white px-10 py-4 rounded-full text-lg font-medium shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  id="analyze-btn"
                >
                  {loading && !generatingSentence ? 'Analyzing...' : 'Analyze this sentence'}
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key={`step-${currentStepIdx}`}
              initial={{ opacity: 0, x: slideDirection * 180, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: slideDirection * -180, scale: 0.98 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[min(1440px,calc(100vw-48px))]"
            >
              <div className="mb-8 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    aria-label={`Go to page ${index + 1}`}
                    onClick={() => {
                      goToPage(index);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      index + 1 === activePage ? 'w-10 bg-primary' : 'w-1.5 bg-zinc-300 hover:bg-zinc-500'
                    }`}
                  />
                ))}
              </div>

              <p className="mb-6 text-center text-sm font-bold uppercase tracking-[0.18em] text-ink-muted">
                {pageLabel}
              </p>

              <button
                onClick={prevStep}
                disabled={currentStepIdx === -1}
                className="hidden md:flex absolute left-[-72px] top-1/2 z-20 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-zinc-900 ring-1 ring-black/5 backdrop-blur-xl transition-all hover:bg-white active:scale-95 disabled:opacity-20"
                aria-label="Previous card"
              >
                <ArrowLeft size={20} />
              </button>

              <button
                onClick={isSummary ? reset : nextStep}
                className="hidden md:flex absolute right-[-72px] top-1/2 z-20 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-all hover:brightness-110 active:scale-95"
                aria-label={isSummary ? 'Start over' : 'Next card'}
              >
                <ArrowRight size={20} />
              </button>

              {currentStepIdx === -1 && (
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
                    <p className="text-4xl md:text-5xl font-bold text-zinc-900 leading-tight tracking-tight">{breakdown.targetSentence}</p>
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
              )}

              {currentStepIdx >= 0 && currentStepIdx < breakdown.steps.length && (
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
                      <h3 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4 text-zinc-900">
                        {breakdown.steps[currentStepIdx].english}
                      </h3>
                      <p className="text-xl font-medium text-ink-muted">{breakdown.steps[currentStepIdx].chinese}</p>
                    </motion.div>

                    <motion.div
                      className="pt-12 border-t border-zinc-200 flex flex-col items-center gap-4"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.28, duration: 0.42 }}
                    >
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-focus-blue/10 text-focus-blue font-bold text-sm">
                        <Plus size={16} />
                        {currentStepIdx + 1} {breakdown.steps[currentStepIdx].label}
                      </span>
                      <p className="text-lg text-center font-medium text-zinc-800">
                        {breakdown.steps[currentStepIdx].explanation}
                      </p>
                    </motion.div>
                  </motion.div>
                </div>
              )}

              {isSummary && (
                <div className="flex flex-col items-center w-full">
                  <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-zinc-900 mb-4">Sentence Assembly</h1>
                    <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">The complete rebuild path from the base sentence to the final target.</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative mb-12 w-full max-w-[1320px]">

                    {summarySteps.map((step, index) => (
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
                          <p className="text-lg font-bold text-zinc-900 leading-snug">{step.english}</p>
                          <p className="text-sm text-zinc-500 font-medium leading-relaxed">{step.chinese}</p>
                          <p className="text-sm text-zinc-700 leading-relaxed">{step.explanation}</p>
                        </div>
                      </motion.article>
                    ))}

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
                      onClick={reset}
                      className="bg-primary text-white px-10 py-4 rounded-full text-lg font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all w-full md:w-auto"
                    >
                      Clear and start over
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {breakdown && (
        <footer className="md:hidden bg-white/80 backdrop-blur-md border-t border-zinc-200 fixed bottom-0 w-full h-20 flex items-center justify-between px-8 z-50">
          <button
            onClick={prevStep}
            disabled={currentStepIdx === -1}
            className="flex flex-col items-center gap-1 text-zinc-400 disabled:opacity-30"
          >
            <ArrowLeft size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Previous</span>
          </button>
          <button
            onClick={isSummary ? reset : nextStep}
            className="flex flex-col items-center gap-1 text-primary disabled:opacity-30"
          >
            <ArrowRight size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{isSummary ? 'Start over' : 'Next'}</span>
          </button>
        </footer>
      )}
    </div>
  );
}
