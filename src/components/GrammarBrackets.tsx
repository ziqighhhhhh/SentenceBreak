import type { GrammarBlock, GrammarRole } from '../types';
import type { HighlightSegment } from '../utils/highlightDiff';

const ROLE_META: Record<GrammarRole, { color: string; label: string }> = {
  subject:    { color: '#3b82f6', label: '主' },
  predicate:  { color: '#ef4444', label: '谓' },
  object:     { color: '#a855f7', label: '宾' },
  modifier:   { color: '#f59e0b', label: '定' },
  adverbial:  { color: '#14b8a6', label: '状' },
  complement: { color: '#f97316', label: '补' },
  connector:  { color: '#ec4899', label: '连' },
  other:      { color: '#9ca3af', label: '其' },
};

interface GrammarBracketsProps {
  blocks: GrammarBlock[];
  segments: HighlightSegment[];
  sentenceText: string;
  compact?: boolean;
}

const WORD_SIZE: Record<string, string> = { normal: 'text-xl md:text-2xl', compact: 'text-sm' };
const GAP: Record<string, string> = { normal: 'gap-x-3 md:gap-x-4', compact: 'gap-x-1.5' };

export function GrammarBrackets({ blocks, segments, compact }: GrammarBracketsProps) {
  const size = compact ? 'compact' : 'normal';
  const isNewSet = computeNewSet(segments);

  return (
    <div className={`flex flex-wrap ${GAP[size]} justify-center w-full`}>
      {blocks.map((block, i) => (
        <GrammarBlockItem
          key={i}
          block={block}
          hasHighlight={blockHasHighlight(block, isNewSet)}
          size={size}
        />
      ))}
    </div>
  );
}

interface GrammarBlockItemProps {
  block: GrammarBlock;
  hasHighlight: boolean;
  size: 'normal' | 'compact';
}

/**
 * Single grammar block rendering:
 * 
 *   "The cat"           ← text, wraps only at block boundary
 *   ⎣  主    ⎦           ← L-bracket + label
 *
 * Implemented as:
 * - A flex column: [text] [bracket-container]
 * - bracket-container is absolutely positioned below the text
 * - The bracket box uses an invisible text span to match the text width
 */
function GrammarBlockItem({ block, hasHighlight, size }: GrammarBlockItemProps) {
  const c = ROLE_META[block.role] ?? ROLE_META.other;
  const bracketOffY = size === 'compact' ? 6 : 10;

  return (
    <div className="relative inline-flex flex-col items-center shrink-0">
      {/* 单词文本 */}
      <span className={`font-bold whitespace-nowrap ${WORD_SIZE[size]} ${hasHighlight ? 'text-primary' : 'text-zinc-900'}`}>
        {block.text}
      </span>

      {/* 括号区域 — 绝对定位于文字下方 */}
      <div className="relative w-full" style={{ minHeight: size === 'compact' ? '1.25rem' : '1.75rem' }}>
        {/* L型括号 */}
        <div
          className="absolute inset-x-0"
          style={{
            top: 0,
            height: size === 'compact' ? '14px' : '20px',
            borderLeft: hasHighlight ? 'var(--color-primary)' : c.color,
            borderBottom: hasHighlight ? 'var(--color-primary)' : c.color,
            borderRight: hasHighlight ? 'var(--color-primary)' : c.color,
            borderTop: 'none',
            borderLeftStyle: 'solid',
            borderBottomStyle: 'solid',
            borderRightStyle: 'solid',
            borderLeftWidth: size === 'compact' ? '1.5px' : '2.5px',
            borderBottomWidth: size === 'compact' ? '1.5px' : '2.5px',
            borderRightWidth: size === 'compact' ? '1.5px' : '2.5px',
            borderBottomLeftRadius: size === 'compact' ? '3px' : '6px',
            borderBottomRightRadius: size === 'compact' ? '3px' : '6px',
          }}
        >
          {/* 标签 */}
          <span
            className="absolute left-1/2 -translate-x-1/2 font-extrabold tracking-widest select-none whitespace-nowrap"
            style={{
              top: `calc(100% + ${bracketOffY}px)`,
              fontSize: size === 'compact' ? '10px' : '11px',
              color: hasHighlight ? 'var(--color-primary)' : c.color,
            }}
          >
            {c.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function computeNewSet(segments: HighlightSegment[]): Set<string> {
  const s = new Set<string>();
  for (const seg of segments) {
    if (!seg.highlighted) continue;
    for (const t of seg.text.split(/\s+/).filter(Boolean)) {
      s.add(t.toLowerCase());
    }
  }
  return s;
}

function blockHasHighlight(block: GrammarBlock, set: Set<string>): boolean {
  return block.text.toLowerCase().split(/\s+/).filter(Boolean).some((t) => set.has(t));
}
