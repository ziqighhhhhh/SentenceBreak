import { prepareWithSegments, measureNaturalWidth } from '@chenglou/pretext';
import type { GrammarBlock, GrammarRole } from '../types';
import type { HighlightSegment } from '../utils/highlightDiff';
import { useEffect, useMemo, useRef, useState } from 'react';

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

const GAP_PX: Record<'normal' | 'compact', number> = { normal: 12, compact: 4 };
const FONT_STR: Record<'normal' | 'compact', string> = { normal: '24px Inter', compact: '14px Inter' };
const WORD_SIZE: Record<'normal' | 'compact', string> = { normal: 'text-xl md:text-2xl', compact: 'text-sm' };
const LABEL_SIZE: Record<'normal' | 'compact', string> = { normal: 'text-xs', compact: 'text-[10px]' };
const BRACKET_W: Record<'normal' | 'compact', string> = { normal: 'border-l-[2.5px] border-b-[2.5px] border-r-[2.5px] rounded-b-md', compact: 'border-l-[1.5px] border-b-[1.5px] border-r-[1.5px] rounded-b-sm' };
const LABEL_OFF_PX: Record<'normal' | 'compact', number> = { normal: 12, compact: 4 };

/**
 * Sentence grammar annotation with automatic line wrapping via pretext.
 *
 * Each grammar block is an atomic unit that never splits across lines.
 * Blocks flow like words in a paragraph — when the line runs out of width,
 * the next block starts a new line.
 */
export function GrammarBrackets({ blocks, segments, sentenceText, compact }: GrammarBracketsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const size = compact ? 'compact' : 'normal';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setCw(el.clientWidth);
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const blockWidths = useMemo(() =>
    blocks.map((b) => {
      const t = b.text.trim();
      return t ? measureNaturalWidth(prepareWithSegments(t, FONT_STR[size], { whiteSpace: 'pre-wrap' })) : 0;
    }),
    [blocks, size],
  );

  /* Greedy first-fit line packing */
  const packedLines = useMemo(() => {
    if (!blocks.length || cw <= 0) return [];
    const gap = GAP_PX[size];
    const lines: number[][] = [];
    let cur: number[] = [];
    let w = 0;
    for (let i = 0; i < blocks.length; i++) {
      const needed = cur.length === 0 ? blockWidths[i] : w + gap + blockWidths[i];
      if (needed > cw && cur.length > 0) {
        lines.push(cur);
        cur = [i];
        w = blockWidths[i];
      } else {
        cur.push(i);
        w = needed;
      }
    }
    if (cur.length) lines.push(cur);
    return lines;
  }, [blocks, blockWidths, cw, size]);

  const hlSet = useMemo(() => {
    const s = new Set<string>();
    for (const seg of segments) {
      if (!seg.highlighted) continue;
      for (const t of seg.text.split(/\s+/).filter(Boolean)) s.add(t.toLowerCase());
    }
    return s;
  }, [segments]);

  const blockIsNew = useMemo(
    () => blocks.map((b) => b.text.toLowerCase().split(/\s+/).filter(Boolean).some((w) => hlSet.has(w))),
    [blocks, hlSet],
  );

  return (
    <div ref={containerRef} className="w-full min-w-0">
      {!blocks.length ? (
        /* No grammar blocks — show segments with underline highlights */
        <div className="flex flex-wrap gap-x-3 md:gap-x-4 justify-center pt-2 pb-4">
          {segments.map((seg, i) => (
            <span key={i} className={`${WORD_SIZE[size]} font-bold px-1 ${seg.highlighted ? 'text-primary border-b-2 border-blue-400/70' : 'text-zinc-900'}`}>{seg.text}</span>
          ))}
        </div>
      ) : packedLines.length ? (
        /* pretext computed lines — render each as a flex row */
        packedLines.map((line, li) => (
          <div key={li} className="flex flex-wrap gap-x-3 md:gap-x-4 justify-center mb-2">
            {line.map((bi) => (
              <GrammarBlockItem key={bi} block={blocks[bi]} hasHighlight={blockIsNew[bi]} size={size} />
            ))}
          </div>
        ))
      ) : (
        /* First render: container width not known yet, show all blocks with overflow */
        <div className="flex gap-x-3 md:gap-x-4 pt-2 pb-4 overflow-x-auto">
          {blocks.map((b, i) => <GrammarBlockItem key={i} block={b} hasHighlight={blockIsNew[i]} size={size} />)}
        </div>
      )}
    </div>
  );
}

/** Single grammar block: words on top, L-bracket + label below */
function GrammarBlockItem({
  block,
  hasHighlight,
  size,
}: {
  block: GrammarBlock;
  hasHighlight: boolean;
  size: 'normal' | 'compact';
}) {
  const c = ROLE_META[block.role] ?? ROLE_META.other;
  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Text */}
      <span className={`font-bold whitespace-nowrap px-0.5 ${WORD_SIZE[size]} ${hasHighlight ? 'text-primary' : 'text-zinc-900'} transition-colors`}>
        {block.text}
      </span>
      {/* Bracket strip */}
      <div className="h-6 flex items-start" style={{ marginTop: '2px' }}>
        <div className={`relative flex items-stretch ${BRACKET_W[size]} ${c.border}`}>
          {/* Invisible placeholder to set width matching the text above */}
          <span className={`invisible whitespace-nowrap ${WORD_SIZE[size]} px-0.5`}>{block.text}</span>
          {/* Label floating below bracket */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 font-extrabold tracking-wider select-none whitespace-nowrap ${LABEL_SIZE[size]} ${hasHighlight ? 'text-primary' : ''}`}
            style={{
              color: hasHighlight ? undefined : c.color,
              top: '100%',
              marginTop: `${LABEL_OFF_PX[size]}px`,
            }}
          >
            {c.label}
          </span>
        </div>
      </div>
    </div>
  );
}
