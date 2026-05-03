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
          className={segment.highlighted ? 'font-bold' : undefined}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}
