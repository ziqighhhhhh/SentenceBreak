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
const GAP: Record<string, string> = { normal: 'gap-x-4 md:gap-x-5', compact: 'gap-x-2' };

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

function isPunctuationOnly(text: string): boolean {
  return !/[a-zA-Z0-9\u4e00-\u9fff\u3000-\u9fff]/.test(text.trim());
}

/**
 * Pure natural-flow layout — zero absolute positioning.
 *
 *   "The cat"
 *   ┌────────┐
 *   │(text)  │   ← invisible span, sets bracket width
 *   └────────┘
 *    主
 *
 * Punctuation-only blocks (e.g. ".") render as plain text without brackets.
 */
function GrammarBlockItem({ block, hasHighlight, size }: GrammarBlockItemProps) {
  if (isPunctuationOnly(block.text)) {
    return (
      <span className={`font-bold whitespace-nowrap px-1 ${WORD_SIZE[size]} leading-none text-zinc-900`}>
        {block.text}
      </span>
    );
  }
  const c = ROLE_META[block.role] ?? ROLE_META.other;
  const bw = size === 'compact' ? '1.5px' : '2.5px';
  const bracketH = size === 'compact' ? 14 : 18;
  const lblSize = size === 'compact' ? '13px' : '16px';

  return (
    <div className="inline-flex flex-col items-center shrink-0 gap-0">
      {/* 单词文本 */}
      <span className={`font-bold whitespace-nowrap px-1 ${WORD_SIZE[size]} leading-none ${hasHighlight ? 'text-primary' : 'text-zinc-900'}`}>
        {block.text}
      </span>

      {/* 隐形撑宽文字 */}
      <span className={`invisible whitespace-nowrap ${WORD_SIZE[size]} font-bold px-1 select-none leading-none`} aria-hidden="true">
        {block.text}
      </span>

      {/* L 型括号 */}
      <span
        className="inline-block"
        style={{
          borderTop: 'none',
          borderLeft: `${bw} solid ${hasHighlight ? 'var(--color-primary)' : c.color}`,
          borderBottom: `${bw} solid ${hasHighlight ? 'var(--color-primary)' : c.color}`,
          borderRight: `${bw} solid ${hasHighlight ? 'var(--color-primary)' : c.color}`,
          borderBottomLeftRadius: '6px',
          borderBottomRightRadius: '6px',
          width: '100%',
          height: `${bracketH}px`,
        }}
      />

      {/* 中文标签 — 加大加粗，自然流定位 */}
      <span
        className="font-black text-center leading-none select-none"
        style={{
          fontSize: lblSize,
          color: hasHighlight ? 'var(--color-primary)' : c.color,
          letterSpacing: '0.05em',
          marginTop: size === 'compact' ? '1px' : '-2px',
        }}
      >
        {c.label}
      </span>
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
