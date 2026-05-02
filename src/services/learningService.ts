import type { MasteryStatus, SavedLearningSession, SavedVocabularyEntry, SentenceBreakdown } from '../types';

export interface BetaSession {
  token: string;
  user: {
    id: string;
    nickname: string;
  };
  expiresAt: string;
}

interface ApiErrorResponse {
  error?: string;
}

interface LearningSessionsResponse {
  sessions?: SavedLearningSession[];
  error?: string;
}

interface VocabularyResponse {
  entries?: SavedVocabularyEntry[];
  error?: string;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function readJsonResponse<T extends ApiErrorResponse>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json() as T;
  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}

function isBetaSession(value: unknown): value is BetaSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BetaSession>;
  return (
    typeof candidate.token === 'string'
    && typeof candidate.expiresAt === 'string'
    && Boolean(candidate.user)
    && typeof candidate.user?.id === 'string'
    && typeof candidate.user?.nickname === 'string'
  );
}

export async function enterBeta(inviteCode: string, nickname: string): Promise<BetaSession> {
  const response = await fetch('/api/test-users/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode, nickname }),
  });

  const data = await response.json() as ApiErrorResponse | BetaSession;
  if (!response.ok) {
    throw new Error('error' in data && data.error ? data.error : 'Unable to enter beta.');
  }

  if (!isBetaSession(data)) {
    throw new Error('Beta session response was invalid.');
  }

  return data;
}

export async function saveLearningSession(token: string, breakdown: SentenceBreakdown): Promise<{ id: string; saved: true }> {
  const response = await fetch('/api/learning-sessions', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ breakdown }),
  });

  return readJsonResponse<{ id: string; saved: true; error?: string }>(response, 'Unable to save learning session.');
}

export async function listLearningSessions(token: string): Promise<SavedLearningSession[]> {
  const response = await fetch('/api/learning-sessions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readJsonResponse<LearningSessionsResponse>(response, 'Unable to load learning sessions.');
  return data.sessions ?? [];
}

export async function listVocabulary(token: string): Promise<SavedVocabularyEntry[]> {
  const response = await fetch('/api/vocabulary', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readJsonResponse<VocabularyResponse>(response, 'Unable to load vocabulary.');
  return data.entries ?? [];
}

export async function updateVocabularyMastery(token: string, id: string, masteryStatus: MasteryStatus): Promise<void> {
  const response = await fetch(`/api/vocabulary/${id}/mastery`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ masteryStatus }),
  });

  await readJsonResponse<ApiErrorResponse>(response, 'Unable to update mastery status.');
}
