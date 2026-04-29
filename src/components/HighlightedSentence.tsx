import type { HighlightSegment } from '../utils/highlightDiff';

interface HighlightedSentenceProps {
  segments: HighlightSegment[];
}

export function HighlightedSentence({ segments }: HighlightedSentenceProps) {
  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={`${segment.text}-${index}`}
          className={segment.highlighted ? 'rounded-lg bg-primary/10 px-1 text-primary ring-1 ring-primary/10' : undefined}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}
