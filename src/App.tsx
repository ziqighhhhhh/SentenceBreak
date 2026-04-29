import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  ExternalLink, 
  BookOpen, 
  Type, 
  HelpCircle, 
  Settings,
  Plus,
  CircleUser
} from 'lucide-react';
import { generateBreakdown } from './services/aiService';
import { SentenceBreakdown, BreakdownStep } from './types';

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<SentenceBreakdown | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1); // -1 is the "Page 1" (Target + Garbage)
  
  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const data = await generateBreakdown(input);
      setBreakdown(data);
      setCurrentStepIdx(-1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error generating breakdown');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (breakdown && currentStepIdx < breakdown.steps.length) {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIdx > -1) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const reset = () => {
    setBreakdown(null);
    setInput('');
    setCurrentStepIdx(-1);
  };

  const isSummary = breakdown && currentStepIdx === breakdown.steps.length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Global Header */}
      <header className="bg-black text-white h-11 flex items-center justify-between px-6 fixed top-0 w-full z-50">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold tracking-widest uppercase">Linguist Pro</span>
          <nav className="hidden md:flex gap-6 text-[12px] font-medium text-zinc-400">
            <button className="hover:text-white transition-colors">Curriculum</button>
            <button className="hover:text-white transition-colors">Library</button>
            <button className="text-white">Practice</button>
            <button className="hover:text-white transition-colors">Analysis</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <HelpCircle size={18} className="text-zinc-400 cursor-pointer hover:text-white" />
          <Settings size={18} className="text-zinc-400 cursor-pointer hover:text-white" />
          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
             <CircleUser size={20} className="text-zinc-400" />
          </div>
        </div>
      </header>

      {/* Sub Header / Breadcrumbs */}
      {breakdown && (
        <nav className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 h-14 flex items-center justify-between px-8 fixed top-11 w-full z-40">
          <div className="flex items-center gap-8">
            <span className="text-base font-medium text-zinc-900">Sentence Breakdown</span>
            <div className="hidden md:flex gap-6 h-full items-center text-[13px] font-medium uppercase tracking-widest text-zinc-400">
              <span className={`${currentStepIdx === -1 ? 'text-primary border-b-2 border-primary' : ''} pb-1 cursor-pointer transition-colors`} onClick={() => setCurrentStepIdx(-1)}>Step 1</span>
              {breakdown.steps.slice(1).map((_, i) => (
                <span 
                  key={i} 
                  className={`${currentStepIdx === i + 1 ? 'text-primary border-b-2 border-primary' : ''} pb-1 cursor-pointer transition-colors`}
                  onClick={() => setCurrentStepIdx(i + 1)}
                >
                  Step {i + 2}
                </span>
              ))}
              <span 
                className={`${isSummary ? 'text-primary border-b-2 border-primary' : ''} pb-1 cursor-pointer transition-colors`}
                onClick={() => setCurrentStepIdx(breakdown.steps.length)}
              >
                Summary
              </span>
            </div>
          </div>
          <div>
            {!isSummary ? (
              <button 
                onClick={nextStep}
                className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-80 active:scale-95 transition-all"
              >
                Next
              </button>
            ) : (
              <button 
                onClick={reset}
                className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-80 active:scale-95 transition-all"
              >
                New Scan
              </button>
            )}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className={`flex-grow flex flex-col items-center justify-center px-4 ${breakdown ? 'pt-28 pb-12' : 'pt-11'}`}>
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-[980px] w-full"
            >
              {currentStepIdx === -1 && (
                <div className="flex flex-col items-center">
                  <div className="text-center mb-12">
                    <span className="text-ink-muted text-xl font-semibold mb-2 block tracking-tight uppercase">{breakdown.sourceLabel}</span>
                  </div>
                  
                  <h2 className="text-primary text-xl font-semibold mb-6">Read the full sentence first</h2>
                  
                  <div className="glass-card relative w-full max-w-3xl border border-zinc-200 bg-white/50 backdrop-blur-md p-16 mb-12 overflow-hidden text-center">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary opacity-5 blur-[80px] rounded-full" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-focus-blue opacity-5 blur-[80px] rounded-full" />
                    <p className="text-4xl md:text-5xl font-bold text-zinc-900 leading-tight tracking-tight">{breakdown.targetSentence}</p>
                  </div>

                  <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
                    <h2 className="text-primary text-xl font-semibold">Then start from the base sentence</h2>
                    <div className="w-full bg-zinc-100/50 rounded-2xl border border-zinc-200 p-8 text-center">
                      <p className="text-3xl font-bold text-zinc-900 leading-tight tracking-tight mb-4">{breakdown.steps[0].english}</p>
                      <p className="text-lg text-ink-muted leading-relaxed font-medium">{breakdown.steps[0].chinese}</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStepIdx >= 0 && currentStepIdx < breakdown.steps.length && (
                <div className="flex flex-col items-center">
                  <div className="glass-card relative w-full max-w-4xl border border-zinc-200 bg-[#f5f5f7] p-16 overflow-hidden">
                    <div className="text-center">
                      <p className="text-zinc-500 font-bold mb-1">Once the previous page is clear</p>
                      <p className="text-xl font-bold text-zinc-900 mb-12">you can understand this one</p>
                    </div>

                    <div className="mb-12 text-center">
                      <h3 className="text-4xl md:text-5xl font-bold text-zinc-900 leading-tight tracking-tight mb-4">
                        {breakdown.steps[currentStepIdx].english}
                      </h3>
                      <p className="text-xl text-ink-muted font-medium">{breakdown.steps[currentStepIdx].chinese}</p>
                    </div>

                    <div className="pt-12 border-t border-zinc-200 flex flex-col items-center gap-4">
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-focus-blue/10 text-focus-blue font-bold text-sm">
                        <Plus size={16} />
                        {currentStepIdx + 1} {breakdown.steps[currentStepIdx].label}
                      </span>
                      <p className="text-lg text-zinc-800 text-center font-medium">
                        {breakdown.steps[currentStepIdx].explanation}
                      </p>
                    </div>
                  </div>
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
