import { AnimatePresence } from 'motion/react';
import { BreakdownPager } from './components/BreakdownPager';
import { LandingView } from './components/LandingView';
import { useSentenceBreakdown } from './hooks/useSentenceBreakdown';

export default function App() {
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

  return (
    <div className="flex flex-col min-h-screen">
      <main className={`flex-grow flex flex-col items-center px-4 ${breakdown ? 'justify-start py-12 pb-28 md:justify-center md:py-20' : 'justify-center py-10 md:py-16'}`}>
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
      </main>
    </div>
  );
}
