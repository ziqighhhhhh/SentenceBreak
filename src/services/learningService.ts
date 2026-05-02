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
