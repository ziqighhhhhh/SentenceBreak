import { Volume2 } from 'lucide-react';
import type { GrammarBlock } from '../types';
import { speakText } from '../utils/speech';
import { GrammarBrackets } from './GrammarBrackets';

interface GrammarAnatomyViewProps {
  blocks: GrammarBlock[];
  note?: string;
  targetSentence: string;
}

const ROLE_LABEL_FULL: Record<string, string> = {
  subject:  '主语',
  predicate:  '谓语',
  object:  '宾语',
  modifier:  '定语',
  adverbial:  '状语',
  complement:  '补语',
  connector:  '连接词',
  other:  '其它',
};

const ROLE_DOT: Record<string, string> = {
  subject:   'bg-blue-500',
  predicate: 'bg-red-500',
  object:    'bg-purple-500',
  modifier:  'bg-amber-500',
  adverbial: 'bg-teal-500',
  complement: 'bg-orange-500',
  connector:  'bg-pink-500',
  other:    'bg-zinc-400',
};

export function GrammarAnatomyView({ blocks, note, targetSentence }: GrammarAnatomyViewProps) {
  const emptySegments = blocks.map(() => ({ text: '', highlighted: false }));
  const uniqueRoles = getUniqueRoles(blocks);

  return (
    <section className="mb-12 w-full max-w-[1320px]">
      <div className="bg-white border border-zinc-200 p-6 md:p-8">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Grammar Anatomy</h2>
            <p className="mt-2 text-sm font-semibold text-zinc-500">L-shaped grammar brackets for the full sentence.</p>
          </div>
          {targetSentence && (
            <button
              type="button"
              onClick={() => speakText(targetSentence)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10"
              aria-label="Pronounce full sentence"
            >
              <Volume2 size={17} />
            </button>
          )}
        </div>

        {/* Brackets */}
        <GrammarBrackets
          blocks={blocks}
          segments={emptySegments}
          sentenceText={targetSentence}
        />

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-6 mb-6">
          {uniqueRoles.map((role) => (
            <span key={role} className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600">
              <span className={`size-2.5 rounded-full ${ROLE_DOT[role] ?? ROLE_DOT.other}`} />
              {ROLE_LABEL_FULL[role] ?? role}
            </span>
          ))}
        </div>

        {note && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-700 leading-relaxed font-medium">
            {note}
          </div>
        )}
      </div>
    </section>
  );
}

function getUniqueRoles(blocks: GrammarBlock[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const block of blocks) {
    if (!seen.has(block.role)) {
      seen.add(block.role);
      result.push(block.role);
    }
  }
  return result;
}
