import { useCallback, useEffect, useMemo, useState } from 'react';
import { enterBeta, type BetaSession } from '../services/learningService';

const STORAGE_KEY = 'sentencebreak.betaSession';

function isStoredBetaSession(value: unknown): value is BetaSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BetaSession>;
  return (
    typeof candidate.token === 'string'
    && typeof candidate.expiresAt === 'string'
    && Number.isFinite(Date.parse(candidate.expiresAt))
    && Boolean(candidate.user)
    && typeof candidate.user?.id === 'string'
    && typeof candidate.user?.nickname === 'string'
    && typeof candidate.user?.role === 'string'
  );
}

function readStoredSession(): BetaSession | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!isStoredBetaSession(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function useBetaSession() {
  const [session, setSession] = useState<BetaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSession(readStoredSession());
    setLoading(false);
  }, []);

  const login = useCallback(async (inviteCode: string, nickname: string) => {
    setSubmitting(true);
    setError('');

    try {
      const nextSession = await enterBeta(inviteCode, nickname);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to enter beta.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setError('');
  }, []);

  return useMemo(
    () => ({ session, loading, submitting, error, setError, login, logout }),
    [error, loading, login, logout, session, submitting],
  );
}
