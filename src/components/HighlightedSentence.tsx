import type { HighlightSegment } from '../utils/highlightDiff';
import type { GrammarBlock } from '../types';

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

const NEW_HL = 'rounded-lg bg-primary/10 px-1 text-primary ring-1 ring-primary/10';

interface HighlightedSentenceProps {
  segments: HighlightSegment[];
  grammarBlocks?: GrammarBlock[];
}

const tokenRe = /\s+|[\w'-]+|[^\s\w]/g;

export function HighlightedSentence({ segments, grammarBlocks }: HighlightedSentenceProps) {
  if (!grammarBlocks || grammarBlocks.length === 0) {
    return <RenderSegments segments={segments} />;
  }

  const highlightedTokens = buildHighlightedTokenSet(segments);

  return (
    <>
      {grammarBlocks.map((block, idx) => {
        const hasNew = blockContainsHighlightedToken(block, highlightedTokens);
        const baseClass = ROLE_BORDER[block.role] ?? '';
        const hlClass = hasNew ? NEW_HL : '';
        const cls = `${baseClass} ${hlClass}`.trim();
        return (
          <span key={idx} className={cls || undefined}>
            {block.text}
          </span>
        );
      })}
    </>
  );
}

function RenderSegments({ segments }: { segments: HighlightSegment[] }) {
  return (
    <>
      {segments.map((seg, idx) => {
        if (!seg.highlighted) return <span key={idx}>{seg.text}</span>;
        return (
          <span key={idx} className={NEW_HL}>
            {seg.text}
          </span>
        );
      })}
    </>
  );
}

function buildHighlightedTokenSet(segments: HighlightSegment[]): Set<string> {
  const set = new Set<string>();
  for (const seg of segments) {
    if (!seg.highlighted) continue;
    const tokens = seg.text.match(tokenRe) ?? [];
    for (const t of tokens) {
      const n = t.trim().toLowerCase();
      if (n.length > 0) set.add(n);
    }
  }
  return set;
}

function blockContainsHighlightedToken(
  block: GrammarBlock,
  highlightedTokens: Set<string>,
): boolean {
  const tokens = block.text.match(tokenRe) ?? [];
  for (const t of tokens) {
    const n = t.trim().toLowerCase();
    if (n.length > 0 && highlightedTokens.has(n)) return true;
  }
  return false;
}
