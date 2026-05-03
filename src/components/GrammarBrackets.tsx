import type { GrammarBlock, GrammarRole } from '../types';
import type { HighlightSegment } from '../utils/highlightDiff';

const ROLE_META: Record<GrammarRole, { border: string; color: string; label: string }> = {
  subject:    { border: 'border-blue-500',  color: '#3b82f6', label: '主' },
  predicate:  { border: 'border-red-500',   color: '#ef4444', label: '谓' },
  object:     { border: 'border-purple-500', color: '#a855f7', label: '宾' },
  modifier:   { border: 'border-amber-500', color: '#f59e0b', label: '定' },
  adverbial:  { border: 'border-teal-500',  color: '#14b8a6', label: '状' },
  complement: { border: 'border-orange-500', color: '#f97316', label: '补' },
  connector:  { border: 'border-pink-500',  color: '#ec4899', label: '连' },
  other:      { border: 'border-zinc-400',  color: '#9ca3af', label: '其' },
};

interface GrammarBracketsProps {
  blocks: GrammarBlock[];
  segments: HighlightSegment[];
  sentenceText: string;
  compact?: boolean;
}

const WORD_SIZE = {
  normal: 'text-xl md:text-2xl',
  compact: 'text-sm',
};
const LABEL_SIZE = {
  normal: 'text-sm',
  compact: 'text-[10px]',
};
const GAP = {
  normal: 'gap-x-3 md:gap-x-4',
  compact: 'gap-x-1',
};
const WORD_PAD = {
  normal: 'px-1.5 pb-0.5',
  compact: 'px-0.5 pb-0',
};
const BRACKET_PT = {
  normal: 'pt-1.5',
  compact: 'pt-1',
};
const BORDER_W = {
  normal: 'border-l-[2.5px] border-b-[2.5px] border-r-[2.5px]',
  compact: 'border-l-[1.5px] border-b-[1.5px] border-r-[1.5px]',
};

export function GrammarBrackets({ blocks, segments, sentenceText, compact }: GrammarBracketsProps) {
  const words = sentenceText.split(/\s+/).filter(Boolean);
  const spans = computeSpans(blocks, sentenceText);
  const newSet = getNewSet(segments);
  const wordCount = words.length;
  const s = compact ? 'compact' : 'normal';

  if (blocks.length === 0) {
    return <SegmentOnly segments={segments} compact={compact} />;
  }

  return (
    <div className="flex flex-col items-center">
      {/* Words row */}
      <div className={`flex ${GAP[s]} justify-center pb-2 flex-wrap`} data-bracket-row="words">
        {words.map((w, i) => {
          const isNew = newSet.has(w.toLowerCase());
          return (
            <span
              key={i}
              ref={el => { if (el) el.dataset.wordIndex = `${i}`; }}
              className={`${WORD_SIZE[s]} font-bold whitespace-nowrap transition-colors ${
                isNew ? 'text-primary' : 'text-zinc-900'
              }`}
            >
              {w}
            </span>
          );
        })}
      </div>

      {/* Bracket row */}
      <div className="relative w-full flex justify-center" style={{ minHeight: compact ? '1.5rem' : '3rem' }}>
        {blocks.map((block, bi) => {
          const [start, end] = spans[bi];
          if (start < 0 || end < start || start >= wordCount) return null;
          const config = ROLE_META[block.role] ?? ROLE_META.other;
          const isNew = blocksInSpan(start, end, newSet, words);

          return (
            <BracketSlot
              key={bi}
              totalWords={wordCount}
              start={start}
              end={end}
              config={config}
              hasHighlight={isNew}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
}

interface BracketSlotProps {
  totalWords: number;
  start: number;
  end: number;
  config: { border: string; color: string; label: string };
  hasHighlight: boolean;
  compact: boolean;
}

function BracketSlot({
  totalWords,
  start,
  end,
  config,
  hasHighlight,
  compact,
}: BracketSlotProps) {
  const span = end - start + 1;
  const s = compact ? 'compact' : 'normal';

  return (
    <>
      {Array.from({ length: start }, (_, i) => (
        <span
          key={`p-${i}`}
          className="invisible shrink-0 whitespace-nowrap"
          aria-hidden="true"
        >
          <span className={`${WORD_SIZE[s]} font-bold`}>M</span>
        </span>
      ))}

      <div
        className={`relative shrink-0 ${BORDER_W[s]} ${config.border} ${BRACKET_PT[s]} ${compact ? '' : 'rounded-b-md'}`}
      >
        <div className="flex" aria-hidden="true">
          {Array.from({ length: span }, (_, i) => (
            <span key={`s-${i}`} className={`${WORD_SIZE[s]} font-bold whitespace-nowrap invisible`}>
              M
            </span>
          ))}
        </div>

        <span
          className={`absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 font-extrabold tracking-wider select-none whitespace-nowrap ${
            hasHighlight ? 'text-primary' : ''
          } ${LABEL_SIZE[s]}`}
          style={hasHighlight ? undefined : { color: config.color }}
        >
          {config.label}
        </span>
      </div>

      {Array.from({ length: totalWords - end - 1 }, (_, i) => (
        <span
          key={`p2-${i}`}
          className="invisible shrink-0 whitespace-nowrap"
          aria-hidden="true"
        >
          <span className={`${WORD_SIZE[s]} font-bold`}>M</span>
        </span>
      ))}
    </>
  );
}

function SegmentOnly({ segments, compact }: { segments: HighlightSegment[]; compact?: boolean }) {
  const s = compact ? 'compact' : 'normal';
  return (
    <div className={`flex ${GAP[s]} justify-center ${WORD_PAD[s]}`}>
      {segments.map((seg, i) => (
        <span
          key={i}
          className={seg.highlighted
            ? `${WORD_SIZE[s]} font-bold px-1.5 pb-0.5 border-b-2 border-primary text-primary`
            : `${WORD_SIZE[s]} font-bold text-zinc-900`
          }
        >
          {seg.text}
        </span>
      ))}
    </div>
  );
}

function computeSpans(blocks: GrammarBlock[], text: string): [number, number][] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean).map(w => w.replace(/[^a-z0-9'\u4e00-\u9fff-]/g, ''));
  const line = words.join(' ');

  return blocks.map(block => {
    const blockClean = block.text.toLowerCase().trim().replace(/[,.;:!?'"()]/g, '');
    const blockWords = blockClean.split(/\s+/).filter(Boolean).map(w => w.replace(/[^a-z0-9'\u4e00-\u9fff-]/g, ''));

    if (blockWords.length === 0) return [0, 0];

    const blockStr = blockWords.join(' ');
    const pos = line.indexOf(blockStr);

    if (pos === -1) {
      for (let i = 0; i < words.length; i++) {
        if (words[i].startsWith(blockWords[0])) {
          return [i, Math.min(i + blockWords.length - 1, words.length - 1)];
        }
      }
      return [0, Math.min(blockWords.length - 1, words.length - 1)];
    }

    const before = line.slice(0, pos).trim();
    const start = before === '' ? 0 : before.split(/\s+/).filter(Boolean).length;
    return [start, Math.min(start + blockWords.length - 1, words.length - 1)];
  });
}

function getNewSet(segments: HighlightSegment[]): Set<string> {
  const s = new Set<string>();
  for (const seg of segments) {
    if (!seg.highlighted) continue;
    for (const t of seg.text.split(/\s+/).filter(Boolean)) {
      s.add(t.toLowerCase());
    }
  }
  return s;
}

function blocksInSpan(start: number, end: number, set: Set<string>, words: string[]): boolean {
  for (let i = Math.max(0, start); i <= Math.min(end, words.length - 1); i++) {
    if (set.has(words[i].toLowerCase())) return true;
  }
  return false;
}
