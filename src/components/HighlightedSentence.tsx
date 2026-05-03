import type { HighlightSegment } from '../utils/highlightDiff';
import type { GrammarBlock } from '../types';

const ROLE_BG: Record<string, string> = {
  subject: 'bg-blue-200/60',
  predicate: 'bg-red-200/60',
  object: 'bg-purple-200/60',
  modifier: 'bg-indigo-200/60',
  adverbial: 'bg-amber-200/60',
  complement: 'bg-teal-200/60',
  connector: 'bg-pink-200/60',
  other: 'bg-zinc-200/60',
};

const ROLE_RING: Record<string, string> = {
  subject: 'ring-blue-300',
  predicate: 'ring-red-300',
  object: 'ring-purple-300',
  modifier: 'ring-indigo-300',
  adverbial: 'ring-amber-300',
  complement: 'ring-teal-300',
  connector: 'ring-pink-300',
  other: 'ring-zinc-300',
};

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
        return (
          <span
            key={idx}
            className={getClasses(hasNew, block.role)}
          >
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
          <span key={idx} className="rounded px-0.5 underline underline-offset-2">
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

function getClasses(highlighted: boolean, role: string): string {
  if (highlighted) {
    return `${ROLE_BG[role] ?? ROLE_BG.other} ${ROLE_RING[role] ?? ROLE_RING.other} ring-1 rounded px-0.5 underline underline-offset-2`;
  }
  return `${ROLE_BG[role] ?? ROLE_BG.other} ${ROLE_RING[role] ?? ROLE_RING.other} ring-1 rounded px-0.5`;
}
