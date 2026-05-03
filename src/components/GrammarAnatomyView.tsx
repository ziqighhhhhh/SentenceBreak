import { Volume2 } from 'lucide-react';
import type { GrammarBlock } from '../types';
import { speakText } from '../utils/speech';

interface GrammarAnatomyViewProps {
  blocks: GrammarBlock[];
  note?: string;
  targetSentence: string;
}

const ROLE_BORDER: Record<string, string> = {
  subject: 'border-b-2 border-blue-400/70',
  predicate: 'border-b-2 border-red-400/70',
  object: 'border-b-2 border-purple-400/70',
  modifier: 'border-b-2 border-indigo-400/70',
  adverbial: 'border-b-2 border-amber-400/70',
  complement: 'border-b-2 border-teal-400/70',
  connector: 'border-b-2 border-pink-400/70',
  other: '',
};

const ROLE_COLORS: Record<string, string> = {
  subject: 'blue',
  predicate: 'red',
  object: 'purple',
  modifier: 'indigo',
  adverbial: 'amber',
  complement: 'teal',
  connector: 'pink',
  other: 'zinc',
};

const ROLE_NAME_MAP: Record<string, string> = {
  subject: '主语',
  predicate: '谓语',
  object: '宾语',
  modifier: '定语',
  adverbial: '状语',
  complement: '补语',
  connector: '连接词',
  other: '其它',
};

export function GrammarAnatomyView({ blocks, note, targetSentence }: GrammarAnatomyViewProps) {
  return (
    <section className="mb-12 w-full max-w-[1320px]">
      <div className="bg-white border border-zinc-200 p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Grammar Anatomy</h2>
            <p className="mt-2 text-sm font-semibold text-zinc-500">Color-coded grammar blocks of the full sentence.</p>
          </div>
          <button
            type="button"
            onClick={() => speakText(targetSentence)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10"
            aria-label="Pronounce full sentence"
          >
            <Volume2 size={17} />
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xl md:text-2xl font-bold leading-relaxed text-zinc-900">
          {blocks.map((block, index) => (
            <span
              key={`${block.text}-${index}`}
              className={`inline-block px-1 py-0.5 ${ROLE_BORDER[block.role] ?? ''}`}
            >
              {block.text}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {getUniqueRoles(blocks).map((role) => {
            const color = ROLE_COLORS[role] ?? 'zinc';
            return (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600"
              >
                <span className={`size-2.5 rounded-full bg-${color}-400`} />
                {ROLE_NAME_MAP[role] ?? role}
              </span>
            );
          })}
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
