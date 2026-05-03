import type { HighlightSegment } from '../utils/highlightDiff';
import type { GrammarBlock } from '../types';
import { GrammarBrackets } from './GrammarBrackets';

interface HighlightedSentenceProps {
  segments: HighlightSegment[];
  grammarBlocks?: GrammarBlock[];
  compact?: boolean;
  inverted?: boolean;
}

export function HighlightedSentence({ segments, grammarBlocks, compact, inverted }: HighlightedSentenceProps) {
  const sentenceText = segments.map((s) => s.text).join('');
  return (
    <GrammarBrackets
      blocks={grammarBlocks ?? []}
      segments={segments}
      sentenceText={sentenceText}
      compact={compact}
      inverted={inverted}
    />
  );
}
