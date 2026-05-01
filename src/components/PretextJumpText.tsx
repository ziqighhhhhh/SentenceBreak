import { layoutWithLines, measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface PretextJumpTextProps {
  active: boolean;
  text: string;
}

const TEXTAREA_SCROLLBAR_GUTTER = 20;

interface TextareaMetrics {
  contentWidth: number;
  font: string;
  lineHeight: number;
  paddingLeft: number;
  paddingTop: number;
}

const emptyMetrics: TextareaMetrics = {
  contentWidth: 0,
  font: '',
  lineHeight: 0,
  paddingLeft: 0,
  paddingTop: 0,
};

function measureTextWidth(text: string, font: string): number {
  if (!text) return 0;

  return measureNaturalWidth(
    prepareWithSegments(text, font, {
      whiteSpace: 'pre-wrap',
    }),
  );
}

function getTextareaMetrics(container: HTMLDivElement): TextareaMetrics {
  const textarea = container.parentElement?.querySelector('textarea');
  if (!textarea) return emptyMetrics;

  const styles = window.getComputedStyle(textarea);
  const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
  const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
  const font = styles.font;
  const lineHeight =
    Number.parseFloat(styles.lineHeight) || Number.parseFloat(styles.fontSize) * 1.5 || 0;
  const contentWidth = Math.max(
    1,
    Math.floor(textarea.clientWidth - paddingLeft - paddingRight - TEXTAREA_SCROLLBAR_GUTTER),
  );

  return {
    contentWidth,
    font,
    lineHeight,
    paddingLeft,
    paddingTop,
  };
}

export function PretextJumpText({ active, text }: PretextJumpTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState<TextareaMetrics>(emptyMetrics);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateMetrics = () => {
      setMetrics(getTextareaMetrics(container));
    };

    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(container);
    const textarea = container.parentElement?.querySelector('textarea');
    if (textarea) observer.observe(textarea);

    return () => {
      observer.disconnect();
    };
  }, []);

  const jumpTarget = useMemo(() => {
    if (!active || !text || metrics.contentWidth <= 0 || !metrics.font || metrics.lineHeight <= 0) {
      return null;
    }

    const textCharacters = Array.from(text);
    const character = textCharacters[textCharacters.length - 1] ?? '';
    if (!character.trim()) return null;

    const prepared = prepareWithSegments(text, metrics.font, {
      whiteSpace: 'pre-wrap',
    });
    const { lines } = layoutWithLines(prepared, metrics.contentWidth, metrics.lineHeight);
    const lineIndex = Math.max(0, lines.length - 1);
    const line = lines[lineIndex];
    if (!line) return null;

    const lineCharacters = Array.from(line.text);
    const prefix = lineCharacters.slice(0, -1).join('');

    return {
      character,
      font: metrics.font,
      left: metrics.paddingLeft + measureTextWidth(prefix, metrics.font),
      lineHeight: metrics.lineHeight,
      top: metrics.paddingTop + lineIndex * metrics.lineHeight,
    };
  }, [active, text, metrics]);

  return (
    <div ref={containerRef} className="pretext-layout-layer" aria-hidden="true">
      {jumpTarget && (
        <span
          key={`${text.length}-${jumpTarget.character}`}
          className="pretext-current-letter"
          style={{
            font: jumpTarget.font,
            left: `${jumpTarget.left}px`,
            lineHeight: `${jumpTarget.lineHeight}px`,
            top: `${jumpTarget.top}px`,
          }}
        >
          <span className="pretext-current-letter__glyph">{jumpTarget.character}</span>
        </span>
      )}
    </div>
  );
}
