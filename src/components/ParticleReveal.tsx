import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';

type ParticleTone = 'blue' | 'light' | 'dark';
type TargetShape = 'text' | 'card' | 'text-card';

interface ParticleRevealProps {
  children: ReactNode;
  className?: string;
  flowDirection?: -1 | 0 | 1;
  particleCount?: number;
  revisionKey?: string | number;
  shape?: TargetShape;
  targetText?: string;
  tone?: ParticleTone;
}

interface TargetPoint {
  x: number;
  y: number;
  z: number;
  size: number;
}

interface Particle extends TargetPoint {
  chaosX: number;
  chaosY: number;
  chaosZ: number;
  hueShift: number;
}

interface Bounds {
  width: number;
  height: number;
}

interface TargetRect extends Bounds {
  left: number;
  top: number;
}

const toneColors: Record<ParticleTone, [string, string, string]> = {
  blue: ['#004e9f', '#0071e3', '#d7e3ff'],
  light: ['#ffffff', '#d7e3ff', '#0071e3'],
  dark: ['#1d1d1f', '#004e9f', '#0071e3'],
};

const reducedMotionVisibleStyle = { opacity: 1 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function createSeededRandom(seedText: string): () => number {
  let seed = 2166136261;

  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createCardSurfacePoints(bounds: Bounds, count: number, random: () => number): TargetPoint[] {
  const inset = 12;
  const width = Math.max(80, bounds.width - inset * 2);
  const height = Math.max(80, bounds.height - inset * 2);
  const left = inset;
  const top = inset;
  const points: TargetPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const edgeBias = random();
    const side = Math.floor(random() * 4);
    const depth = Math.pow(random(), 2) * 36;
    const z = (random() - 0.5) * 110;

    if (edgeBias < 0.54) {
      if (side === 0) points.push({ x: left + random() * width, y: top + depth, z, size: 1.45 });
      if (side === 1) points.push({ x: left + width - depth, y: top + random() * height, z, size: 1.45 });
      if (side === 2) points.push({ x: left + random() * width, y: top + height - depth, z, size: 1.45 });
      if (side === 3) points.push({ x: left + depth, y: top + random() * height, z, size: 1.45 });
      continue;
    }

    points.push({
      x: left + random() * width,
      y: top + random() * height,
      z,
      size: random() > 0.82 ? 1.8 : 1.1,
    });
  }

  return points;
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);

  return lines.slice(0, 8);
}

function createTextPoints(bounds: Bounds, text: string, count: number, random: () => number): TargetPoint[] {
  if (!text.trim()) return [];

  const scale = 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(bounds.width * scale));
  canvas.height = Math.max(1, Math.floor(bounds.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) return [];

  const fontSize = clamp(bounds.width / 16, 18, 48) * scale;
  const lineHeight = fontSize * 1.2;
  const maxTextWidth = canvas.width * 0.84;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000';
  context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const lines = wrapCanvasText(context, text, maxTextWidth);
  const blockHeight = lines.length * lineHeight;
  const firstLineY = canvas.height / 2 - blockHeight / 2 + lineHeight / 2;

  lines.forEach((line, index) => {
    context.fillText(line, canvas.width / 2, firstLineY + index * lineHeight, maxTextWidth);
  });

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates: TargetPoint[] = [];
  const stride = Math.max(2, Math.floor(Math.sqrt((canvas.width * canvas.height) / Math.max(count * 3, 1))));

  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      const alpha = imageData[(y * canvas.width + x) * 4 + 3];
      if (alpha > 40) {
        candidates.push({
          x: x / scale,
          y: y / scale,
          z: (random() - 0.5) * 80,
          size: alpha > 180 ? 1.55 : 1.1,
        });
      }
    }
  }

  if (candidates.length <= count) return candidates;

  return Array.from({ length: count }, () => candidates[Math.floor(random() * candidates.length)]);
}

function offsetTargetPoints(points: TargetPoint[], targetRect: TargetRect): TargetPoint[] {
  return points.map((point) => ({
    ...point,
    x: point.x + targetRect.left,
    y: point.y + targetRect.top,
  }));
}

function createParticles({
  viewportBounds,
  targetRect,
  particleCount,
  revisionKey,
  shape,
  targetText,
  flowDirection,
}: {
  flowDirection: -1 | 0 | 1;
  particleCount: number;
  revisionKey: string;
  shape: TargetShape;
  targetText: string;
  targetRect: TargetRect;
  viewportBounds: Bounds;
}): Particle[] {
  const random = createSeededRandom(
    `${revisionKey}:${viewportBounds.width}:${viewportBounds.height}:${targetRect.left}:${targetRect.top}:${targetText}`,
  );
  const maxParticles = clamp(Math.floor((targetRect.width * targetRect.height) / 42), 1800, particleCount);
  const textRatio = shape === 'text' ? 1 : shape === 'text-card' ? 0.58 : 0;
  const textCount = Math.floor(maxParticles * textRatio);
  const cardCount = maxParticles - textCount;
  const targetBounds = {
    width: targetRect.width,
    height: targetRect.height,
  };
  const targets = [
    ...(shape !== 'text' ? createCardSurfacePoints(targetBounds, cardCount, random) : []),
    ...(shape !== 'card' ? createTextPoints(targetBounds, targetText, textCount || maxParticles, random) : []),
  ];
  const viewportTargets = offsetTargetPoints(
    targets.length > maxParticles
      ? Array.from({ length: maxParticles }, () => targets[Math.floor(random() * targets.length)])
      : targets,
    targetRect,
  );
  const spread = Math.max(viewportBounds.width, viewportBounds.height);
  const directionalOriginX = flowDirection === 0
    ? viewportBounds.width / 2
    : viewportBounds.width / 2 + flowDirection * viewportBounds.width * 0.92;
  const directionalSweep = flowDirection === 0 ? spread * 2.6 : spread * 1.25;
  const verticalSweep = flowDirection === 0 ? spread * 1.8 : spread * 1.45;

  return viewportTargets.map((target, index) => ({
    ...target,
    chaosX: directionalOriginX + (random() - 0.5) * directionalSweep,
    chaosY: viewportBounds.height / 2 + (random() - 0.5) * verticalSweep,
    chaosZ: 260 + random() * 720,
    hueShift: index % 3,
  }));
}

export function ParticleReveal({
  children,
  className = '',
  flowDirection = 0,
  particleCount = 11000,
  revisionKey = 'initial',
  shape = 'text-card',
  targetText = '',
  tone = 'blue',
}: ParticleRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const completedAnimationRef = useRef('');
  const [viewportBounds, setViewportBounds] = useState<Bounds>({ width: 0, height: 0 });
  const [targetRect, setTargetRect] = useState<TargetRect>({ left: 0, top: 0, width: 0, height: 0 });
  const [contentVisible, setContentVisible] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const normalizedRevisionKey = String(revisionKey);
  const animationIdentity = `${normalizedRevisionKey}:${flowDirection}:${shape}:${targetText}`;
  const colors = toneColors[tone];

  useLayoutEffect(() => {
    setPortalHost(document.body);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateStageMetrics = () => {
      const rect = container.getBoundingClientRect();
      setViewportBounds({
        width: Math.max(1, Math.round(window.innerWidth)),
        height: Math.max(1, Math.round(window.innerHeight)),
      });
      setTargetRect({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      });
    };

    updateStageMetrics();
    window.addEventListener('resize', updateStageMetrics);
    window.addEventListener('scroll', updateStageMetrics, { passive: true });
    const observer = new ResizeObserver(updateStageMetrics);
    observer.observe(container);

    return () => {
      window.removeEventListener('resize', updateStageMetrics);
      window.removeEventListener('scroll', updateStageMetrics);
      observer.disconnect();
    };
  }, []);

  const particles = useMemo(() => {
    if (
      viewportBounds.width <= 1
      || viewportBounds.height <= 1
      || targetRect.width <= 1
      || targetRect.height <= 1
      || prefersReducedMotion
    ) {
      return [];
    }

    return createParticles({
      flowDirection,
      particleCount,
      revisionKey: normalizedRevisionKey,
      shape,
      targetRect,
      targetText,
      viewportBounds,
    });
  }, [flowDirection, normalizedRevisionKey, particleCount, prefersReducedMotion, shape, targetRect, targetText, viewportBounds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context || particles.length === 0 || prefersReducedMotion) {
      setContentVisible(true);
      return undefined;
    }

    if (completedAnimationRef.current === animationIdentity) {
      setContentVisible(true);
      context.clearRect(0, 0, viewportBounds.width, viewportBounds.height);
      return undefined;
    }

    setContentVisible(false);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewportBounds.width * pixelRatio);
    canvas.height = Math.floor(viewportBounds.height * pixelRatio);
    canvas.style.width = `${viewportBounds.width}px`;
    canvas.style.height = `${viewportBounds.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const startedAt = performance.now();
    const duration = 1280;
    const perspective = 760;

    const render = (now: number) => {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = easeOutCubic(progress);
      context.clearRect(0, 0, viewportBounds.width, viewportBounds.height);

      particles.forEach((particle) => {
        const x3d = particle.chaosX + (particle.x - particle.chaosX) * eased;
        const y3d = particle.chaosY + (particle.y - particle.chaosY) * eased;
        const z3d = particle.chaosZ + (particle.z - particle.chaosZ) * eased;
        const scale = perspective / (perspective + z3d);
        const x = viewportBounds.width / 2 + (x3d - viewportBounds.width / 2) * scale;
        const y = viewportBounds.height / 2 + (y3d - viewportBounds.height / 2) * scale;
        const alpha = progress < 0.16 ? progress / 0.16 : 1 - Math.max(0, progress - 0.88) / 0.12;

        context.globalAlpha = clamp(alpha, 0, 0.92);
        context.fillStyle = colors[particle.hueShift];
        context.beginPath();
        context.arc(x, y, particle.size * scale * 1.25, 0, Math.PI * 2);
        context.fill();
      });

      if (progress >= 0.72) {
        setContentVisible(true);
      }

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(render);
        return;
      }

      context.clearRect(0, 0, viewportBounds.width, viewportBounds.height);
      completedAnimationRef.current = animationIdentity;
      frameRef.current = null;
    };

    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [animationIdentity, colors, particles, prefersReducedMotion, viewportBounds]);

  return (
    <div ref={containerRef} className={`particle-morph ${className}`}>
      {!prefersReducedMotion && portalHost
        ? createPortal(
          <canvas ref={canvasRef} className="particle-morph__canvas" aria-hidden="true" />,
          portalHost,
        )
        : null}
      <div className="particle-morph__content" style={contentVisible || prefersReducedMotion ? reducedMotionVisibleStyle : undefined}>
        {children}
      </div>
    </div>
  );
}
