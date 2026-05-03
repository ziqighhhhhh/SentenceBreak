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

interface MergedSegment {
  text: string;
  highlighted: boolean;
  role?: string;
}

export function HighlightedSentence({ segments, grammarBlocks }: HighlightedSentenceProps) {
  if (!grammarBlocks || grammarBlocks.length === 0) {
    return renderWithFallback(segments);
  }

  const merged = mergeSegments(segments, grammarBlocks);

  return (
    <>
      {merged.map((seg, idx) => {
        const cls = buildClass(seg);
        if (!cls) return <span key={idx}>{seg.text}</span>;
        return (
          <span key={idx} className={cls}>
            {seg.text}
          </span>
        );
      })}
    </>
  );
}

function mergeSegments(segments: HighlightSegment[], blocks: GrammarBlock[]): MergedSegment[] {
  const roleByToken = new Map<string, string>();
  for (const block of blocks) {
    const t = block.text.trim();
    if (t) {
      roleByToken.set(lower(t), block.role);
    }
  }

  let blockIdx = 0;
  let currentBlockText = normalizeLower(blocks[0]?.text ?? '');
  let consumed = 0;

  const result: MergedSegment[] = [];

  for (const seg of segments) {
    const tokens = extractTokens(seg.text);

    for (const token of tokens) {
      const clean = lower(token.text);

      let matched = false;

      if (consumed < currentBlockText.length) {
        const remaining = currentBlockText.slice(consumed);
        if (remaining.startsWith(clean) || clean.startsWith(remaining.slice(0, clean.length))) {
          const advanceStart = matchLength(remaining, clean);
          consumed += advanceStart;

          result.push({
            text: token.text,
            highlighted: seg.highlighted,
            role: blocks[blockIdx]?.role ?? 'other',
          });
          matched = true;
        }
      }

      if (!matched) {
        result.push({ ...token, highlighted: seg.highlighted, role: undefined });
      }

      if (consumed >= currentBlockText.length) {
        blockIdx++;
        currentBlockText = normalizeLower(blocks[blockIdx]?.text ?? '');
        consumed = 0;
      }
    }
  }

  return result;
}

function extractTokens(text: string) { 
  const out: { text: string; originalIndex: number }[] = [];
  let remaining = text;
  let index = 0;
  
  const pattern = /\s+|[\w'-]+|[^\s\w]/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    out.push({ text: match[0], originalIndex: match.index });
  }
  
  return out;
}

function buildClass(seg: MergedSegment): string | undefined {
  if (seg.highlighted && seg.role) {
    return `${ROLE_BG[seg.role] ?? ROLE_BG.other} ${ROLE_RING[seg.role] ?? ROLE_RING.other} ring-1 rounded px-0.5 underline underline-offset-2`;
  }
  if (seg.highlighted) {
    return 'rounded px-0.5 underline underline-offset-2';
  }
  if (seg.role) {
    return `${ROLE_BG[seg.role] ?? ROLE_BG.other} ${ROLE_RING[seg.role] ?? ROLE_RING.other} ring-1 rounded px-0.5`;
  }
  return undefined;
}

function renderWithFallback(segments: HighlightSegment[]) {
  return (
    <>
      {segments.map((segment, index) => {
        if (!segment.highlighted) return <span key={index}>{segment.text}</span>;
        return (
          <span key={index} className="rounded px-0.5 underline underline-offset-2">
            {segment.text}
          </span>
        );
      })}
    </>
  );
}

function normalizeLower(v: string): string {
  return v.replace(/\s+/g, ' ').trim().toLowerCase();
}

function lower(v: string): string {
  return v.replace(/\s+/g, ' ').trim().toLowerCase();
}

function matchLength(a: string, b: string): number {
  return Math.max(a.length, b.length);
}
