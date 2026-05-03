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

/**
 * CSS Grid layout where row-1 = words (one per column), row-2 = brackets.
 * Each bracket uses gridColumn: "start+1 / end+2" so it spans the exact
 * columns of the words above.  Because grid columns are auto-sized, the
 * bracket box perfectly matches the real word widths + gaps.
 */
export function GrammarBrackets({ blocks, segments, sentenceText, compact }: GrammarBracketsProps) {
  const words = sentenceText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const spans = computeSpans(blocks, sentenceText);
  const newSet = getNewSet(segments);
  const s = compact ? 'compact' : 'normal';
  const isC = s === 'compact';

  if (!blocks.length) return <SegmentOnly segments={segments} size={s} />;

  return (
    <div className="flex justify-center overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${wordCount}, auto)`, columnGap: isC ? '4px' : '12px' }}>
        {/* Row 1: words */}
        {words.map((w, i) => {
          const isNew = newSet.has(w.toLowerCase());
          return (
            <span
              key={i}
              className={`font-bold whitespace-nowrap transition-colors ${isC ? 'text-sm' : 'text-xl md:text-2xl'} ${isNew ? 'text-primary border-b-2 border-blue-400/70' : 'text-zinc-900'}`}
              style={{ padding: '0 0.375rem 2px' }}
            >
              {w}
            </span>
          );
        })}

        {/* Row 2: bracket boxes */}
        {blocks.map((block, bi) => {
          const [start, end] = spans[bi];
          if (start < 0 || end < start || start >= wordCount) return null;
          const config = ROLE_META[block.role] ?? ROLE_META.other;
          const isNew = blocksInSpan(start, end, newSet, words);
          const bw = isC ? '1.5px' : '2.5px';
          const labelOffY = isC ? 4 : 12;

          return (
            <div
              key={bi}
              style={{
                gridColumn: `${start + 1} / ${end + 2}`,
                gridRow: 2,
                height: '16px',
                position: 'relative',
              }}
            >
              {/* Bracket border */}
              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  borderLeft: `${bw} solid ${isNew ? 'var(--color-primary)' : config.color}`,
                  borderBottom: `${bw} solid ${isNew ? 'var(--color-primary)' : config.color}`,
                  borderRight: `${bw} solid ${isNew ? 'var(--color-primary)' : config.color}`,
                  borderTop: 'none',
                  borderBottomLeftRadius: isC ? '3px' : '6px',
                  borderBottomRightRadius: isC ? '3px' : '6px',
                }}
              />
              {/* Label centred on the bottom border */}
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bottom: 0,
                  marginTop: `${labelOffY}px`,
                  fontWeight: 800,
                  fontSize: isC ? '10px' : '12px',
                  letterSpacing: '0.1em',
                  color: isNew ? 'var(--color-primary)' : config.color,
                  whiteSpace: 'nowrap',
                }}
              >
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SegmentOnly({ segments, size }: { segments: HighlightSegment[]; size: string }) {
  return (
    <div className={`flex ${size === 'compact' ? 'gap-x-1' : 'gap-x-3 md:gap-x-4'} justify-center pb-4 pt-2`}>
      {segments.map((seg, i) => (
        <span key={i} className={`font-bold px-1.5 ${seg.highlighted ? 'text-primary border-b-2 border-blue-400/70' : 'text-zinc-900'} ${size === 'compact' ? 'text-sm' : 'text-xl md:text-2xl'}`}>
          {seg.text}
        </span>
      ))}
    </div>
  );
}

function computeSpans(blocks: GrammarBlock[], text: string): [number, number][] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/[^a-z0-9'\u4e00-\u9fff-]/g, ''));
  const line = words.join(' ');
  return blocks.map((block) => {
    const bc = block.text.toLowerCase().trim().replace(/[,.;:!?'"()]/g, '');
    const bw = bc.split(/\s+/).filter(Boolean).map((w) => w.replace(/[^a-z0-9'\u4e00-\u9fff-]/g, ''));
    if (!bw.length) return [0, 0];
    const bs = bw.join(' ');
    const p = line.indexOf(bs);
    if (p === -1) {
      for (let i = 0; i < words.length; i++) {
        if (words[i].startsWith(bw[0])) return [i, Math.min(i + bw.length - 1, words.length - 1)];
      }
      return [0, Math.min(bw.length - 1, words.length - 1)];
    }
    const before = line.slice(0, p).trim();
    const start = before === '' ? 0 : before.split(/\s+/).filter(Boolean).length;
    return [start, Math.min(start + bw.length - 1, words.length - 1)];
  });
}

function getNewSet(segments: HighlightSegment[]): Set<string> {
  const s = new Set<string>();
  for (const seg of segments) { if (!seg.highlighted) continue; for (const t of seg.text.split(/\s+/).filter(Boolean)) s.add(t.toLowerCase()); }
  return s;
}

function blocksInSpan(start: number, end: number, set: Set<string>, words: string[]): boolean {
  for (let i = Math.max(0, start); i <= Math.min(end, words.length - 1); i++) { if (set.has(words[i].toLowerCase())) return true; }
  return false;
}
