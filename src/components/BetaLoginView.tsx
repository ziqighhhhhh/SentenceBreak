import { type FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface BetaLoginViewProps {
  error: string;
  submitting: boolean;
  onLogin: (inviteCode: string, nickname: string) => Promise<void>;
  onClearError: () => void;
}

export function BetaLoginView({ error, submitting, onLogin, onClearError }: BetaLoginViewProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [nickname, setNickname] = useState('');

  const canSubmit = inviteCode.trim().length > 0 && nickname.trim().length > 0 && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    await onLogin(inviteCode.trim(), nickname.trim());
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] rounded-[24px] border border-hairline bg-white p-7 shadow-[3px_5px_30px_rgba(0,0,0,0.12)] sm:p-9"
      >
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <LockKeyhole size={22} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-ink">Enter SentenceBreak beta</h1>
        <p className="mt-3 text-base leading-7 text-ink-muted">
          Use your invite code and a nickname to keep this testing session available on this browser.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="invite-code" className="mb-2 block text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">
              Invite code
            </label>
            <input
              id="invite-code"
              value={inviteCode}
              onChange={(event) => {
                onClearError();
                setInviteCode(event.target.value);
              }}
              autoComplete="one-time-code"
              className="h-12 w-full rounded-2xl border border-hairline bg-canvas-parchment px-4 text-base font-semibold text-ink outline-none transition-all placeholder:text-zinc-400 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10"
              placeholder="alpha2026"
            />
          </div>

          <div>
            <label htmlFor="nickname" className="mb-2 block text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">
              Nickname
            </label>
            <input
              id="nickname"
              value={nickname}
              onChange={(event) => {
                onClearError();
                setNickname(event.target.value);
              }}
              autoComplete="nickname"
              maxLength={40}
              className="h-12 w-full rounded-2xl border border-hairline bg-canvas-parchment px-4 text-base font-semibold text-ink outline-none transition-all placeholder:text-zinc-400 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10"
              placeholder="Alice"
            />
          </div>

          {error && (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-base font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Entering...
              </>
            ) : (
              <>
                Enter beta
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </motion.section>
    </main>
  );
}
