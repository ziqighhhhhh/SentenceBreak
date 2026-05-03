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
  inverted?: boolean;
}

const WORD_SIZE: Record<string, string> = { normal: 'text-xl md:text-2xl', compact: 'text-sm' };
const GAP: Record<string, string> = { normal: 'gap-x-4 md:gap-x-5', compact: 'gap-x-2' };
const LABEL_GAP: Record<string, string> = { normal: 'gap-1', compact: 'gap-0.5' };
const DESCENDER_PB: Record<string, string> = { normal: 'pb-1', compact: 'pb-0.5' };
const BRACKET_GAP: Record<string, string> = { normal: 'gap-0.5', compact: 'gap-px' };

export function GrammarBrackets({ blocks, segments, compact, inverted }: GrammarBracketsProps) {
  const size = compact ? 'compact' : 'normal';
  const isNewSet = computeNewSet(segments);

  return (
    <div className={`flex flex-wrap ${GAP[size]} justify-center w-full min-w-0`}>
      {blocks.map((block, i) => (
        <GrammarBlockItem
          key={i}
          block={block}
          hasHighlight={blockHasHighlight(block, isNewSet)}
          size={size}
          inverted={inverted}
        />
      ))}
    </div>
  );
}

interface GrammarBlockItemProps {
  block: GrammarBlock;
  hasHighlight: boolean;
  size: 'normal' | 'compact';
  inverted?: boolean;
}

function isPunctuationOnly(text: string): boolean {
  return !/[a-zA-Z0-9\u4e00-\u9fff\u3000-\u9fff]/.test(text.trim());
}

function GrammarBlockItem({ block, hasHighlight, size, inverted }: GrammarBlockItemProps) {
  const textColor = inverted ? 'text-white' : hasHighlight ? 'text-primary' : 'text-zinc-900';
  const bracketColor = inverted ? 'rgba(255,255,255,0.7)' : undefined;
  const labelColor = inverted ? 'rgba(255,255,255,0.9)' : undefined;

  if (isPunctuationOnly(block.text)) {
    return (
      <span className={`font-bold whitespace-nowrap px-1 ${WORD_SIZE[size]} leading-none ${inverted ? 'text-white' : 'text-zinc-900'}`}>
        {block.text}
      </span>
    );
  }
  const c = ROLE_META[block.role] ?? ROLE_META.other;
  const bw = size === 'compact' ? '1.5px' : '2.5px';
  const bracketH = size === 'compact' ? 14 : 18;
  const lblSize = size === 'compact' ? '13px' : '16px';

  const bc = bracketColor ?? (hasHighlight ? 'var(--color-primary)' : c.color);
  const lc = labelColor ?? (hasHighlight ? 'var(--color-primary)' : c.color);

  return (
    <span className="inline-flex flex-col items-center min-w-0">
      <span className={`font-bold whitespace-nowrap px-1 ${WORD_SIZE[size]} ${DESCENDER_PB[size]} leading-none ${textColor}`}>
        {block.text}
      </span>

      <span className={`flex flex-col items-center w-full ${LABEL_GAP[size]}`}>
        <span
          className="font-black leading-none select-none"
          style={{
            fontSize: lblSize,
            color: lc,
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}
        >
          {c.label}
        </span>

        <span
          className={`inline-block w-full ${BRACKET_GAP[size]}`}
          style={{
            borderLeft: `${bw} solid ${bc}`,
            borderTop: `${bw} solid ${bc}`,
            borderRight: `${bw} solid ${bc}`,
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
