import { useCallback, useEffect, useRef, useState } from 'react';
import type { MasteryStatus, SavedLearningSession, SavedVocabularyEntry, SentenceBreakdown } from '../types';
import {
  listLearningSessions,
  listVocabulary,
  saveLearningSession,
  updateVocabularyMastery,
} from '../services/learningService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export function useLearningRecords(token: string | null) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [sessions, setSessions] = useState<SavedLearningSession[]>([]);
  const [vocabulary, setVocabulary] = useState<SavedVocabularyEntry[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const savedBreakdownRef = useRef('');
  const inFlightBreakdownRef = useRef('');
  const pendingBreakdownRef = useRef<SentenceBreakdown | null>(null);

  const loadRecords = useCallback(async () => {
    if (!token) return;

    setLoadingRecords(true);
    setRecordsError('');
    try {
      const [nextSessions, nextVocabulary] = await Promise.all([
        listLearningSessions(token),
        listVocabulary(token),
      ]);
      setSessions(nextSessions);
      setVocabulary(nextVocabulary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load learning records.';
      setRecordsError(message);
    } finally {
      setLoadingRecords(false);
    }
  }, [token]);

  const saveBreakdown = useCallback(async (breakdown: SentenceBreakdown) => {
    if (!token) return;

    const key = `${breakdown.targetSentence}::${breakdown.steps.length}`;
    if (savedBreakdownRef.current === key || inFlightBreakdownRef.current === key) {
      return;
    }

    inFlightBreakdownRef.current = key;
    pendingBreakdownRef.current = breakdown;
    setSaveStatus('saving');
    setSaveError('');

    try {
      await saveLearningSession(token, breakdown);
      savedBreakdownRef.current = key;
      pendingBreakdownRef.current = null;
      setSaveStatus('saved');
      await loadRecords();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save learning session.';
      setSaveError(message);
      setSaveStatus('failed');
    } finally {
      if (inFlightBreakdownRef.current === key) {
        inFlightBreakdownRef.current = '';
      }
    }
  }, [loadRecords, token]);

  const retrySave = useCallback(async () => {
    if (pendingBreakdownRef.current) {
      await saveBreakdown(pendingBreakdownRef.current);
    }
  }, [saveBreakdown]);

  const updateMastery = useCallback(async (id: string, masteryStatus: MasteryStatus) => {
    if (!token) return;

    setVocabulary((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, masteryStatus } : entry)),
    );

    try {
      await updateVocabularyMastery(token, id, masteryStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update mastery status.';
      setRecordsError(message);
      await loadRecords();
    }
  }, [loadRecords, token]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!token) {
      setSaveStatus('idle');
      setSaveError('');
      setSessions([]);
      setVocabulary([]);
      savedBreakdownRef.current = '';
      inFlightBreakdownRef.current = '';
      pendingBreakdownRef.current = null;
    }
  }, [token]);

  return {
    saveStatus,
    saveError,
    sessions,
    vocabulary,
    loadingRecords,
    recordsError,
    loadRecords,
    saveBreakdown,
    retrySave,
    updateMastery,
  };
}
