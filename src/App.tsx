import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, CheckCircle2, BookOpen, Type, Plus } from 'lucide-react';
import { generateBreakdown } from './services/aiService';
import { SentenceBreakdown } from './types';

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<SentenceBreakdown | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1); // -1 is the "Page 1" (Target + Garbage)
  const [slideDirection, setSlideDirection] = useState(1);
  
  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const data = await generateBreakdown(input);
      setBreakdown(data);
      setSlideDirection(1);
      setCurrentStepIdx(-1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error generating breakdown');
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

  const prevStep = () => {
    if (currentStepIdx > -1) {
      setSlideDirection(-1);
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const reset = () => {
    setBreakdown(null);
    setInput('');
    setSlideDirection(-1);
    setCurrentStepIdx(-1);
  };

  const isSummary = breakdown && currentStepIdx === breakdown.steps.length;

  const totalPages = breakdown ? breakdown.steps.length + 2 : 0;
  const activePage = breakdown ? currentStepIdx + 2 : 0;

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
      <main className={`flex-grow flex flex-col items-center justify-center px-4 ${breakdown ? 'py-12 md:py-20' : 'py-10 md:py-16'}`}>
        <AnimatePresence mode="wait">
          {!breakdown ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl w-full text-center"
            >
              <h1 className="text-6xl font-bold tracking-tight mb-4">What shall we analyze today?</h1>
              <p className="text-xl text-ink-muted mb-12">Paste your sentence below to begin the analysis process.</p>
              
              <div className="glass-card p-12 text-left mb-8">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter a complex English sentence here..."
                  className="w-full h-64 bg-transparent border-none focus:ring-0 text-2xl text-ink placeholder:text-zinc-300 resize-none font-medium leading-normal"
                  id="sentence-input"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading || !input.trim()}
                className="bg-primary text-white px-10 py-4 rounded-full text-lg font-medium shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                id="analyze-btn"
              >
                {loading ? 'Analyzing...' : 'Analyze Sentence'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key={`step-${currentStepIdx}`}
              initial={{ opacity: 0, x: slideDirection * 180, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: slideDirection * -180, scale: 0.98 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-[980px] w-full"
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
                    className="relative w-full max-w-3xl bg-white p-16 mb-12 overflow-hidden text-center"
                    initial={{ opacity: 0, y: 28, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="text-4xl md:text-5xl font-bold text-zinc-900 leading-tight tracking-tight">{breakdown.targetSentence}</p>
                  </motion.div>

                  <motion.div
                    className="flex flex-col items-center gap-6 w-full max-w-3xl"
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
                    className="relative w-full max-w-4xl bg-[#f5f5f7] p-12 md:p-20 overflow-hidden text-center"
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
                <div className="flex flex-col items-center">
                  <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-zinc-900 mb-4">Sentence Assembly</h1>
                    <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">Understanding how simple components construct complex meaning.</p>
                  </header>

                  <div className="flex flex-col gap-6 relative mb-16 w-full max-w-[640px]">
                    <div className="absolute left-10 top-12 bottom-12 w-0.5 bg-zinc-200 z-0" />
                    
                    <div className="relative z-10 bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm flex items-start gap-6">
                      <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100">
                        <span className="text-xl font-bold text-primary">01</span>
                      </div>
                      <div>
                        <span className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">The Core</span>
                        <p className="text-xl font-bold text-zinc-900 mb-1">{breakdown.steps[0].english}</p>
                        <p className="text-zinc-500 font-medium">The fundamental subject-verb-object structure. The absolute minimum required for a complete thought.</p>
                      </div>
                    </div>

                    <div className="relative z-10 bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm flex items-start gap-6">
                      <div className="w-16 h-16 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0 border border-secondary-fixed">
                        <span className="text-xl font-bold text-primary">02</span>
                      </div>
                      <div>
                        <span className="text-[12px] font-bold text-primary uppercase tracking-widest block mb-1">The Additions</span>
                        <p className="text-xl font-bold text-zinc-900 mb-1">+{breakdown.steps.length - 1} Modifier Layers</p>
                        <p className="text-zinc-500 font-medium">Progressive layers of adjectives, phrases, and clauses adding depth and context.</p>
                      </div>
                    </div>

                    <div className="relative z-10 bg-primary rounded-2xl p-8 shadow-2xl flex items-start gap-6">
                      <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                        <CheckCircle2 size={32} className="text-white" />
                      </div>
                      <div className="text-white">
                        <span className="text-[12px] font-bold text-primary-fixed uppercase tracking-widest block mb-1">The Full Synthesis</span>
                        <p className="text-2xl font-bold mb-3 leading-tight">{breakdown.targetSentence}</p>
                        <p className="opacity-80 font-medium">Modifiers, core structures, and prepositional phrases unite into a singular, vivid narrative image.</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-[640px] bg-zinc-100 rounded-3xl p-12 text-center border border-zinc-200">
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
                      Complete Exercise
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <footer className="md:hidden bg-white/80 backdrop-blur-md border-t border-zinc-200 fixed bottom-0 w-full h-20 flex items-center justify-between px-8 z-50">
        <button 
          onClick={prevStep}
          disabled={!breakdown || currentStepIdx === -1}
          className="flex flex-col items-center gap-1 text-zinc-400 disabled:opacity-30"
        >
          <ArrowLeft size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Previous</span>
        </button>
        <button 
          onClick={nextStep}
          disabled={!breakdown || isSummary}
          className="flex flex-col items-center gap-1 text-primary disabled:opacity-30"
        >
          <ArrowRight size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Next</span>
        </button>
      </footer>
    </div>
  );
}
