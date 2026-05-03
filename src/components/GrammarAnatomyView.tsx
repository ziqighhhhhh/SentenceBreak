import { Volume2 } from 'lucide-react';
import type { GrammarBlock } from '../types';
import { speakText } from '../utils/speech';

interface GrammarAnatomyViewProps {
  blocks: GrammarBlock[];
  note?: string;
  targetSentence: string;
}

const ROLE_STYLES: Record<string, string> = {
  subject: 'bg-blue-100 text-blue-800 ring-blue-200',
  predicate: 'bg-red-100 text-red-800 ring-red-200',
  object: 'bg-purple-100 text-purple-800 ring-purple-200',
  modifier: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  adverbial: 'bg-amber-100 text-amber-800 ring-amber-200',
  complement: 'bg-teal-100 text-teal-800 ring-teal-200',
  connector: 'bg-pink-100 text-pink-800 ring-pink-200',
  other: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
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
              className={`inline-block rounded-lg px-1.5 py-0.5 ring-1 ${ROLE_STYLES[block.role] ?? ROLE_STYLES.other}`}
            >
              {block.text}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {getUniqueRoles(blocks).map((role) => (
            <span
              key={role}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 text-xs font-bold ${
                ROLE_STYLES[role] ?? ROLE_STYLES.other
              }`}
            >
              <span className="size-2 rounded-full bg-current" />
              {ROLE_NAME_MAP[role] ?? role}
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
