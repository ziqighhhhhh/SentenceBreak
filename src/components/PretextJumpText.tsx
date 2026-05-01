import { layoutWithLines, measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

interface PretextJumpTextProps {
  revealText: string;
}

const TEXTAREA_SCROLLBAR_GUTTER = 20;

interface TextareaMetrics {
  contentWidth: number;
  font: string;
  height: number;
  lineHeight: number;
  paddingLeft: number;
  paddingTop: number;
  width: number;
}

interface RevealLine {
  text: string;
  top: number;
  width: number;
}

const emptyMetrics: TextareaMetrics = {
  contentWidth: 0,
  font: '',
  height: 0,
  lineHeight: 0,
  paddingLeft: 0,
  paddingTop: 0,
  width: 0,
};

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

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
  const width = Math.max(1, textarea.clientWidth);
  const height = Math.max(1, textarea.clientHeight);
  const contentWidth = Math.max(
    1,
    Math.floor(width - paddingLeft - paddingRight - TEXTAREA_SCROLLBAR_GUTTER),
  );

  return {
    contentWidth,
    font,
    height,
    lineHeight,
    paddingLeft,
    paddingTop,
    width,
  };
}

export function PretextJumpText({ revealText }: PretextJumpTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
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

  const revealLines = useMemo<RevealLine[]>(() => {
    if (!revealText || metrics.contentWidth <= 0 || !metrics.font || metrics.lineHeight <= 0) {
      return [];
    }

    const prepared = prepareWithSegments(revealText, metrics.font, {
      whiteSpace: 'pre-wrap',
    });
    const { lines } = layoutWithLines(prepared, metrics.contentWidth, metrics.lineHeight);

    return lines.map((line, index) => ({
      text: line.text,
      top: metrics.paddingTop + index * metrics.lineHeight,
      width: measureTextWidth(line.text, metrics.font),
    }));
  }, [metrics, revealText]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context || !revealText || revealLines.length === 0 || metrics.width <= 0 || metrics.height <= 0) {
      return undefined;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(metrics.width * pixelRatio);
    canvas.height = Math.floor(metrics.height * pixelRatio);
    canvas.style.width = `${metrics.width}px`;
    canvas.style.height = `${metrics.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.font = metrics.font;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillStyle = '#1d1d1f';

    const startedAt = performance.now();
    const lineDelay = 170;
    const lineDuration = 1000;
    const totalDuration = lineDelay * Math.max(0, revealLines.length - 1) + lineDuration;

    const render = (now: number) => {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, metrics.width, metrics.height);

      revealLines.forEach((line, index) => {
        const lineProgress = Math.min(1, Math.max(0, (elapsed - index * lineDelay) / lineDuration));
        if (lineProgress <= 0) return;

        const eased = easeOutCubic(lineProgress);
        const visibleWidth = Math.ceil(line.width * eased);
        const yOffset = (1 - eased) * 8;

        context.save();
        context.globalAlpha = Math.min(1, lineProgress * 1.8);
        context.beginPath();
        context.rect(metrics.paddingLeft, line.top - 2, visibleWidth, metrics.lineHeight + 4);
        context.clip();
        context.fillText(line.text, metrics.paddingLeft, line.top + yOffset);
        context.restore();
      });

      if (elapsed < totalDuration) {
        frameRef.current = window.requestAnimationFrame(render);
        return;
      }

      frameRef.current = null;
    };

    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      context.clearRect(0, 0, metrics.width, metrics.height);
    };
  }, [metrics, revealLines, revealText]);

  return (
    <div ref={containerRef} className="pretext-canvas-reveal-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="pretext-canvas-reveal" />
    </div>
  );
}
