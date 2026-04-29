import { useCallback, useEffect, useState } from 'react';
import { generateBreakdown, generateComplexSentence } from '../services/aiService';
import { SentenceBreakdown } from '../types';

export type ErrorAction = 'analyze' | 'generate';

export interface ErrorNotice {
  message: string;
  action: ErrorAction;
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
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [inputHint, setInputHint] = useState('');
  const [errorNotice, setErrorNotice] = useState<ErrorNotice | null>(null);
  const [expandedSummarySteps, setExpandedSummarySteps] = useState<ReadonlySet<number>>(new Set());
  const [breakdown, setBreakdown] = useState<SentenceBreakdown | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [slideDirection, setSlideDirection] = useState(1);
  const isBusy = loading || generatingSentence;
  const isSummary = breakdown && currentStepIdx === breakdown.steps.length;

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
    setInput(value);
    setInputHint('');
    setErrorNotice(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
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
      setExpandedSummarySteps(new Set());
      setSlideDirection(1);
      setCurrentStepIdx(-1);
    } catch (err) {
      setErrorNotice({ message: getFriendlyErrorMessage(err, 'analyze'), action: 'analyze' });
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleGenerateSentence = useCallback(async () => {
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
  }, []);

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
    setErrorNotice(null);
    setSlideDirection(-1);
    setCurrentStepIdx(-1);
  }, []);

  const reset = useCallback(() => {
    setBreakdown(null);
    setInput('');
    setExpandedSummarySteps(new Set());
    setInputHint('');
    setErrorNotice(null);
    setSlideDirection(-1);
    setCurrentStepIdx(-1);
  }, []);

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
  }, [breakdown, clearError, errorNotice, handleAnalyze, input, isBusy, isSummary, nextStep, prevStep, reset, returnToEdit]);

  return {
    input,
    loading,
    generatingSentence,
    showSlowMessage,
    inputHint,
    errorNotice,
    expandedSummarySteps,
    breakdown,
    currentStepIdx,
    slideDirection,
    isBusy,
    isSummary,
    handleInputChange,
    handleAnalyze,
    handleGenerateSentence,
    nextStep,
    prevStep,
    reset,
    goToPage,
    toggleSummaryStep,
  };
}
