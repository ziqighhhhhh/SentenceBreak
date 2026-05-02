import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Loader2, RotateCw, Type, Volume2 } from 'lucide-react';
import type { MasteryStatus, SavedLearningSession, SavedVocabularyEntry, SentenceBreakdown } from '../types';
import { speakText } from '../utils/speech';

interface MyLearningViewProps {
  sessions: readonly SavedLearningSession[];
  vocabulary: readonly SavedVocabularyEntry[];
  loading: boolean;
  error: string;
  onReload: () => void;
  onUpdateMastery: (id: string, masteryStatus: MasteryStatus) => void;
  onSelectSession: (breakdown: SentenceBreakdown) => void;
}

type LearningTab = 'sentences' | 'vocabulary';
type VocabularyFilter = 'all' | MasteryStatus;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function masteryLabel(status: MasteryStatus) {
  if (status === 'new') return 'New';
  if (status === 'reviewing') return 'Reviewing';
  return 'Mastered';
}

export function MyLearningView({
  sessions,
  vocabulary,
  loading,
  error,
  onReload,
  onUpdateMastery,
  onSelectSession,
}: MyLearningViewProps) {
  const [activeTab, setActiveTab] = useState<LearningTab>('sentences');
  const [filter, setFilter] = useState<VocabularyFilter>('all');
  const [expandedVocabulary, setExpandedVocabulary] = useState<ReadonlySet<string>>(new Set());

  const filteredVocabulary = useMemo(() => {
    if (filter === 'all') return vocabulary;
    return vocabulary.filter((entry) => entry.masteryStatus === filter);
  }, [filter, vocabulary]);

  return (
    <section className="w-full max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-ink">My Learning</h1>
          <p className="mt-2 text-base font-medium text-ink-muted">Review saved breakdowns and the vocabulary collected from them.</p>
        </div>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-primary ring-1 ring-hairline transition-all hover:bg-primary/5"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
          Refresh
        </button>
      </div>

      {error && (
        <p className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      )}

      <div className="mb-6 inline-flex rounded-full bg-white p-1 ring-1 ring-hairline">
        <button
          type="button"
          onClick={() => setActiveTab('sentences')}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold transition-all ${
            activeTab === 'sentences' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          <BookOpen size={16} />
          Sentences
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vocabulary')}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold transition-all ${
            activeTab === 'vocabulary' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Type size={16} />
          Vocabulary
        </button>
      </div>

      {activeTab === 'sentences' ? (
        <SentenceHistory sessions={sessions} loading={loading} onSelectSession={onSelectSession} />
      ) : (
        <VocabularyHistory
          vocabulary={filteredVocabulary}
          filter={filter}
          expandedVocabulary={expandedVocabulary}
          loading={loading}
          onFilterChange={setFilter}
          onToggleExpanded={(id) => {
            setExpandedVocabulary((current) => {
              const next = new Set(current);
              if (next.has(id)) {
                next.delete(id);
                return next;
              }
              next.add(id);
              return next;
            });
          }}
          onUpdateMastery={onUpdateMastery}
        />
      )}
    </section>
  );
}

function SentenceHistory({ sessions, loading, onSelectSession }: { sessions: readonly SavedLearningSession[]; loading: boolean; onSelectSession: (breakdown: SentenceBreakdown) => void }) {
  if (loading && sessions.length === 0) {
    return <EmptyState text="Loading sentence history..." />;
  }

  if (sessions.length === 0) {
    return <EmptyState text="Completed breakdowns will appear here." />;
  }

  return (
    <div className="grid gap-4">
      {sessions.map((session) => {
        const insightCount = session.breakdown.steps.reduce((count, step) => count + (step.vocabularyInsights?.length ?? 0), 0);
        return (
          <article
            key={session.id}
            onClick={() => onSelectSession(session.breakdown)}
            className="cursor-pointer rounded-[20px] border border-hairline bg-white p-5 shadow-[3px_5px_30px_rgba(0,0,0,0.06)] transition-all hover:shadow-[3px_5px_30px_rgba(0,78,159,0.12)] hover:border-primary/20"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-primary">{session.sourceLabel}</span>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">{formatDate(session.createdAt)}</span>
            </div>
            <div className="flex items-start gap-2">
              <p className="line-clamp-3 text-lg font-bold leading-snug text-ink flex-1">{session.sourceSentence}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); speakText(session.sourceSentence); }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10"
                aria-label={`Pronounce ${session.sourceSentence.slice(0, 30)}`}
              >
                <Volume2 size={16} />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-zinc-700">
              <span className="rounded-full bg-canvas-parchment px-3 py-1">{session.totalWords} words</span>
              <span className="rounded-full bg-canvas-parchment px-3 py-1">{session.breakdown.steps.length} steps</span>
              <span className="rounded-full bg-canvas-parchment px-3 py-1">{insightCount} insights</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function VocabularyHistory({
  vocabulary,
  filter,
  expandedVocabulary,
  loading,
  onFilterChange,
  onToggleExpanded,
  onUpdateMastery,
}: {
  vocabulary: readonly SavedVocabularyEntry[];
  filter: VocabularyFilter;
  expandedVocabulary: ReadonlySet<string>;
  loading: boolean;
  onFilterChange: (filter: VocabularyFilter) => void;
  onToggleExpanded: (id: string) => void;
  onUpdateMastery: (id: string, masteryStatus: MasteryStatus) => void;
}) {
  if (loading && vocabulary.length === 0) {
    return <EmptyState text="Loading vocabulary..." />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(['all', 'new', 'reviewing', 'mastered'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onFilterChange(item)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
              filter === item ? 'bg-primary text-white' : 'bg-white text-ink-muted ring-1 ring-hairline hover:text-ink'
            }`}
          >
            {item === 'all' ? 'All' : masteryLabel(item)}
          </button>
        ))}
      </div>

      {vocabulary.length === 0 ? (
        <EmptyState text="Vocabulary collected from breakdowns will appear here." />
      ) : (
        <div className="grid gap-4">
          {vocabulary.map((entry) => {
            const isExpanded = expandedVocabulary.has(entry.id);
            return (
              <article key={entry.id} className="rounded-[20px] border border-hairline bg-white p-5 shadow-[3px_5px_30px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="text-2xl font-bold text-ink">{entry.text}</h2>
                      {entry.phonetic && <span className="text-sm font-semibold text-ink-muted">{entry.phonetic}</span>}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); speakText(entry.pronunciationText || entry.text); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10"
                        aria-label={`Pronounce ${entry.text}`}
                      >
                        <Volume2 size={15} />
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-bold text-primary">
                      {entry.senses[0]?.meaningInContext ?? entry.type}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-zinc-700">
                      <span className="rounded-full bg-canvas-parchment px-3 py-1">{entry.occurrenceCount} encounters</span>
                      <span className="rounded-full bg-canvas-parchment px-3 py-1">{entry.senses.length} senses</span>
                      <span className="rounded-full bg-canvas-parchment px-3 py-1">Last seen {formatDate(entry.lastSeenAt)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={entry.masteryStatus}
                      onChange={(event) => onUpdateMastery(entry.id, event.target.value as MasteryStatus)}
                      className="h-10 rounded-full border border-hairline bg-white px-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-primary/20"
                      aria-label={`Mastery status for ${entry.text}`}
                    >
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="mastered">Mastered</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onToggleExpanded(entry.id)}
                      aria-expanded={isExpanded}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10"
                      aria-label={`Show sources for ${entry.text}`}
                    >
                      <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-5 grid gap-4 border-t border-hairline pt-5 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">Senses</h3>
                      {entry.senses.map((sense) => (
                        <div key={sense.id} className="rounded-xl bg-canvas-parchment p-4">
                          <p className="font-bold text-ink">{sense.meaningInContext}</p>
                          <p className="mt-2 text-sm leading-6 text-zinc-700">{sense.usageNote}</p>
                          {sense.example && <p className="mt-2 text-sm italic text-zinc-500">{sense.example}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">Sources</h3>
                      {entry.occurrences.map((occurrence) => (
                        <p key={occurrence.id} className="rounded-xl bg-canvas-parchment p-4 text-sm font-semibold leading-6 text-zinc-700">
                          {occurrence.sentenceText}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-hairline bg-white p-10 text-center text-sm font-bold text-ink-muted">
      {text}
    </div>
  );
}
