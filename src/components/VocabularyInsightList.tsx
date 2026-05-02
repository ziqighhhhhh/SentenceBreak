import { useState } from 'react';
import { ChevronDown, Volume2 } from 'lucide-react';
import type { VocabularyInsight } from '../types';

interface VocabularyInsightListProps {
  insights: readonly VocabularyInsight[];
  compact?: boolean;
}

function speakInsight(insight: VocabularyInsight) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(insight.pronunciationText || insight.text));
}

function renderTags(items: readonly string[] | undefined, label: string, tone: 'blue' | 'zinc') {
  if (!items?.length) return null;

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              tone === 'blue' ? 'bg-primary/10 text-primary' : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VocabularyInsightList({ insights, compact = false }: VocabularyInsightListProps) {
  const [expandedInsights, setExpandedInsights] = useState<ReadonlySet<string>>(new Set());

  if (insights.length === 0) return null;

  return (
    <section className={compact ? 'w-full text-left' : 'mt-8 w-full border-t border-zinc-200 pt-6 text-left'}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-ink-muted">Vocabulary insights</h4>
        <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-primary">
          {insights.length} item{insights.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className={`grid gap-3 ${compact ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
        {insights.map((insight) => {
          const key = insight.senseKey || `${insight.normalizedText}-${insight.meaningInContext}`;
          const isExpanded = expandedInsights.has(key);

          return (
            <article key={key} className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-base font-bold text-zinc-900">{insight.text}</p>
                    {insight.phonetic && <p className="text-sm font-semibold text-zinc-500">{insight.phonetic}</p>}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-primary">{insight.meaningInContext}</p>
                </div>
                <button
                  type="button"
                  onClick={() => speakInsight(insight)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label={`Pronounce ${insight.text}`}
                >
                  <Volume2 size={17} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setExpandedInsights((current) => {
                    const next = new Set(current);
                    if (next.has(key)) {
                      next.delete(key);
                      return next;
                    }
                    next.add(key);
                    return next;
                  });
                }}
                aria-expanded={isExpanded}
                className="mt-3 inline-flex items-center gap-1 rounded-full text-sm font-bold text-primary transition-all hover:text-primary-container focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                Details
                <ChevronDown size={15} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-700">
                  {insight.dictionaryMeaning && <p>{insight.dictionaryMeaning}</p>}
                  <p>{insight.usageNote}</p>
                  {renderTags(insight.synonyms, 'Synonyms', 'blue')}
                  {renderTags(insight.antonyms, 'Antonyms', 'zinc')}
                  {insight.example && <p className="rounded-lg bg-zinc-50 p-3 font-medium italic text-zinc-600">{insight.example}</p>}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
