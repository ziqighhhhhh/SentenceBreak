import { useCallback, useEffect, useRef, useState } from 'react';
import { generateBreakdownStream, generateComplexSentenceStream } from '../services/aiService';
import { SentenceBreakdown } from '../types';

export type ErrorAction = 'analyze' | 'generate';

export interface ErrorNotice {
  message: string;
  action: ErrorAction;
}

const GENERATED_LINE_REVEAL_BASE_MS = 1000;
const GENERATED_LINE_REVEAL_DELAY_MS = 170;
const GENERATED_LINE_REVEAL_FALLBACK_LINES = 4;

function estimateRevealDuration(sentence: string): number {
  const estimatedLineCount = Math.max(
    1,
    Math.min(8, Math.ceil(sentence.length / 72) || GENERATED_LINE_REVEAL_FALLBACK_LINES),
  );

  return GENERATED_LINE_REVEAL_BASE_MS + GENERATED_LINE_REVEAL_DELAY_MS * Math.max(0, estimatedLineCount - 1);
}

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

export function useSentenceBreakdown() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingSentence, setGeneratingSentence] = useState(false);
  const [generatedRevealText, setGeneratedRevealText] = useState('');
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [inputHint, setInputHint] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [errorNotice, setErrorNotice] = useState<ErrorNotice | null>(null);
  const [expandedSummarySteps, setExpandedSummarySteps] = useState<ReadonlySet<number>>(new Set());
  const [cachedBreakdown, setCachedBreakdown] = useState<SentenceBreakdown | null>(null);
  const [breakdown, setBreakdown] = useState<SentenceBreakdown | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const generatedSentenceTimerRef = useRef<number | null>(null);
  const cachedBreakdownInputRef = useRef('');
  const pendingAnalysisRef = useRef<{
    input: string;
    promise: Promise<SentenceBreakdown>;
  } | null>(null);
  const isBusy = loading || generatingSentence;
  const isSummary = breakdown && currentStepIdx === breakdown.steps.length;

  const clearGeneratedSentenceTimer = useCallback(() => {
    if (generatedSentenceTimerRef.current !== null) {
      window.clearTimeout(generatedSentenceTimerRef.current);
      generatedSentenceTimerRef.current = null;
    }

    setGeneratedRevealText('');
  }, []);

  const revealGeneratedSentence = useCallback((sentence: string) => {
    clearGeneratedSentenceTimer();

    setInput('');
    setGeneratedRevealText(sentence);

    generatedSentenceTimerRef.current = window.setTimeout(() => {
      setInput(sentence);
      setGeneratedRevealText('');
      generatedSentenceTimerRef.current = null;
    }, estimateRevealDuration(sentence));
  }, [clearGeneratedSentenceTimer]);

  const cacheBreakdownForInput = useCallback(async (sentence: string, options: { silent?: boolean } = {}) => {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) return null;
    const silent = Boolean(options.silent);

    if (cachedBreakdown && cachedBreakdownInputRef.current === trimmedSentence) {
      return cachedBreakdown;
    }

    if (pendingAnalysisRef.current?.input === trimmedSentence) {
      const pendingAnalysis = pendingAnalysisRef.current;
      if (!silent) {
        setAnalysisProgress('Preparing cached analysis...');
        setLoading(true);
      }

      try {
        const data = await pendingAnalysis.promise;
        if (
          pendingAnalysisRef.current?.promise === pendingAnalysis.promise ||
          cachedBreakdownInputRef.current === trimmedSentence
        ) {
          return data;
        }
        return null;
      } catch (err) {
        if (!silent) {
          setErrorNotice({ message: getFriendlyErrorMessage(err, 'analyze'), action: 'analyze' });
        }
        return null;
      } finally {
        if (!silent) {
          setLoading(false);
          setAnalysisProgress('');
        }
      }
    }

    if (!silent) {
      setAnalysisProgress('Preparing analysis...');
      setLoading(true);
    }
    setErrorNotice(null);
    setCachedBreakdown(null);
    cachedBreakdownInputRef.current = '';
    const analysisPromise = generateBreakdownStream(
      trimmedSentence,
      silent ? () => undefined : setAnalysisProgress,
    );
    pendingAnalysisRef.current = {
      input: trimmedSentence,
      promise: analysisPromise,
    };

    try {
        const data = await analysisPromise;
      if (pendingAnalysisRef.current?.promise === analysisPromise) {
        setCachedBreakdown(data);
        cachedBreakdownInputRef.current = trimmedSentence;
        setExpandedSummarySteps(new Set());
        setSlideDirection(1);
        setCurrentStepIdx(-1);
        return data;
      }
      return null;
    } catch (err) {
      if (!silent) {
        setErrorNotice({ message: getFriendlyErrorMessage(err, 'analyze'), action: 'analyze' });
      }
      return null;
    } finally {
      if (pendingAnalysisRef.current?.promise === analysisPromise) {
        pendingAnalysisRef.current = null;
      }
      if (!silent) {
        setLoading(false);
        setAnalysisProgress('');
      }
    }
  }, [cachedBreakdown]);

  useEffect(() => {
    return () => {
      clearGeneratedSentenceTimer();
    };
  }, [clearGeneratedSentenceTimer]);

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

  const handleInputChange = useCallback((value: string) => {
    clearGeneratedSentenceTimer();
    setInput(value);
    setCachedBreakdown(null);
    cachedBreakdownInputRef.current = '';
    pendingAnalysisRef.current = null;
    setBreakdown(null);
    setExpandedSummarySteps(new Set());
    setInputHint('');
    setAnalysisProgress('');
    setErrorNotice(null);
    setSlideDirection(-1);
    setCurrentStepIdx(-1);
    setIsReviewMode(false);
  }, [clearGeneratedSentenceTimer]);

  const handleAnalyze = useCallback(async () => {
    if (!input.trim()) return;
    setInputHint('');
    setAnalysisProgress('Preparing analysis...');
    setErrorNotice(null);

    if (hasChineseText(input)) {
      setErrorNotice({ message: '请输入英文句子，不要包含中文。', action: 'analyze' });
      return;
    }

    const trimmedInput = input.trim();
    if (cachedBreakdown && cachedBreakdownInputRef.current === trimmedInput) {
      setBreakdown(cachedBreakdown);
      setExpandedSummarySteps(new Set());
      setInputHint('');
      setAnalysisProgress('');
      setErrorNotice(null);
      setSlideDirection(1);
      setCurrentStepIdx(-1);
      setIsReviewMode(false);
      return;
    }

    const data = await cacheBreakdownForInput(trimmedInput);
    if (data) {
      setBreakdown(data);
      setExpandedSummarySteps(new Set());
      setInputHint('');
      setSlideDirection(1);
      setCurrentStepIdx(-1);
      setIsReviewMode(false);
    }
  }, [cacheBreakdownForInput, cachedBreakdown, input]);

  const handleGenerateSentence = useCallback(async () => {
    clearGeneratedSentenceTimer();
    setInputHint('');
    setCachedBreakdown(null);
    cachedBreakdownInputRef.current = '';
    pendingAnalysisRef.current = null;
    setBreakdown(null);
    setExpandedSummarySteps(new Set());
    setErrorNotice(null);
    setGeneratingSentence(true);
    try {
      let streamedSentence = '';
      const sentence = await generateComplexSentenceStream((token) => {
        streamedSentence += token;
      });
      revealGeneratedSentence(sentence);
      void cacheBreakdownForInput(sentence, { silent: true });
    } catch (err) {
      setErrorNotice({ message: getFriendlyErrorMessage(err, 'generate'), action: 'generate' });
    } finally {
      setGeneratingSentence(false);
    }
  }, [cacheBreakdownForInput, clearGeneratedSentenceTimer, revealGeneratedSentence]);

  const startCachedBreakdown = useCallback(() => {
    if (!cachedBreakdown) return;

    setBreakdown(cachedBreakdown);
    setExpandedSummarySteps(new Set());
    setInputHint('');
    setAnalysisProgress('');
    setErrorNotice(null);
    setSlideDirection(1);
    setCurrentStepIdx(-1);
    setIsReviewMode(false);
  }, [cachedBreakdown]);

  const loadSavedBreakdown = useCallback((saved: SentenceBreakdown) => {
    clearGeneratedSentenceTimer();
    setBreakdown(saved);
    setExpandedSummarySteps(new Set());
    setInputHint('');
    setAnalysisProgress('');
    setErrorNotice(null);
    setSlideDirection(1);
    setCurrentStepIdx(saved.steps.length);
    setIsReviewMode(true);
  }, [clearGeneratedSentenceTimer]);

  const nextStep = useCallback(() => {
    if (breakdown && currentStepIdx < breakdown.steps.length) {
      setSlideDirection(1);
      setCurrentStepIdx((prev) => prev + 1);
    }
  }, [breakdown, currentStepIdx]);

  const prevStep = useCallback(() => {
    if (currentStepIdx > -1) {
      setSlideDirection(-1);
      setCurrentStepIdx((prev) => prev - 1);
    }
  }, [currentStepIdx]);

  const returnToEdit = useCallback(() => {
    setBreakdown(null);
    setInputHint('');
    setAnalysisProgress('');
    setErrorNotice(null);
    setSlideDirection(-1);
    setCurrentStepIdx(-1);
  }, []);

  const reset = useCallback(() => {
    clearGeneratedSentenceTimer();
    setBreakdown(null);
    setCachedBreakdown(null);
    cachedBreakdownInputRef.current = '';
    pendingAnalysisRef.current = null;
    setInput('');
    setExpandedSummarySteps(new Set());
    setInputHint('');
    setAnalysisProgress('');
    setErrorNotice(null);
    setSlideDirection(-1);
    setCurrentStepIdx(-1);
  }, [clearGeneratedSentenceTimer]);

  const clearError = useCallback(() => {
    setErrorNotice(null);
  }, []);

  const toggleSummaryStep = useCallback((index: number) => {
    setExpandedSummarySteps((current) => {
      const next = new Set(current);

      if (next.has(index)) {
        next.delete(index);
        return next;
      }

      next.add(index);
      return next;
    });
  }, []);

  const goToPage = useCallback((index: number) => {
    if (!breakdown) return;
    const totalPages = breakdown.steps.length + 2;
    const nextStepIdx = index === 0
      ? -1
      : index === totalPages - 1
        ? breakdown.steps.length
        : index - 1;

    setSlideDirection(nextStepIdx >= currentStepIdx ? 1 : -1);
    setCurrentStepIdx(nextStepIdx);
  }, [breakdown, currentStepIdx]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (!breakdown && cachedBreakdown && !isBusy) {
          event.preventDefault();
          startCachedBreakdown();
          return;
        }

        if (!breakdown && input.trim() && !isBusy) {
          event.preventDefault();
          void handleAnalyze();
        }
        return;
      }

      if (event.key === 'Escape') {
        if (errorNotice) {
          event.preventDefault();
          clearError();
          return;
        }

        if (breakdown) {
          event.preventDefault();
          returnToEdit();
        }
        return;
      }

      if (!breakdown) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevStep();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (isSummary) {
          reset();
          return;
        }
        nextStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [breakdown, cachedBreakdown, clearError, errorNotice, handleAnalyze, input, isBusy, isSummary, nextStep, prevStep, reset, returnToEdit, startCachedBreakdown]);

  return {
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
    isSummary,
    isReviewMode,
    handleInputChange,
    handleAnalyze,
    handleGenerateSentence,
    startCachedBreakdown,
    loadSavedBreakdown,
    nextStep,
    prevStep,
    reset,
    goToPage,
    toggleSummaryStep,
  };
}
