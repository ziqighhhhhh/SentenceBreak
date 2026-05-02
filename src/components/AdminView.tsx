import { KeyRound, Loader2, Plus, RotateCw, Shield, Trash2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import type { UserRole } from '../types';
import type { AdminInviteCode, AdminUser } from '../types';

interface AdminViewProps {
  inviteCodes: AdminInviteCode[];
  users: AdminUser[];
  loading: boolean;
  error: string;
  generateCount: number;
  onGenerateCountChange: (count: number) => void;
  onGenerate: () => void;
  onDeleteCode: (code: string) => void;
  onUpdateRole: (userId: string, role: UserRole) => void;
  onReload: () => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function AdminView({
  inviteCodes,
  users,
  loading,
  error,
  generateCount,
  onGenerateCountChange,
  onGenerate,
  onDeleteCode,
  onUpdateRole,
  onReload,
}: AdminViewProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl"
    >
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-ink">Admin Panel</h1>
          <p className="mt-2 text-base font-medium text-ink-muted">Manage invite codes and user roles.</p>
        </div>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-primary ring-1 ring-hairline transition-all hover:bg-primary/5"
        >
          <RotateCw size={15} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
          {error}
        </div>
      )}

      {loading && inviteCodes.length === 0 && users.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          <InviteCodesSection
            codes={inviteCodes}
            generateCount={generateCount}
            onGenerateCountChange={onGenerateCountChange}
            onGenerate={onGenerate}
            onDelete={onDeleteCode}
          />
          <UsersSection users={users} onUpdateRole={onUpdateRole} />
        </div>
      )}
    </motion.section>
  );
}

function InviteCodesSection({
  codes,
  generateCount,
  onGenerateCountChange,
  onGenerate,
  onDelete,
}: {
  codes: AdminInviteCode[];
  generateCount: number;
  onGenerateCountChange: (count: number) => void;
  onGenerate: () => void;
  onDelete: (code: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-hairline bg-white p-6 shadow-[3px_5px_30px_rgba(0,0,0,0.08)] sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <KeyRound size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-ink">Invite Codes</h2>
          <p className="text-sm font-medium text-ink-muted">{codes.length} code{codes.length !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={1}
          max={50}
          value={generateCount}
          onChange={(e) => onGenerateCountChange(Math.min(Math.max(Number(e.target.value) || 1, 1), 50))}
          className="h-10 w-20 rounded-xl border border-hairline bg-canvas-parchment px-3 text-sm font-semibold text-ink text-center outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
        />
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
        >
          <Plus size={15} />
          Generate
        </button>
      </div>

      {codes.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-ink-muted">No invite codes yet.</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-hairline">
                <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-ink-muted text-xs">Code</th>
                <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-ink-muted text-xs">Created By</th>
                <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-ink-muted text-xs">Created</th>
                <th className="pb-3 font-bold uppercase tracking-wider text-ink-muted text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className="border-b border-hairline/50 transition-colors hover:bg-canvas-parchment/60">
                  <td className="py-3 pr-4">
                    <code className="rounded-lg bg-canvas-parchment px-2 py-1 font-mono text-sm font-bold text-ink">{c.code}</code>
                  </td>
                  <td className="py-3 pr-4 font-medium text-ink-muted">{c.createdByNickname}</td>
                  <td className="py-3 pr-4 font-medium text-ink-muted">{formatDate(c.createdAt)}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(c.code)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-all hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete code ${c.code}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsersSection({
  users,
  onUpdateRole,
}: {
  users: AdminUser[];
  onUpdateRole: (userId: string, role: UserRole) => void;
}) {
  return (
    <div className="rounded-[24px] border border-hairline bg-white p-6 shadow-[3px_5px_30px_rgba(0,0,0,0.08)] sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Users size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-ink">Users</h2>
          <p className="text-sm font-medium text-ink-muted">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-ink-muted">No users yet.</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-hairline">
                <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-ink-muted text-xs">Nickname</th>
                <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-ink-muted text-xs">Invite Code</th>
                <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-ink-muted text-xs">Role</th>
                <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-ink-muted text-xs">Last Seen</th>
                <th className="pb-3 font-bold uppercase tracking-wider text-ink-muted text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-hairline/50 transition-colors hover:bg-canvas-parchment/60">
                  <td className="py-3 pr-4 font-semibold text-ink">{u.nickname}</td>
                  <td className="py-3 pr-4">
                    <code className="rounded-lg bg-canvas-parchment px-2 py-1 font-mono text-xs font-bold text-ink-muted">{u.inviteCode}</code>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      u.role === 'admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-zinc-100 text-ink-muted'
                    }`}>
                      {u.role === 'admin' && <Shield size={11} />}
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium text-ink-muted">{formatDate(u.lastSeenAt)}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all ${
                        u.role === 'admin'
                          ? 'bg-zinc-100 text-ink-muted hover:bg-red-50 hover:text-red-600'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      <Shield size={11} />
                      {u.role === 'admin' ? 'Demote' : 'Promote'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
