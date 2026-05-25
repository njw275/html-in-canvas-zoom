import { useEffect, useRef, useCallback } from 'react';
import type { Camera } from '../utils/math';
import type { ZoomLevel } from '../levels';
import { splitAtPortal } from '../levels';

interface Props {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
  nestScale: number;
  levels: ZoomLevel[];
}

// Each level's DOM container width in world-space
const LEVEL_WIDTH = 900;
// Per-level height — tighter to the text so vertical centering is accurate
function levelHeight(i: number): number {
  return i === 0 ? 150 : 100;
}

export function InfiniteCanvas({ cameraRef, subscribe, nestScale, levels }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs to each level's container div and portal span
  const levelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const portalRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Portal offsets: measured center of portal char relative to its container center
  const portalOffsets = useRef<{ x: number; y: number }[]>([]);

  // Measure portal positions after mount
  const measurePortals = useCallback(() => {
    portalOffsets.current = levels.map((_, i) => {
      const container = levelRefs.current[i];
      const portal = portalRefs.current[i];
      if (!container || !portal) return { x: 0, y: 0 };

      const cRect = container.getBoundingClientRect();
      const pRect = portal.getBoundingClientRect();
      return {
        x: (pRect.left + pRect.width / 2) - (cRect.left + cRect.width / 2),
        y: (pRect.top + pRect.height / 2) - (cRect.top + cRect.height / 2),
      };
    });
  }, [levels]);

  // Measure once after first paint
  useEffect(() => {
    // Wait a frame for layout
    const id = requestAnimationFrame(() => {
      measurePortals();
      // Trigger a redraw
      canvasRef.current?.dispatchEvent(new Event('paint'));
    });
    return () => cancelAnimationFrame(id);
  }, [measurePortals]);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let needsDraw = true;

    const unsub = subscribe(() => { needsDraw = true; });
    const onResize = () => { needsDraw = true; };
    const onPaint = () => { needsDraw = true; };

    window.addEventListener('resize', onResize);
    canvas.addEventListener('paint', onPaint);

    const loop = () => {
      if (needsDraw) {
        drawAll(canvas, ctx, cameraRef.current!, levels, levelRefs.current, portalOffsets.current, nestScale);
        needsDraw = false;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      unsub();
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('paint', onPaint);
    };
  }, [cameraRef, subscribe, nestScale, levels]);

  // Determine font size per level — first level is big (h1), rest are slightly smaller
  const fontSize = (i: number) => i === 0 ? 120 : 80;
  const fontWeight = (i: number) => i === 0 ? 800 : 600;

  return (
    <canvas
      ref={canvasRef}
      // @ts-expect-error — layoutsubtree is the html-in-canvas opt-in attribute
      layoutsubtree=""
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      {levels.map((level, i) => {
        const split = splitAtPortal(level);
        const lh = levelHeight(i);
        return (
          <div
            key={i}
            ref={(el) => { levelRefs.current[i] = el; }}
            style={{
              width: LEVEL_WIDTH,
              height: lh,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                margin: 0,
                fontSize: fontSize(i),
                fontWeight: fontWeight(i),
                letterSpacing: '-0.03em',
                color: '#ffffff',
                whiteSpace: 'nowrap',
              }}
            >
              {split ? (
                <>
                  {split.before}
                  <span
                    ref={(el) => { portalRefs.current[i] = el; }}
                    style={{ display: 'inline', color: '#ffffff' }}
                  >
                    {split.portal}
                  </span>
                  {split.after}
                </>
              ) : (
                level.text
              )}
            </span>
          </div>
        );
      })}
    </canvas>
  );
}

// ── Drawing ────────────────────────────────────────────────────────

function drawAll(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  levels: ZoomLevel[],
  levelEls: (HTMLDivElement | null)[],
  portalOffsets: { x: number; y: number }[],
  nestScale: number,
) {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Resize canvas buffer
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // ── Dot grid ──────────────────────────────────────────────────
  drawDotGrid(ctx, cam, w, h);

  const drawFn = (ctx as any).drawElementImage;
  if (!drawFn) return;

  // ── Per-level rendering with fresh CTM ──────────────────────
  // Instead of accumulating transforms on the canvas CTM (which uses
  // float32 internally and loses precision at deep zoom levels like
  // 1e6+), we compute each level's world-space center in double-
  // precision JS math, then set a fresh CTM per level.  This keeps
  // the float32 matrix values small and eliminates jitter/shaking.

  // Pre-compute world-space center for each level.
  // Level 0 is at origin.  Level i = sum of portal offsets scaled
  // to world space:  worldCenter[i] += portalOffset[i-1] * nestScale^(i-1)
  const worldCenters: { x: number; y: number }[] = [];
  let wcx = 0, wcy = 0;
  for (let i = 0; i < levels.length; i++) {
    worldCenters.push({ x: wcx, y: wcy });
    if (i < levels.length - 1) {
      const offset = portalOffsets[i] || { x: 0, y: 0 };
      const s = Math.pow(nestScale, i);
      wcx += offset.x * s;
      wcy += offset.y * s;
    }
  }

  for (let i = 0; i < levels.length; i++) {
    const el = levelEls[i];
    if (!el) continue;

    // Effective zoom for this level's content on screen
    const effectiveZoom = cam.zoom * Math.pow(nestScale, i);
    const screenWidth = LEVEL_WIDTH * effectiveZoom;

    // Skip if too small to see (< 2px) or too zoomed in (text > 50x viewport)
    if (screenWidth < 2 || screenWidth > w * 50) continue;

    // Screen-space center of this level (double-precision arithmetic)
    const sx = (worldCenters[i].x - cam.x) * cam.zoom + w / 2;
    const sy = (worldCenters[i].y - cam.y) * cam.zoom + h / 2;

    // Set a fresh CTM — keeps float32 matrix values viewport-sized
    ctx.setTransform(
      effectiveZoom * dpr, 0, 0, effectiveZoom * dpr,
      sx * dpr, sy * dpr,
    );

    // Draw this level centered on its screen position
    ctx.save();
    ctx.translate(-LEVEL_WIDTH / 2, -levelHeight(i) / 2);
    try {
      const transform = drawFn.call(ctx, el, 0, 0);
      if (transform) el.style.transform = transform.toString();
    } catch { /* first frame before paint */ }
    ctx.restore();
  }
}

// ── Dot grid ───────────────────────────────────────────────────────

function drawDotGrid(ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number) {
  const BASE = 50;

  const raw = BASE / cam.zoom;
  const logLevel = Math.log10(raw / BASE);
  const level = Math.floor(logLevel);
  const spacing = BASE * Math.pow(10, level);
  const screenSpacing = spacing * cam.zoom;

  const worldLeft = cam.x - w / (2 * cam.zoom);
  const worldTop = cam.y - h / (2 * cam.zoom);
  const worldRight = cam.x + w / (2 * cam.zoom);
  const worldBottom = cam.y + h / (2 * cam.zoom);

  const drawDots = (sp: number, screenSp: number) => {
    if (screenSp < 8) return;

    const alpha = screenSp < 20
      ? 0.6 * ((screenSp - 8) / 12)
      : screenSp < 100
        ? 0.6
        : 0.6 * Math.max(0, 1 - (screenSp - 100) / 200);

    if (alpha < 0.005) return;

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

    const startX = Math.floor(worldLeft / sp) * sp;
    const startY = Math.floor(worldTop / sp) * sp;

    let count = 0;
    const MAX = 15000;

    for (let wx = startX; wx <= worldRight && count < MAX; wx += sp) {
      for (let wy = startY; wy <= worldBottom && count < MAX; wy += sp) {
        const sx = (wx - cam.x) * cam.zoom + w / 2;
        const sy = (wy - cam.y) * cam.zoom + h / 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
        count++;
      }
    }
  };

  drawDots(spacing, screenSpacing);

  const fineSpacing = spacing / 5;
  const fineScreenSpacing = fineSpacing * cam.zoom;
  if (fineScreenSpacing > 12) {
    drawDots(fineSpacing, fineScreenSpacing);
  }
}
