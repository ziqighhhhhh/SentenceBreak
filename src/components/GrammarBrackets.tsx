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

  /* min-w-0 is critical: allows the flex container to shrink in narrow parents (e.g. SummaryView cards) */
  return (
    <div className={`flex flex-wrap ${GAP[size]} justify-center w-full min-w-0`}>
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
 *      主
 *   ┌────────┐
 *   │(text)  │
 *   └────────┘
 *
 * Uses min-w-0 (not shrink-0) to enable proper flex-wrap in narrow cards.
 * Compact mode removes excess vertical spacing for SummaryView cards.
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
  const isC = size === 'compact';

  return (
    /* inline-flex + min-w-0: enables flex-wrap in narrow parents; shrink-0 would break wrapping */
    <span className={`inline-flex flex-col items-center min-w-0 gap-0 ${isC ? '' : 'min-h-[44px]'}`}>
      {/* 单词文本 */}
      <span className={`font-bold whitespace-nowrap px-1 ${WORD_SIZE[size]} leading-none ${hasHighlight ? 'text-primary' : 'text-zinc-900'}`}>
        {block.text}
      </span>

      {/* 中文标签 — 紧贴文本下方 */}
      <span
        className="font-black text-center leading-none select-none"
        style={{
          fontSize: lblSize,
          color: hasHighlight ? 'var(--color-primary)' : c.color,
          letterSpacing: '0.05em',
          lineHeight: 1,
          marginTop: isC ? '0px' : '2px',
        }}
      >
        {c.label}
      </span>

      {/* bracket 区域 — normal 模式用 mt-1 拉开间距，compact 模式紧贴 */}
      <span className={`relative flex flex-col items-center w-full ${isC ? '' : 'mt-1'}`}>
        {/* 隐形撑宽文字 — 确保括号宽度与文字匹配 */}
        <span className={`invisible whitespace-nowrap ${WORD_SIZE[size]} font-bold px-1 select-none leading-none`} aria-hidden="true">
          {block.text}
        </span>

        {/* L 型括号 — 贴底 */}
        <span
          className="relative inline-block w-full mt-auto"
          style={{
            borderBottom: 'none',
            borderLeft: `${bw} solid ${hasHighlight ? 'var(--color-primary)' : c.color}`,
            borderTop: `${bw} solid ${hasHighlight ? 'var(--color-primary)' : c.color}`,
            borderRight: `${bw} solid ${hasHighlight ? 'var(--color-primary)' : c.color}`,
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            height: `${bracketH}px`,
          }}
        />
      </span>
    </span>
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
