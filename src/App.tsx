import { AnimatePresence } from 'motion/react';
import { BookOpen, LogOut, PenLine } from 'lucide-react';
import { useState } from 'react';
import { BreakdownPager } from './components/BreakdownPager';
import { BetaLoginView } from './components/BetaLoginView';
import { LandingView } from './components/LandingView';
import { useBetaSession } from './hooks/useBetaSession';
import { useSentenceBreakdown } from './hooks/useSentenceBreakdown';

type AppView = 'breakdown' | 'learning';

export default function App() {
  const betaSession = useBetaSession();
  const [activeView, setActiveView] = useState<AppView>('breakdown');
  const sentenceBreakdown = useSentenceBreakdown();
  const {
    input,
    loading,
    generatingSentence,
    generatedRevealText,
    showSlowMessage,
    inputHint,
    analysisProgress,
    errorNotice,
    expandedSummarySteps,
    cachedBreakdown,
    breakdown,
    currentStepIdx,
    slideDirection,
    isBusy,
    handleInputChange,
    handleAnalyze,
    handleGenerateSentence,
    startCachedBreakdown,
    nextStep,
    prevStep,
    reset,
    goToPage,
    toggleSummaryStep,
  } = sentenceBreakdown;

  if (betaSession.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-full bg-white px-5 py-3 text-sm font-bold text-primary shadow-[3px_5px_30px_rgba(0,0,0,0.08)]">
          Loading beta session...
        </div>
      </main>
    );
  }

  if (!betaSession.session) {
    return (
      <BetaLoginView
        error={betaSession.error}
        submitting={betaSession.submitting}
        onLogin={betaSession.login}
        onClearError={() => betaSession.setError('')}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveView('breakdown')}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-left transition-all hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Open sentence breakdown"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
              <PenLine size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">SentenceBreak</span>
              <span className="block text-xs font-semibold text-ink-muted">Beta workspace</span>
            </span>
          </button>

          <nav className="flex items-center gap-2" aria-label="Workspace navigation">
            <button
              type="button"
              onClick={() => setActiveView('breakdown')}
              aria-pressed={activeView === 'breakdown'}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition-all ${
                activeView === 'breakdown'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-ink-muted hover:bg-zinc-100 hover:text-ink'
              }`}
            >
              Analyze
            </button>
            <button
              type="button"
              onClick={() => setActiveView('learning')}
              aria-pressed={activeView === 'learning'}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition-all ${
                activeView === 'learning'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-ink-muted hover:bg-zinc-100 hover:text-ink'
              }`}
            >
              <BookOpen size={16} />
              My Learning
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <span className="max-w-[160px] truncate rounded-full bg-canvas-parchment px-4 py-2 text-sm font-bold text-ink">
              {betaSession.session.user.nickname}
            </span>
            <button
              type="button"
              onClick={betaSession.logout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-all hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-100"
              aria-label="Log out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className={`flex-grow flex flex-col items-center px-4 ${breakdown && activeView === 'breakdown' ? 'justify-start py-12 pb-28 md:justify-center md:py-20' : 'justify-center py-10 md:py-16'}`}>
        {activeView === 'learning' ? (
          <PlaceholderLearningView nickname={betaSession.session.user.nickname} />
        ) : (
          <AnimatePresence mode="wait">
            {!breakdown ? (
              <LandingView
                input={input}
                loading={loading}
                generatingSentence={generatingSentence}
                generatedRevealText={generatedRevealText}
                isBusy={isBusy}
                showSlowMessage={showSlowMessage}
                inputHint={inputHint}
                analysisProgress={analysisProgress}
                errorNotice={errorNotice}
                analysisReady={Boolean(cachedBreakdown)}
                onInputChange={handleInputChange}
                onAnalyze={handleAnalyze}
                onGenerateSentence={handleGenerateSentence}
                onStartBreakdown={startCachedBreakdown}
              />
            ) : (
              <BreakdownPager
                breakdown={breakdown}
                currentStepIdx={currentStepIdx}
                slideDirection={slideDirection}
                expandedSummarySteps={expandedSummarySteps}
                onGoToPage={goToPage}
                onNextStep={nextStep}
                onPrevStep={prevStep}
                onReset={reset}
                onToggleSummaryStep={toggleSummaryStep}
              />
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

function PlaceholderLearningView({ nickname }: { nickname: string }) {
  return (
    <section className="w-full max-w-3xl rounded-[24px] border border-hairline bg-white p-8 text-center shadow-[3px_5px_30px_rgba(0,0,0,0.08)] sm:p-12">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary">
        <BookOpen size={24} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-ink">My Learning</h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-muted">
        {nickname}, your saved sentence history and vocabulary review will appear here after you complete a breakdown.
      </p>
    </section>
  );
}
